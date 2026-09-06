import { createSignal, onMount, type Accessor } from 'solid-js';
import { getSettings, savePreferences, saveSettings } from '../shared/storage';
import { DEFAULT_SETTINGS } from '../shared/settings';
import { getProviderPreset, isCustomProviderId, PROVIDER_OPTIONS, PROVIDERS, type ProviderPreset } from '../shared/providers';
import type { KeyTestResponse } from '../shared/messages';
import type { Provider, ProviderAccount, Settings } from '../shared/domain';

export type SettingsStatus = { kind: 'idle' | 'testing' | 'success' | 'error'; message: string };

export interface SettingsController {
  settings: Accessor<Settings>;
  status: Accessor<SettingsStatus>;
  provider: () => ProviderPreset;
  providerOptions: () => typeof PROVIDER_OPTIONS;
  update: (key: 'apiKey' | 'model' | 'hideNativeLeet' | 'customName' | 'customBaseUrl' | 'customProtocol', value: string | boolean) => void;
  changeProvider: (provider: Provider) => void;
  createCustomProvider: () => void;
  deleteCustomProvider: () => void;
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

  const accountFor = (current: Settings, providerId = current.activeProviderId): ProviderAccount => {
    const preset = getProviderPreset(providerId, current.accounts[providerId]) ?? PROVIDERS.deepseek;
    return current.accounts[providerId] ?? { providerId, apiKey: '', model: preset.defaultModel };
  };

  const withActiveAccount = (current: Settings, providerId: Provider, account: ProviderAccount): Settings => ({
    ...current,
    activeProviderId: providerId,
    apiKey: account.apiKey,
    model: account.model,
    accounts: { ...current.accounts, [providerId]: account },
    apiKeys: { ...current.apiKeys, [providerId]: account.apiKey },
  });

  const resetPendingTest = () => {
    testSequence += 1;
    if (status().kind === 'testing') setStatus({ kind: 'idle', message: '' });
  };

  const update = (key: 'apiKey' | 'model' | 'hideNativeLeet' | 'customName' | 'customBaseUrl' | 'customProtocol', value: string | boolean) => {
    const current = settings();
    if (key === 'hideNativeLeet') {
      setSettings({ ...current, hideNativeLeet: value as boolean });
      return;
    }
    resetPendingTest();
    const account = { ...accountFor(current), [key]: value as string };
    setSettings({
      ...withActiveAccount(current, current.activeProviderId, account),
      [key]: value,
    });
  };

  const changeProvider = (provider: Provider) => {
    const current = settings();
    resetPendingTest();
    setSettings(withActiveAccount(current, provider, accountFor(current, provider)));
  };

  const createCustomProvider = () => {
    const current = settings();
    const providerId = `custom:${crypto.randomUUID()}`;
    const account: ProviderAccount = {
      providerId,
      apiKey: '',
      model: '',
      customName: '自定义平台',
      customBaseUrl: '',
      customProtocol: 'openai-chat',
    };
    resetPendingTest();
    setSettings(withActiveAccount(current, providerId, account));
  };

  const deleteCustomProvider = () => {
    const current = settings();
    const providerId = current.activeProviderId;
    if (!isCustomProviderId(providerId)) return;
    const accounts = { ...current.accounts };
    const apiKeys = { ...current.apiKeys };
    delete accounts[providerId];
    delete apiKeys[providerId];
    const fallback = accounts.deepseek ?? DEFAULT_SETTINGS.accounts.deepseek;
    const next: Settings = {
      ...current,
      activeProviderId: 'deepseek',
      apiKey: fallback.apiKey,
      model: fallback.model,
      accounts,
      apiKeys,
    };
    resetPendingTest();
    setSettings(next);
    void saveSettings(next);
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

  const requestCustomHostPermission = async (endpoint: string) => {
    const origin = new URL(endpoint).origin;
    const isBuiltinOrigin = Object.values(PROVIDERS).some((provider) => new URL(provider.endpoint).origin === origin);
    if (isBuiltinOrigin) return true;
    try {
      const granted = await chrome.permissions.request({ origins: [`${origin}/*`] });
      if (granted) return true;
    } catch {
      // The browser may reject a malformed or otherwise unavailable origin.
    }
    setStatus({ kind: 'error', message: '请授权访问此自定义平台的域名后再测试。' });
    return false;
  };

  const testAndSave = async () => {
    const current = settings();
    const account = accountFor(current);
    const config = getProviderPreset(current.activeProviderId, account);
    if (isCustomProviderId(current.activeProviderId)) {
      if (!account.customName?.trim()) { setStatus({ kind: 'error', message: '请填写自定义平台名称。' }); return; }
      if (!account.customBaseUrl?.trim()) { setStatus({ kind: 'error', message: '请填写 Base URL。' }); return; }
      if (!config) { setStatus({ kind: 'error', message: 'Base URL 必须是有效的 HTTP 或 HTTPS 地址，且不能包含查询参数或凭据。' }); return; }
      if (!account.model.trim()) { setStatus({ kind: 'error', message: '请填写模型名称。' }); return; }
      if (!await requestCustomHostPermission(config.endpoint)) return;
    }
    if (!account.apiKey.trim()) { setStatus({ kind: 'error', message: '请先填写 API Key。' }); return; }
    const fingerprint = `${current.activeProviderId}\n${config?.protocol ?? ''}\n${config?.endpoint ?? ''}\n${account.model.trim()}\n${account.apiKey.trim()}`;
    const sequence = ++testSequence;
    setStatus({ kind: 'testing', message: '正在测试 API Key…' });
    const test = pendingTest?.fingerprint === fingerprint
      ? pendingTest.promise
      : (async () => {
        try {
          return await chrome.runtime.sendMessage({ type: 'test-key', account }) as KeyTestResponse;
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
    globalThis.setTimeout(() => setStatus((value) => value.kind === 'success' ? { kind: 'idle', message: '' } : value), 2200);
  };

  return {
    settings,
    status,
    provider: () => getProviderPreset(settings().activeProviderId, accountFor(settings())) ?? {
      id: settings().activeProviderId,
      label: accountFor(settings()).customName?.trim() || '自定义平台',
      endpoint: accountFor(settings()).customBaseUrl ?? '',
      defaultModel: accountFor(settings()).model,
      protocol: accountFor(settings()).customProtocol ?? 'openai-chat',
    },
    providerOptions: () => [
      ...PROVIDER_OPTIONS,
      ...Object.values(settings().accounts)
        .filter((account) => isCustomProviderId(account.providerId))
        .map((account) => ({
          value: account.providerId,
          label: account.customName?.trim() || '自定义平台',
          description: account.customProtocol === 'anthropic-messages' ? 'Anthropic Messages' : 'OpenAI Chat',
        })),
    ],
    update,
    changeProvider,
    createCustomProvider,
    deleteCustomProvider,
    changeTheme,
    changeHideNativeLeet,
    testAndSave,
    openApiKeys: () => {
      const url = getProviderPreset(settings().activeProviderId, accountFor(settings()))?.apiKeysUrl;
      if (url) void chrome.tabs.create({ url });
    },
  };
}
