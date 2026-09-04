import type { ChatMessage, ErrorLog, Settings } from './domain';
import { normalizeSettings, type StoredSettings } from './settings';
const settingsKey = 'leet-copilot:settings';
const errorLogsKey = 'leet-copilot:error-logs';
const historyKey = (id: string) => `leet-copilot:history:${id}`;
export async function getSettings(): Promise<Settings> {
  const values = await chrome.storage.local.get(settingsKey);
  return normalizeSettings(values[settingsKey] as StoredSettings | undefined);
}
export async function saveSettings(settings: Settings) {
  await chrome.storage.local.set({ [settingsKey]: { ...settings, apiKey: settings.apiKey.trim(), apiKeys: { ...settings.apiKeys, [settings.provider]: settings.apiKey.trim() } } });
}
export async function savePreferences(preferences: Pick<Settings, 'theme' | 'hideNativeLeet'>) {
  const current = await getSettings();
  await saveSettings({ ...current, ...preferences });
}
export async function getErrorLogs(): Promise<ErrorLog[]> {
  const value = await chrome.storage.local.get(errorLogsKey);
  const logs = value[errorLogsKey];
  return Array.isArray(logs) ? logs as ErrorLog[] : [];
}
export async function appendErrorLog(log: Omit<ErrorLog, 'id' | 'createdAt'>): Promise<ErrorLog> {
  const logs = await getErrorLogs();
  const nextLog: ErrorLog = { ...log, id: crypto.randomUUID(), createdAt: Date.now() };
  await chrome.storage.local.set({ [errorLogsKey]: [...logs, nextLog].slice(-50) });
  return nextLog;
}
export async function clearErrorLogs() { await chrome.storage.local.remove(errorLogsKey); }
export async function getHistory(id: string): Promise<ChatMessage[]> {
  const currentKey = historyKey(id);
  const value = await chrome.storage.local.get(currentKey);
  return value[currentKey] ?? [];
}
export async function saveHistory(id: string, messages: ChatMessage[]) { await chrome.storage.local.set({ [historyKey(id)]: messages.slice(-30) }); }
export async function clearHistory(id: string) { await chrome.storage.local.remove(historyKey(id)); }
