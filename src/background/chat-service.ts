import { getSettings } from '../shared/storage';
import { getProviderPreset } from '../shared/providers';
import { getActiveAccount } from '../shared/settings';
import type { ChatRequest } from '../shared/messages';
import { ProviderRequestError, reportError, type ErrorDiagnostic } from './diagnostics';
import { sendToTab } from './messenger';
import { FIRST_TOKEN_TIMEOUT_MS, StreamStartTimeoutError, streamAttempt } from './provider-client';

const MAX_FIRST_TOKEN_ATTEMPTS = 2;
const controllers = new Map<string, AbortController>();
const cancelledRequests = new Set<string>();

export function cancelChat(requestId: string) {
  cancelledRequests.add(requestId);
  controllers.get(requestId)?.abort();
  controllers.delete(requestId);
}

export async function streamChat(request: ChatRequest, tabId?: number) {
  const settings = await getSettings();
  const providerId = settings.activeProviderId;
  const account = getActiveAccount(settings);
  const config = getProviderPreset(providerId);
  const model = account?.model.trim() || config?.defaultModel || settings.model.trim();

  if (!config || !account) {
    await reportError(settings, request.requestId, tabId, {
      message: `当前 provider 未注册或没有对应账户：${providerId}。`,
      kind: 'configuration',
      details: '请求未发送：当前 provider 没有可用的注册信息或账户配置。',
      model,
      endpoint: config?.endpoint,
      attempts: 0,
    }, sendToTab);
    return;
  }

  if (!account.apiKey.trim()) {
    await reportError(settings, request.requestId, tabId, {
      message: `请先在 LeetCopilot 设置中填写${config.label} API Key。`,
      kind: 'configuration',
      details: '请求未发送：当前 provider 没有可用的 API Key。',
      model,
      endpoint: config.endpoint,
      attempts: 0,
    }, sendToTab);
    return;
  }

  cancelledRequests.delete(request.requestId);
  try {
    const retryDetails: string[] = [];
    for (let attempt = 1; attempt <= MAX_FIRST_TOKEN_ATTEMPTS; attempt += 1) {
      if (cancelledRequests.has(request.requestId)) return;
      const controller = new AbortController();
      controllers.set(request.requestId, controller);
      try {
        await streamAttempt(request, account, config, controller, async (text) => sendToTab({ type: 'delta', requestId: request.requestId, text }, tabId));
        await sendToTab({ type: 'done', requestId: request.requestId }, tabId);
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
          throw new ProviderRequestError(error.message, {
            ...error.diagnostic,
            details: [...retryDetails, `尝试 ${attempt}/${MAX_FIRST_TOKEN_ATTEMPTS}\n${error.diagnostic.details ?? error.message}`].join('\n\n'),
          });
        }
        throw error;
      } finally {
        if (controllers.get(request.requestId) === controller) controllers.delete(request.requestId);
      }
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') return;
    const diagnostic: ErrorDiagnostic = error instanceof ProviderRequestError
      ? { message: error.message, ...error.diagnostic }
      : { message: error instanceof Error ? error.message : String(error), kind: 'network', details: error instanceof Error ? error.stack || error.message : String(error) };
    await reportError(settings, request.requestId, tabId, {
      ...diagnostic,
      model,
      endpoint: config.endpoint,
      attempts: diagnostic.attempts ?? MAX_FIRST_TOKEN_ATTEMPTS,
    }, sendToTab);
  } finally {
    cancelledRequests.delete(request.requestId);
    controllers.delete(request.requestId);
  }
}
