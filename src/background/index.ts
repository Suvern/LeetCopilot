import { appendErrorLog, getSettings } from '../shared/storage';
import { systemPrompt, userPrompt } from '../shared/prompt';
import { PROVIDERS } from '../shared/providers';
import type { BackgroundRequest, BackgroundEvent, ErrorKind } from '../shared/types';

const controllers = new Map<string, AbortController>();
const cancelledRequests = new Set<string>();
const FIRST_TOKEN_TIMEOUT_MS = 10_000;
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
  void streamChat(request, sender.tab?.id);
});

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
      editor.executeEdits('leetlens', [{ range: new api.Range(first, 1, last, endColumn), text: nextCode }]);
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
  await appendErrorLog({
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
  await send({ type: 'error', requestId, message: safeMessage }, tabId);
}

class FirstTokenTimeoutError extends Error {
  readonly kind = 'timeout' as const;
  constructor() { super('首个 token 超时。'); this.name = 'FirstTokenTimeoutError'; }
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
  let timedOut = false;
  let firstTokenReceived = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, FIRST_TOKEN_TIMEOUT_MS);
  try {
    const response = await fetch(config.endpoint, { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey.trim()}` }, body: JSON.stringify({ model: settings.model.trim() || config.defaultModel, stream: true, messages: [{ role: 'system', content: `${systemPrompt}\n\n${userPrompt(request.problem, '请使用以下题目上下文回答后续对话。')}` }, ...request.messages.map((message) => ({ role: message.role, content: message.content }))] }) });
    if (!response.ok) {
      const detail = await response.text();
      throw new ProviderRequestError(`${config.label} 请求失败（${response.status}）。`, {
        kind: 'http',
        details: detail || '服务未提供错误详情。',
        status: response.status,
        statusText: response.statusText,
      });
    }
    if (!response.body) throw new ProviderRequestError(`${config.label} 没有返回可读取的内容。`, { kind: 'stream', details: '响应没有可读取的 body。' });
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
    const consume = async (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/); buffer = lines.pop() ?? '';
      for (const line of lines) {
        const dataLine = line.trim(); if (!dataLine.startsWith('data:')) continue;
        const data = dataLine.slice(5).trim(); if (data === '[DONE]') continue;
        try {
          const payload = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }>; error?: unknown };
          if (payload.error) throw new ProviderRequestError(`${config.label} 返回了错误响应。`, { kind: 'stream', details: JSON.stringify(payload.error, null, 2) });
          const text = payload.choices?.[0]?.delta?.content;
          if (text) { firstTokenReceived = true; await send({ type: 'delta', requestId: request.requestId, text }, tabId); }
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
      if (firstTokenReceived) clearTimeout(timeout);
    }
    await consume(decoder.decode());
    if (buffer.trim().startsWith('data:')) await consume('\n');
    if (!firstTokenReceived) throw new FirstTokenTimeoutError();
    return true;
  } catch (error) {
    if (timedOut) throw new FirstTokenTimeoutError();
    throw error;
  } finally {
    clearTimeout(timeout);
    if (controllers.get(request.requestId) === controller) controllers.delete(request.requestId);
  }
}

async function streamChat(request: Extract<BackgroundRequest, { type: 'chat' }>, tabId?: number) {
  const settings = await getSettings();
  const config = PROVIDERS[settings.provider];
  const model = settings.model.trim() || config.defaultModel;
  if (!settings.apiKey.trim()) return reportError(settings, request.requestId, tabId, { message: `请先在 LeetLens 设置中填写${config.label} API Key。`, kind: 'configuration', details: '请求未发送：当前 provider 没有可用的 API Key。', model, endpoint: config.endpoint, attempts: 0 });
  cancelledRequests.delete(request.requestId);
  try {
    for (let attempt = 1; attempt <= MAX_FIRST_TOKEN_ATTEMPTS; attempt += 1) {
      if (cancelledRequests.has(request.requestId)) return;
      try {
        await streamAttempt(request, tabId, settings, config);
        await send({ type: 'done', requestId: request.requestId }, tabId);
        return;
      } catch (error) {
        if ((error as Error).name === 'AbortError' && !controllers.has(request.requestId)) return;
        if (!(error instanceof FirstTokenTimeoutError) || attempt === MAX_FIRST_TOKEN_ATTEMPTS) {
          if (error instanceof FirstTokenTimeoutError) {
            throw new ProviderRequestError(`${config.label} 首个 token 在 ${FIRST_TOKEN_TIMEOUT_MS / 1000} 秒内未返回，已重试 ${MAX_FIRST_TOKEN_ATTEMPTS - 1} 次。`, {
              kind: 'timeout',
              details: `等待首个 token 超过 ${FIRST_TOKEN_TIMEOUT_MS}ms；共尝试 ${attempt} 次。`,
              attempts: attempt,
              timeoutMs: FIRST_TOKEN_TIMEOUT_MS,
            });
          }
          throw error;
        }
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
