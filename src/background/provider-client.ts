import { shortcutInstruction, systemPrompt, userPrompt } from '../shared/prompt';
import { buildKeyTestBody, buildStreamingBody } from '../shared/provider-protocol';
import { PROVIDERS, type ProviderConfig } from '../shared/providers';
import { parseSseEvent } from '../shared/stream';
import type { Settings } from '../shared/domain';
import type { ChatRequest, KeyTestRequest, KeyTestResponse } from '../shared/messages';
import { ProviderRequestError } from './diagnostics';

export const RESPONSE_TIMEOUT_MS = 15_000;
export const FIRST_TOKEN_TIMEOUT_MS = 2_500;

export class StreamStartTimeoutError extends Error {
  readonly kind = 'timeout' as const;

  constructor(readonly details: string) {
    super('流式首事件超时。');
    this.name = 'StreamStartTimeoutError';
  }
}

export async function testProviderKey(provider: KeyTestRequest['provider'], apiKey: string, model: string): Promise<KeyTestResponse> {
  const config = PROVIDERS[provider];
  const key = apiKey.trim();
  if (!key) return { ok: false, error: '请先填写 API Key。' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RESPONSE_TIMEOUT_MS);
  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: buildKeyTestBody(model.trim() || config.defaultModel),
    });
    if (!response.ok) {
      const detail = (await response.text()).replaceAll(key, '[REDACTED]');
      return { ok: false, error: `${config.label} API Key 测试失败（${response.status}）。${detail ? ` ${detail.slice(0, 180)}` : ''}` };
    }
    return { ok: true };
  } catch (error) {
    if ((error as Error).name === 'AbortError') return { ok: false, error: 'API Key 测试超时，请检查网络或稍后重试。' };
    return { ok: false, error: `${config.label} API Key 测试失败，请检查网络连接。` };
  } finally {
    clearTimeout(timeout);
  }
}

export async function streamAttempt(request: ChatRequest, settings: Settings, config: ProviderConfig, controller: AbortController, onDelta: (text: string) => Promise<void>) {
  const startedAt = performance.now();
  let timedOut = false;
  let firstStreamEventReceived = false;
  let timeoutPhase: 'response' | 'first-token' = 'response';
  let responseDetails = '';
  let timeout = setTimeout(() => { timedOut = true; controller.abort(); }, RESPONSE_TIMEOUT_MS);
  const stopTimeout = () => clearTimeout(timeout);

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey.trim()}` },
      body: buildStreamingBody(settings.model.trim() || config.defaultModel, [
        { role: 'system', content: `${systemPrompt}\n\n${userPrompt(request.problem, '请使用以下题目上下文回答后续对话。')}` },
        ...request.messages.map((message) => ({ role: message.role, content: message.role === 'user' ? shortcutInstruction(message.content) : message.content })),
      ]),
    });
    if (!response.ok) {
      stopTimeout();
      const detail = await response.text();
      throw new ProviderRequestError(`${config.label} 请求失败（${response.status}）。`, {
        kind: 'http',
        details: detail || '服务未提供错误详情。',
        status: response.status,
        statusText: response.statusText,
      });
    }
    if (!response.body) throw new ProviderRequestError(`${config.label} 没有返回可读取的内容。`, { kind: 'stream', details: '响应没有可读取的 body。' });

    stopTimeout();
    responseDetails = createResponseDetails(response, startedAt);
    timeoutPhase = 'first-token';
    timeout = setTimeout(() => { timedOut = true; controller.abort(); }, FIRST_TOKEN_TIMEOUT_MS);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const consume = async (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const dataLine = line.trim();
        if (!dataLine.startsWith('data:')) continue;
        const event = parseSseEvent(dataLine.slice(5).trim());
        if (event.kind === 'error') throw new ProviderRequestError(`${config.label} 返回了错误响应。`, { kind: 'stream', details: event.details });
        if (event.kind === 'delta') {
          firstStreamEventReceived = true;
          stopTimeout();
          if (event.content.length > 0) await onDelta(event.content);
        }
      }
    };
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      await consume(decoder.decode(next.value, { stream: true }));
    }
    await consume(decoder.decode());
    if (buffer.trim().startsWith('data:')) await consume('\n');
    if (!firstStreamEventReceived) throw new ProviderRequestError(`${config.label} 流式响应在没有输出事件时结束。`, { kind: 'stream', details: responseDetails || 'HTTP 响应已建立，但没有读取到 choices.delta。' });
  } catch (error) {
    if (timedOut && timeoutPhase === 'response') {
      throw new ProviderRequestError(`${config.label} 在 ${RESPONSE_TIMEOUT_MS / 1000} 秒内没有返回响应。`, { kind: 'timeout', details: `等待 HTTP 响应头超过 ${RESPONSE_TIMEOUT_MS}ms。` });
    }
    if (timedOut) throw new StreamStartTimeoutError(`${responseDetails ? `${responseDetails}\n` : ''}等待首个 SSE 事件超过 ${FIRST_TOKEN_TIMEOUT_MS}ms。`);
    throw error;
  } finally {
    stopTimeout();
  }
}

function createResponseDetails(response: Response, startedAt: number) {
  const headerValues = ['content-type', 'x-dashscope-request-id', 'x-request-id', 'trace-id', 'x-trace-id']
    .map((name) => [name, response.headers.get(name)] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1]));
  return [
    `HTTP ${response.status} ${response.statusText}`.trim(),
    `响应头耗时 ${Math.round(performance.now() - startedAt)}ms`,
    ...headerValues.map(([name, value]) => `${name}: ${value}`),
  ].join('\n');
}
