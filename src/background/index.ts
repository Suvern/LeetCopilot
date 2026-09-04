import { appendErrorLog, getSettings } from '../shared/storage';
import { shortcutInstruction, systemPrompt, userPrompt } from '../shared/prompt';
import { PROVIDERS } from '../shared/providers';
import type { BackgroundRequest, BackgroundEvent, ErrorKind } from '../shared/types';

const controllers = new Map<string, AbortController>();
const cancelledRequests = new Set<string>();
const RESPONSE_TIMEOUT_MS = 15_000;
const FIRST_TOKEN_TIMEOUT_MS = 2_500;
const MAX_FIRST_TOKEN_ATTEMPTS = 2;

chrome.runtime.onMessage.addListener((request: BackgroundRequest, sender, sendResponse) => {
  if (request.type === 'cancel') { cancelledRequests.add(request.requestId); controllers.get(request.requestId)?.abort(); controllers.delete(request.requestId); return; }
  if (request.type === 'read-editor') {
    void readEditorCode(sender.tab?.id)
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : '无法读取代码编辑器。' }));
    return true;
  }
  if (request.type === 'apply-code') {
    void applyCode(request.code, request.startLine, request.endLine, sender.tab?.id)
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : '无法更新代码编辑器。' }));
    return true;
  }
  if (request.type === 'test-key') {
    void (async () => {
      try { sendResponse(await testProviderKey(request.provider, request.apiKey, request.model)); }
      catch (error) { sendResponse({ ok: false, error: error instanceof Error ? error.message : 'API Key 测试失败。' }); }
    })();
    return true;
  }
  void streamChat(request, sender.tab?.id)
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : '请求失败。' }));
  return true;
});

async function testProviderKey(provider: Extract<BackgroundRequest, { type: 'test-key' }>['provider'], apiKey: string, model: string) {
  const config = PROVIDERS[provider];
  const key = apiKey.trim();
  if (!key) return { ok: false, error: '请先填写 API Key。' };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: model.trim() || config.defaultModel, stream: false, max_tokens: 1, messages: [{ role: 'user', content: 'Reply with OK.' }] }),
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

async function readEditorCode(tabId: number | undefined) {
  if (tabId === undefined) return { ok: false, error: '找不到当前页面。' };
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        const page = globalThis as typeof globalThis & { lcMonaco?: any; monaco?: any };
        const editors = (page.lcMonaco ?? page.monaco)?.editor?.getEditors?.() ?? [];
        const editor = editors.find((item: any) => item.getModel?.()?.getValue?.().trim()) ?? editors[0];
        const code = editor?.getModel?.()?.getValue?.();
        return typeof code === 'string' ? { ok: true, code } : { ok: false, error: '找不到 Monaco 代码编辑器。' };
      },
    });
    return results[0]?.result ?? { ok: false, error: '无法读取代码编辑器。' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : '无法读取代码编辑器。' };
  }
}

async function applyCode(code: string, startLine: number | undefined, endLine: number | undefined, tabId: number | undefined) {
  if (tabId === undefined) return { ok: false, error: '找不到当前页面。' };
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: (nextCode: string, firstLine?: number, lastLine?: number) => {
      const page = globalThis as typeof globalThis & { lcMonaco?: any; monaco?: any };
      const api = page.lcMonaco ?? page.monaco;
      const editors = api?.editor?.getEditors?.() ?? [];
      const editor = editors.find((item: any) => item.getModel?.()?.getValue?.().trim()) ?? editors[0];
      const model = editor?.getModel?.();
      if (!api || !editor || !model) return { ok: false, error: '找不到 Monaco 代码编辑器。' };
      const first = firstLine ?? 1;
      const last = lastLine ?? model.getLineCount();
      if (!Number.isInteger(first) || !Number.isInteger(last) || first < 1 || last < first || last > model.getLineCount()) return { ok: false, error: 'AI 返回的代码行号超出编辑器范围。' };
      const endColumn = model.getLineMaxColumn(last);
      editor.executeEdits('leetcopilot', [{ range: new api.Range(first, 1, last, endColumn), text: nextCode }]);
      editor.pushUndoStop?.();
      editor.focus?.();
      return { ok: true };
      },
      args: startLine === undefined || endLine === undefined ? [code] : [code, startLine, endLine],
    });
    return results[0]?.result ?? { ok: false, error: '无法更新代码编辑器。' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : '无法注入编辑器更新。' };
  }
}

