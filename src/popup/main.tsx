import { Field } from '@ark-ui/solid/field';
import { PasswordInput } from '@ark-ui/solid/password-input';
import { Select, createListCollection } from '@ark-ui/solid/select';
import { Switch } from '@ark-ui/solid/switch';
import { ChevronDownIcon, ExternalLinkIcon, EyeIcon, EyeOffIcon, KeyRoundIcon, Settings2Icon } from 'lucide-solid';
import { createSignal, For, Show } from 'solid-js';
import { Portal, render } from 'solid-js/web';
import { LeetCopilotLogo } from '../shared/Logo';
import { PROVIDERS, PROVIDER_OPTIONS } from '../shared/providers';
import { getSettings, savePreferences, saveSettings } from '../shared/storage';
import { DEFAULT_SETTINGS } from '../shared/settings';
import type { Provider } from '../shared/domain';
import './style.css';

const providerCollection = createListCollection({ items: PROVIDER_OPTIONS });
function Popup() {
  const [settings, setSettings] = createSignal(DEFAULT_SETTINGS);
  const [status, setStatus] = createSignal<{ kind: 'idle' | 'testing' | 'success' | 'error'; message: string }>({ kind: 'idle', message: '' });

  void getSettings().then(setSettings);

  const update = (key: 'apiKey' | 'model' | 'hideNativeLeet', value: string | boolean) => {
    const current = settings();
    setSettings({
      ...current,
      [key]: value,
      apiKeys: key === 'apiKey'
        ? { ...current.apiKeys, [current.provider]: value as string }
        : current.apiKeys,
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
  let testSequence = 0;
  let pendingTest: { fingerprint: string; promise: Promise<{ ok?: boolean; error?: string } | undefined> } | undefined;
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
          return await chrome.runtime.sendMessage({ type: 'test-key', provider: current.provider, apiKey: current.apiKey, model: current.model });
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
  const provider = () => PROVIDERS[settings().provider];
  const openApiKeys = () => void chrome.tabs.create({ url: provider().apiKeysUrl });

  return (
    <main class="popup-shell">
      <header class="popup-header">
        <div class="brand-lockup">
          <div class="brand-mark"><LeetCopilotLogo class="brand-logo" /></div>
          <div><p class="eyebrow">LEETCODE WORKSPACE</p><h1>LeetCopilot</h1></div>
        </div>
        <Settings2Icon aria-hidden="true" class="header-icon" />
      </header>
      <div class="settings-form">
        <section class="settings-section" aria-labelledby="provider-heading">
          <div class="section-heading"><KeyRoundIcon aria-hidden="true" /><div><h2 id="provider-heading">模型连接</h2><p>选择服务并保存在此浏览器中</p></div></div>
          <Select.Root class="select-root" collection={providerCollection} value={[settings().provider]} onValueChange={(details) => { const value = details.value[0] as Provider | undefined; if (value) changeProvider(value); }}>
            <Select.Label class="field-label">AI 平台</Select.Label>
            <Select.Control class="select-control"><Select.Trigger class="select-trigger" aria-label="AI 平台"><Select.ValueText class="select-value" placeholder="选择平台" /><Select.Indicator class="select-indicator"><ChevronDownIcon /></Select.Indicator></Select.Trigger></Select.Control>
            <Portal><Select.Positioner class="select-positioner"><Select.Content class="select-content"><For each={providerCollection.items}>{(item) => <Select.Item class="select-item" item={item}><Select.ItemText>{item.label}</Select.ItemText><Show when={Boolean(settings().apiKeys[item.value as Provider]?.trim())}><KeyRoundIcon class="provider-configured" aria-label="已配置 API Key" /></Show></Select.Item>}</For></Select.Content></Select.Positioner></Portal>
            <Select.HiddenSelect />
          </Select.Root>
          <PasswordInput.Root class="password-root" autoComplete="new-password">
            <PasswordInput.Label class="field-label">{provider().label} API Key</PasswordInput.Label>
            <PasswordInput.Control class="password-control"><PasswordInput.Input class="text-input password-input" aria-label={`${provider().label} API Key`} value={settings().apiKey} onInput={(event) => update('apiKey', event.currentTarget.value)} placeholder="粘贴 API Key" /><PasswordInput.VisibilityTrigger class="visibility-trigger" title="显示或隐藏 API Key"><PasswordInput.Indicator fallback={<EyeOffIcon />}><EyeIcon /></PasswordInput.Indicator></PasswordInput.VisibilityTrigger></PasswordInput.Control>
            <button class="api-key-link" type="button" onClick={openApiKeys}>获取 {provider().label} API Key <ExternalLinkIcon aria-hidden="true" /></button>
          </PasswordInput.Root>
          <Field.Root class="field-root"><Field.Label class="field-label">模型名称</Field.Label><input class="text-input" value={settings().model} onInput={(event) => update('model', event.currentTarget.value)} placeholder={provider().defaultModel} /></Field.Root>
          <div class="connection-footer"><Show when={status().message}><span class={`connection-status ${status().kind}`} role={status().kind === 'error' ? 'alert' : 'status'}>{status().message}</span></Show><button class="save-button" type="button" onClick={() => void testAndSave()} disabled={status().kind === 'testing'}>{status().kind === 'testing' ? '测试中…' : '测试并保存'}</button></div>
        </section>
        <section class="settings-section preferences" aria-labelledby="preferences-heading">
          <div class="section-heading"><Settings2Icon aria-hidden="true" /><div><h2 id="preferences-heading">显示偏好</h2><p>用开关快速调整 LeetCode 页面</p></div></div>
          <Switch.Root class="native-switch" checked={settings().theme === 'dark'} onCheckedChange={(details) => changeTheme(details.checked)}>
            <Switch.Control class="switch-control"><Switch.Thumb class="switch-thumb" /></Switch.Control>
            <span><Switch.Label class="switch-label">深色模式</Switch.Label><span class="switch-description">打开后固定使用深色界面</span></span>
            <Switch.HiddenInput />
          </Switch.Root>
          <Switch.Root class="native-switch" checked={settings().hideNativeLeet} onCheckedChange={(details) => changeHideNativeLeet(details.checked)}>
            <Switch.Control class="switch-control"><Switch.Thumb class="switch-thumb" /></Switch.Control>
            <span><Switch.Label class="switch-label">隐藏原生 Leet 面板</Switch.Label><span class="switch-description">在 LeetCode 内仅显示 LeetCopilot</span></span>
            <Switch.HiddenInput />
          </Switch.Root>
        </section>
        <footer class="popup-footer"><span>显示偏好会即时生效，API Key 测试成功后保存</span></footer>
      </div>
    </main>
  );
}

render(() => <Popup />, document.getElementById('root')!);
