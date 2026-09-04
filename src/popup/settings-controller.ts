import { createSignal, onMount, type Accessor } from 'solid-js';
import { getSettings, savePreferences, saveSettings } from '../shared/storage';
import { DEFAULT_SETTINGS } from '../shared/settings';
import { PROVIDERS } from '../shared/providers';
import type { KeyTestResponse } from '../shared/messages';
import type { Provider, Settings } from '../shared/domain';

export type SettingsStatus = { kind: 'idle' | 'testing' | 'success' | 'error'; message: string };

export interface SettingsController {
  settings: Accessor<Settings>;
  status: Accessor<SettingsStatus>;
  provider: () => typeof PROVIDERS[Provider];
  update: (key: 'apiKey' | 'model' | 'hideNativeLeet', value: string | boolean) => void;
  changeProvider: (provider: Provider) => void;
  changeTheme: (dark: boolean) => void;
  changeHideNativeLeet: (hideNativeLeet: boolean) => void;
  testAndSave: () => Promise<void>;
  openApiKeys: () => void;
}

export function createSettingsController(): SettingsController {
  const [settings, setSettings] = createSignal(DEFAULT_SETTINGS);
  const [status, setStatus] = createSignal<SettingsStatus>({ kind: 'idle', message: '' });
  let testSequence = 0;
  let pendingTest: { fingerprint: string; promise: Promise<KeyTestResponse | undefined> } | undefined;

  onMount(() => { void getSettings().then(setSettings); });

  const update = (key: 'apiKey' | 'model' | 'hideNativeLeet', value: string | boolean) => {
    const current = settings();
    setSettings({
      ...current,
      [key]: value,
      apiKeys: key === 'apiKey' ? { ...current.apiKeys, [current.provider]: value as string } : current.apiKeys,
    });
  };

  const changeProvider = (provider: Provider) => {
    const current = settings();
    setSettings({ ...current, provider, apiKey: current.apiKeys[provider], model: PROVIDERS[provider].defaultModel });
  };

  const changeTheme = (dark: boolean) => {
    const theme = dark ? 'dark' : settings().theme === 'light' ? 'light' : 'auto';
    setSettings((current) => ({ ...current, theme }));
    void savePreferences({ theme, hideNativeLeet: settings().hideNativeLeet });
  };

  const changeHideNativeLeet = (hideNativeLeet: boolean) => {
    setSettings((current) => ({ ...current, hideNativeLeet }));
    void savePreferences({ theme: settings().theme, hideNativeLeet });
  };

  const testAndSave = async () => {
    const current = settings();
    if (!current.apiKey.trim()) { setStatus({ kind: 'error', message: '请先填写 API Key。' }); return; }
    const fingerprint = `${current.provider}\n${current.model.trim()}\n${current.apiKey.trim()}`;
    const sequence = ++testSequence;
    setStatus({ kind: 'testing', message: '正在测试 API Key…' });
    const test = pendingTest?.fingerprint === fingerprint
      ? pendingTest.promise
      : (async () => {
        try {
          return await chrome.runtime.sendMessage({ type: 'test-key', provider: current.provider, apiKey: current.apiKey, model: current.model }) as KeyTestResponse;
        } catch {
          return { ok: false, error: 'API Key 测试失败，请检查扩展权限或网络连接。' };
        }
      })();
    pendingTest = { fingerprint, promise: test };
    const result = await test;
    if (pendingTest?.promise === test) pendingTest = undefined;
    if (sequence !== testSequence) return;
    if (!result?.ok) { setStatus({ kind: 'error', message: result?.error ?? 'API Key 测试失败。' }); return; }
    await saveSettings(current);
    setStatus({ kind: 'success', message: 'API Key 测试成功，已保存' });
    window.setTimeout(() => setStatus((value) => value.kind === 'success' ? { kind: 'idle', message: '' } : value), 2200);
  };

  return {
    settings,
    status,
    provider: () => PROVIDERS[settings().provider],
    update,
    changeProvider,
    changeTheme,
    changeHideNativeLeet,
    testAndSave,
    openApiKeys: () => void chrome.tabs.create({ url: PROVIDERS[settings().provider].apiKeysUrl }),
  };
}