async function send(event: BackgroundEvent, tabId?: number) {
  if (tabId !== undefined) await chrome.tabs.sendMessage(tabId, event).catch(() => undefined);
}

type ErrorDiagnostic = {
  message: string;
  kind: ErrorKind;
  details?: string;
  status?: number;
  statusText?: string;
  attempts?: number;
  timeoutMs?: number;
  model?: string;
  endpoint?: string;
};

function redactSecrets(value: string, apiKey: string) {
  const trimmedKey = apiKey.trim();
  return trimmedKey ? value.replaceAll(trimmedKey, '[已隐藏 API Key]') : value;
}

async function reportError(settings: Awaited<ReturnType<typeof getSettings>>, requestId: string, tabId: number | undefined, diagnostic: ErrorDiagnostic) {
  const redact = (value: string | undefined) => value ? redactSecrets(value, settings.apiKey) : value;
  const safeMessage = redact(diagnostic.message) ?? '请求失败，请重试。';
  const log = await appendErrorLog({
    provider: settings.provider,
    message: safeMessage,
    kind: diagnostic.kind,
    details: redact(diagnostic.details),
    endpoint: diagnostic.endpoint,
    model: diagnostic.model,
    status: diagnostic.status,
    statusText: diagnostic.statusText,
    attempts: diagnostic.attempts,
    timeoutMs: diagnostic.timeoutMs,
    requestId,
  }).catch(() => undefined);
  await send({ type: 'error', requestId, message: safeMessage, errorLogId: log?.id }, tabId);
}

class StreamStartTimeoutError extends Error {
  readonly kind = 'timeout' as const;
  constructor(readonly details: string) { super('流式首事件超时。'); this.name = 'StreamStartTimeoutError'; }
}

class ProviderRequestError extends Error {
  readonly diagnostic: Omit<ErrorDiagnostic, 'message'>;
  constructor(message: string, diagnostic: Omit<ErrorDiagnostic, 'message'>) {
    super(message);
    this.name = 'ProviderRequestError';
    this.diagnostic = diagnostic;
  }
}

