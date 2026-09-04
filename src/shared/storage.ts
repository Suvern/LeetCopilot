import type { ChatMessage, ErrorLog, Provider, Settings } from './types';
import { PROVIDERS } from './providers';

export const DEFAULT_SETTINGS: Settings = {
  provider: 'deepseek',
  apiKey: '',
  apiKeys: { deepseek: '', qwen: '' },
  model: PROVIDERS.deepseek.defaultModel,
  theme: 'auto',
  hideNativeLeet: false,
};
const settingsKey = 'leetlens:settings';
const errorLogsKey = 'leetlens:error-logs';
const historyKey = (id: string) => `leetlens:history:${id}`;
const defaultModel = (provider: Provider) => PROVIDERS[provider].defaultModel;
export async function getSettings(): Promise<Settings> {
  const stored = (await chrome.storage.local.get(settingsKey))[settingsKey] as Partial<Settings> | undefined;
  const provider = stored?.provider === 'qwen' ? 'qwen' : 'deepseek';
  const apiKeys = { ...DEFAULT_SETTINGS.apiKeys, ...(stored?.apiKeys ?? {}) };
  if (!stored?.apiKeys && stored?.apiKey) apiKeys[provider] = stored.apiKey;
  return { ...DEFAULT_SETTINGS, ...stored, provider, apiKeys, apiKey: stored?.apiKey ?? apiKeys[provider], model: stored?.model || defaultModel(provider) };
}
export async function saveSettings(settings: Settings) {
  await chrome.storage.local.set({ [settingsKey]: { ...settings, apiKey: settings.apiKey.trim(), apiKeys: { ...settings.apiKeys, [settings.provider]: settings.apiKey.trim() } } });
}
export async function getErrorLogs(): Promise<ErrorLog[]> {
  const value = await chrome.storage.local.get(errorLogsKey);
  return Array.isArray(value[errorLogsKey]) ? value[errorLogsKey] as ErrorLog[] : [];
}
export async function appendErrorLog(log: Omit<ErrorLog, 'id' | 'createdAt'>) {
  const logs = await getErrorLogs();
  await chrome.storage.local.set({ [errorLogsKey]: [...logs, { ...log, id: crypto.randomUUID(), createdAt: Date.now() }].slice(-50) });
}
export async function clearErrorLogs() { await chrome.storage.local.remove(errorLogsKey); }
export async function getHistory(id: string): Promise<ChatMessage[]> { const value = await chrome.storage.local.get(historyKey(id)); return value[historyKey(id)] ?? []; }
export async function saveHistory(id: string, messages: ChatMessage[]) { await chrome.storage.local.set({ [historyKey(id)]: messages.slice(-30) }); }
export async function clearHistory(id: string) { await chrome.storage.local.remove(historyKey(id)); }
