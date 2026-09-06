import { appendErrorLog } from '../shared/storage';
import type { ErrorKind, Settings } from '../shared/domain';
import type { BackgroundEvent } from '../shared/messages';

export type ErrorDiagnostic = {
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

export class ProviderRequestError extends Error {
  readonly diagnostic: Omit<ErrorDiagnostic, 'message'>;

  constructor(message: string, diagnostic: Omit<ErrorDiagnostic, 'message'>) {
    super(message);
    this.name = 'ProviderRequestError';
    this.diagnostic = diagnostic;
  }
}

export function redactSecrets(value: string, apiKey: string) {
  const trimmedKey = apiKey.trim();
  return trimmedKey ? value.replaceAll(trimmedKey, '[已隐藏 API Key]') : value;
}

function savedApiKeys(settings: Settings) {
  return [...new Set([
    settings.apiKey,
    ...Object.values(settings.apiKeys),
    ...Object.values(settings.accounts).map((account) => account.apiKey),
  ].map((apiKey) => apiKey.trim()).filter(Boolean))]
    .sort((left, right) => right.length - left.length);
}

export function redactSavedSecrets(value: string, settings: Settings) {
  return savedApiKeys(settings)
    .reduce((safeValue, apiKey) => redactSecrets(safeValue, apiKey), value);
}

export async function reportError(settings: Settings, requestId: string, tabId: number | undefined, diagnostic: ErrorDiagnostic, send: (event: BackgroundEvent, tabId?: number) => Promise<void>) {
  const redact = (value: string | undefined) => value ? redactSavedSecrets(value, settings) : value;
  const safeMessage = redact(diagnostic.message) ?? '请求失败，请重试。';
  let log;
  try {
    log = await appendErrorLog({
      provider: settings.activeProviderId,
      message: safeMessage,
      kind: diagnostic.kind,
      details: redact(diagnostic.details),
      endpoint: redact(diagnostic.endpoint),
      model: redact(diagnostic.model),
      status: diagnostic.status,
      statusText: redact(diagnostic.statusText),
      attempts: diagnostic.attempts,
      timeoutMs: diagnostic.timeoutMs,
      requestId,
    });
  } catch {
    log = undefined;
  }
  await send({ type: 'error', requestId, message: safeMessage, errorLogId: log?.id }, tabId);
}