async function streamAttempt(request: Extract<BackgroundRequest, { type: 'chat' }>, tabId: number | undefined, settings: Awaited<ReturnType<typeof getSettings>>, config: (typeof PROVIDERS)[keyof typeof PROVIDERS]) {
  const controller = new AbortController();
  controllers.set(request.requestId, controller);
  const startedAt = performance.now();
  let timedOut = false;
  let firstStreamEventReceived = false;
  let timeoutPhase: 'response' | 'first-token' = 'response';
  let responseDetails = '';
  let timeout = setTimeout(() => { timedOut = true; controller.abort(); }, RESPONSE_TIMEOUT_MS);
  const stopTimeout = () => { clearTimeout(timeout); };
  try {
    const response = await fetch(config.endpoint, { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey.trim()}` }, body: JSON.stringify({ model: settings.model.trim() || config.defaultModel, stream: true, messages: [{ role: 'system', content: `${systemPrompt}\n\n${userPrompt(request.problem, '请使用以下题目上下文回答后续对话。')}` }, ...request.messages.map((message) => ({ role: message.role, content: message.role === 'user' ? shortcutInstruction(message.content) : message.content }))] }) });
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
    const headerValues = ['content-type', 'x-dashscope-request-id', 'x-request-id', 'trace-id', 'x-trace-id']
      .map((name) => [name, response.headers.get(name)] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[1]));
    responseDetails = [`HTTP ${response.status} ${response.statusText}`.trim(), `响应头耗时 ${Math.round(performance.now() - startedAt)}ms`, ...headerValues.map(([name, value]) => `${name}: ${value}`)].join('\n');
    timeoutPhase = 'first-token';
    timeout = setTimeout(() => { timedOut = true; controller.abort(); }, FIRST_TOKEN_TIMEOUT_MS);
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
    const consume = async (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/); buffer = lines.pop() ?? '';
      for (const line of lines) {
        const dataLine = line.trim(); if (!dataLine.startsWith('data:')) continue;
        const data = dataLine.slice(5).trim(); if (data === '[DONE]') continue;
        try {
          const payload = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string; reasoning_content?: string } }>; error?: unknown };
          if (payload.error) throw new ProviderRequestError(`${config.label} 返回了错误响应。`, { kind: 'stream', details: JSON.stringify(payload.error, null, 2) });
          const delta = payload.choices?.[0]?.delta;
          const text = delta?.content;
          if (delta && Object.keys(delta).length > 0) {
            firstStreamEventReceived = true;
            // Providers may begin an SSE response with role metadata or reasoning_content.
            // Either proves the stream has started; only visible content reaches the panel.
            stopTimeout();
            if (typeof text === 'string' && text.length > 0) await send({ type: 'delta', requestId: request.requestId, text }, tabId);
          }
        } catch (error) {
          if (error instanceof ProviderRequestError) throw error;
          /* Ignore malformed provider lines; providers occasionally emit comments in an SSE stream. */
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
    return true;
  } catch (error) {
    if (timedOut && timeoutPhase === 'response') {
      throw new ProviderRequestError(`${config.label} 在 ${RESPONSE_TIMEOUT_MS / 1000} 秒内没有返回响应。`, {
        kind: 'timeout',
        details: `等待 HTTP 响应头超过 ${RESPONSE_TIMEOUT_MS}ms。`,
      });
    }
    if (timedOut) throw new StreamStartTimeoutError(`${responseDetails ? `${responseDetails}\n` : ''}等待首个 SSE 事件超过 ${FIRST_TOKEN_TIMEOUT_MS}ms。`);
    throw error;
  } finally {
    stopTimeout();
    if (controllers.get(request.requestId) === controller) controllers.delete(request.requestId);
  }
}

async function streamChat(request: Extract<BackgroundRequest, { type: 'chat' }>, tabId?: number) {
  const settings = await getSettings();
  const config = PROVIDERS[settings.provider];
  const model = settings.model.trim() || config.defaultModel;
  if (!settings.apiKey.trim()) return reportError(settings, request.requestId, tabId, { message: `请先在 LeetCopilot 设置中填写${config.label} API Key。`, kind: 'configuration', details: '请求未发送：当前 provider 没有可用的 API Key。', model, endpoint: config.endpoint, attempts: 0 });
  cancelledRequests.delete(request.requestId);
  try {
    const retryDetails: string[] = [];
    for (let attempt = 1; attempt <= MAX_FIRST_TOKEN_ATTEMPTS; attempt += 1) {
      if (cancelledRequests.has(request.requestId)) return;
      try {
        await streamAttempt(request, tabId, settings, config);
        await send({ type: 'done', requestId: request.requestId }, tabId);
        return;
      } catch (error) {
        if ((error as Error).name === 'AbortError' && !controllers.has(request.requestId)) return;
        if (error instanceof StreamStartTimeoutError) {
          retryDetails.push(`尝试 ${attempt}/${MAX_FIRST_TOKEN_ATTEMPTS}\n${error.details}`);
          if (attempt === MAX_FIRST_TOKEN_ATTEMPTS) {
            throw new ProviderRequestError(`${config.label} 未能在 ${FIRST_TOKEN_TIMEOUT_MS / 1000} 秒内开始流式响应，已重试 ${MAX_FIRST_TOKEN_ATTEMPTS - 1} 次。`, {
              kind: 'timeout',
              details: retryDetails.join('\n\n'),
              attempts: attempt,
              timeoutMs: FIRST_TOKEN_TIMEOUT_MS,
            });
          }
          continue;
        }
        if (retryDetails.length && error instanceof ProviderRequestError) {
          throw new ProviderRequestError(error.message, { ...error.diagnostic, details: [...retryDetails, `尝试 ${attempt}/${MAX_FIRST_TOKEN_ATTEMPTS}\n${error.diagnostic.details ?? error.message}`].join('\n\n') });
        }
        throw error;
      }
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') return;
    const diagnostic: ErrorDiagnostic = error instanceof ProviderRequestError
      ? { message: error.message, ...error.diagnostic }
      : { message: error instanceof Error ? error.message : String(error), kind: 'network', details: error instanceof Error ? error.stack || error.message : String(error) };
    await reportError(settings, request.requestId, tabId, { ...diagnostic, model, endpoint: config.endpoint, attempts: diagnostic.attempts ?? MAX_FIRST_TOKEN_ATTEMPTS });
  }
  finally { cancelledRequests.delete(request.requestId); controllers.delete(request.requestId); }
}
