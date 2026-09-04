import { Field } from '@ark-ui/solid/field';
import { PasswordInput } from '@ark-ui/solid/password-input';
import { Select, createListCollection } from '@ark-ui/solid/select';
import { Switch } from '@ark-ui/solid/switch';
import { CheckIcon, ChevronDownIcon, ExternalLinkIcon, EyeIcon, EyeOffIcon, KeyRoundIcon, Settings2Icon } from 'lucide-solid';
import { createSignal, For, Show } from 'solid-js';
import { Portal, render } from 'solid-js/web';
import { LeetLensLogo } from '../shared/Logo';
import { PROVIDERS, PROVIDER_OPTIONS } from '../shared/providers';
import { DEFAULT_SETTINGS, getSettings, saveSettings } from '../shared/storage';
import type { Provider, Theme } from '../shared/types';
import './style.css';

const providerCollection = createListCollection({ items: PROVIDER_OPTIONS });
const themeCollection = createListCollection({
  items: [
    { value: 'auto', label: '跟随 LeetCode' },
    { value: 'light', label: '浅色模式' },
    { value: 'dark', label: '深色模式' },
  ],
});

function Popup() {
  const [settings, setSettings] = createSignal(DEFAULT_SETTINGS);
  const [saved, setSaved] = createSignal(false);

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
  const changeTheme = (theme: Theme | 'auto') => setSettings((current) => ({ ...current, theme }));
  const save = async (event: SubmitEvent) => {
    event.preventDefault();
    await saveSettings(settings());
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };
  const provider = () => PROVIDERS[settings().provider];
  const openApiKeys = () => void chrome.tabs.create({ url: provider().apiKeysUrl });

  return (
    <main class="popup-shell">
      <header class="popup-header">
        <div class="brand-lockup">
          <div class="brand-mark"><LeetLensLogo class="brand-logo" /></div>
          <div><p class="eyebrow">LEETCODE WORKSPACE</p><h1>LeetLens</h1></div>
        </div>
        <Settings2Icon aria-hidden="true" class="header-icon" />
      </header>
      <form class="settings-form" onSubmit={save}>
        <section class="settings-section" aria-labelledby="provider-heading">
          <div class="section-heading"><KeyRoundIcon aria-hidden="true" /><div><h2 id="provider-heading">模型连接</h2><p>选择服务并保存在此浏览器中</p></div></div>
          <Select.Root class="select-root" collection={providerCollection} value={[settings().provider]} onValueChange={(details) => { const value = details.value[0] as Provider | undefined; if (value) changeProvider(value); }}>
            <Select.Label class="field-label">AI 平台</Select.Label>
            <Select.Control class="select-control"><Select.Trigger class="select-trigger" aria-label="AI 平台"><Select.ValueText class="select-value" placeholder="选择平台" /><Select.Indicator class="select-indicator"><ChevronDownIcon /></Select.Indicator></Select.Trigger></Select.Control>
            <Portal><Select.Positioner class="select-positioner"><Select.Content class="select-content"><For each={providerCollection.items}>{(item) => <Select.Item class="select-item" item={item}><Select.ItemText>{item.label}</Select.ItemText><Select.ItemIndicator><CheckIcon /></Select.ItemIndicator></Select.Item>}</For></Select.Content></Select.Positioner></Portal>
            <Select.HiddenSelect />
          </Select.Root>
          <PasswordInput.Root class="password-root" autoComplete="new-password">
            <PasswordInput.Label class="field-label">{provider().label} API Key</PasswordInput.Label>
            <PasswordInput.Control class="password-control"><PasswordInput.Input class="text-input password-input" aria-label={`${provider().label} API Key`} value={settings().apiKey} onInput={(event) => update('apiKey', event.currentTarget.value)} placeholder="粘贴 API Key" /><PasswordInput.VisibilityTrigger class="visibility-trigger" title="显示或隐藏 API Key"><PasswordInput.Indicator fallback={<EyeOffIcon />}><EyeIcon /></PasswordInput.Indicator></PasswordInput.VisibilityTrigger></PasswordInput.Control>
            <button class="api-key-link" type="button" onClick={openApiKeys}>获取 {provider().label} API Key <ExternalLinkIcon aria-hidden="true" /></button>
          </PasswordInput.Root>
          <Field.Root class="field-root"><Field.Label class="field-label">模型名称</Field.Label><input class="text-input" value={settings().model} onInput={(event) => update('model', event.currentTarget.value)} placeholder={provider().defaultModel} /></Field.Root>
        </section>
        <section class="settings-section preferences" aria-labelledby="preferences-heading">
          <div class="section-heading"><Settings2Icon aria-hidden="true" /><div><h2 id="preferences-heading">显示偏好</h2><p>只影响当前浏览器内的 LeetCode 页面</p></div></div>
          <Select.Root class="select-root" collection={themeCollection} value={[settings().theme]} onValueChange={(details) => { const value = details.value[0] as Theme | 'auto' | undefined; if (value) changeTheme(value); }}>
            <Select.Label class="field-label">页面主题</Select.Label>
            <Select.Control class="select-control"><Select.Trigger class="select-trigger" aria-label="页面主题"><Select.ValueText class="select-value" placeholder="选择主题" /><Select.Indicator class="select-indicator"><ChevronDownIcon /></Select.Indicator></Select.Trigger></Select.Control>
            <Portal><Select.Positioner class="select-positioner"><Select.Content class="select-content"><For each={themeCollection.items}>{(item) => <Select.Item class="select-item" item={item}><Select.ItemText>{item.label}</Select.ItemText><Select.ItemIndicator><CheckIcon /></Select.ItemIndicator></Select.Item>}</For></Select.Content></Select.Positioner></Portal>
            <Select.HiddenSelect />
          </Select.Root>
          <Switch.Root class="native-switch" checked={settings().hideNativeLeet} onCheckedChange={(details) => update('hideNativeLeet', details.checked)}>
            <Switch.Control class="switch-control"><Switch.Thumb class="switch-thumb" /></Switch.Control>
            <span><Switch.Label class="switch-label">隐藏原生 Leet 面板</Switch.Label><span class="switch-description">在 LeetCode 内仅显示 LeetLens</span></span>
            <Switch.HiddenInput />
          </Switch.Root>
        </section>
        <footer class="popup-footer"><Show when={saved()} fallback={<span>API Key 仅保存在本地扩展存储中</span>}><span class="saved-status"><CheckIcon aria-hidden="true" />设置已保存</span></Show><button class="save-button" type="submit">保存设置</button></footer>
      </form>
    </main>
  );
}

render(() => <Popup />, document.getElementById('root')!);
