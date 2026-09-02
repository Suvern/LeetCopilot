import type { ChatMessage, Settings } from './types';
export const DEFAULT_SETTINGS: Settings = { apiKey: __LEETLENS_DEV_API_KEY__, model: 'deepseek-v4-flash', theme: 'auto' };
const settingsKey = 'leetlens:settings';
const historyKey = (id: string) => `leetlens:history:${id}`;
export async function getSettings(): Promise<Settings> { const value = await chrome.storage.local.get(settingsKey); return { ...DEFAULT_SETTINGS, ...(value[settingsKey] ?? {}) }; }
export async function saveSettings(settings: Settings) { await chrome.storage.local.set({ [settingsKey]: settings }); }
export async function getHistory(id: string): Promise<ChatMessage[]> { const value = await chrome.storage.local.get(historyKey(id)); return value[historyKey(id)] ?? []; }
export async function saveHistory(id: string, messages: ChatMessage[]) { await chrome.storage.local.set({ [historyKey(id)]: messages.slice(-30) }); }
export async function clearHistory(id: string) { await chrome.storage.local.remove(historyKey(id)); }
