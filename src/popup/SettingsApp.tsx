import { Field } from '@ark-ui/solid/field';
import { PasswordInput } from '@ark-ui/solid/password-input';
import { Select, createListCollection } from '@ark-ui/solid/select';
import { Switch } from '@ark-ui/solid/switch';
import { ChevronDownIcon, ExternalLinkIcon, EyeIcon, EyeOffIcon, KeyRoundIcon, Settings2Icon } from 'lucide-solid';
import { For, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { LeetCopilotLogo } from '../shared/Logo';
import { PROVIDER_OPTIONS } from '../shared/providers';
import type { Provider } from '../shared/domain';
import { createSettingsController } from './settings-controller';
import './style.css';

const providerCollection = createListCollection({ items: PROVIDER_OPTIONS });

export function SettingsApp() {
  const controller = createSettingsController();
  const settings = controller.settings;
  const provider = controller.provider;

  return <main class="popup-shell">
    <header class="popup-header">
      <div class="brand-lockup"><div class="brand-mark"><LeetCopilotLogo class="brand-logo" /></div><div><p class="eyebrow">LEETCODE WORKSPACE</p><h1>LeetCopilot</h1></div></div>
      <Settings2Icon aria-hidden="true" class="header-icon" />
    </header>
    <div class="settings-form">
      <section class="settings-section" aria-labelledby="provider-heading">
        <div class="section-heading"><KeyRoundIcon aria-hidden="true" /><div><h2 id="provider-heading">模型连接</h2><p>选择服务并保存在此浏览器中</p></div></div>
        <Select.Root class="select-root" collection={providerCollection} value={[settings().provider]} onValueChange={(details) => { const value = details.value[0] as Provider | undefined; if (value) controller.changeProvider(value); }}>
          <Select.Label class="field-label">AI 平台</Select.Label>
          <Select.Control class="select-control"><Select.Trigger class="select-trigger" aria-label="AI 平台"><Select.ValueText class="select-value" placeholder="选择平台" /><Select.Indicator class="select-indicator"><ChevronDownIcon /></Select.Indicator></Select.Trigger></Select.Control>
          <Portal><Select.Positioner class="select-positioner"><Select.Content class="select-content"><For each={providerCollection.items}>{(item) => <Select.Item class="select-item" item={item}><Select.ItemText>{item.label}</Select.ItemText><Show when={Boolean(settings().apiKeys[item.value as Provider]?.trim())}><KeyRoundIcon class="provider-configured" aria-label="已配置 API Key" /></Show></Select.Item>}</For></Select.Content></Select.Positioner></Portal>
          <Select.HiddenSelect />
        </Select.Root>
        <PasswordInput.Root class="password-root" autoComplete="new-password">
          <PasswordInput.Label class="field-label">{provider().label} API Key</PasswordInput.Label>
          <PasswordInput.Control class="password-control"><PasswordInput.Input class="text-input password-input" aria-label={`${provider().label} API Key`} value={settings().apiKey} onInput={(event) => controller.update('apiKey', event.currentTarget.value)} placeholder="粘贴 API Key" /><PasswordInput.VisibilityTrigger class="visibility-trigger" title="显示或隐藏 API Key"><PasswordInput.Indicator fallback={<EyeOffIcon />}><EyeIcon /></PasswordInput.Indicator></PasswordInput.VisibilityTrigger></PasswordInput.Control>
          <button class="api-key-link" type="button" onClick={controller.openApiKeys}>获取 {provider().label} API Key <ExternalLinkIcon aria-hidden="true" /></button>
        </PasswordInput.Root>
        <Field.Root class="field-root"><Field.Label class="field-label">模型名称</Field.Label><input class="text-input" value={settings().model} onInput={(event) => controller.update('model', event.currentTarget.value)} placeholder={provider().defaultModel} /></Field.Root>
        <div class="connection-footer"><Show when={controller.status().message}><span class={`connection-status ${controller.status().kind}`} role={controller.status().kind === 'error' ? 'alert' : 'status'}>{controller.status().message}</span></Show><button class="save-button" type="button" onClick={() => void controller.testAndSave()} disabled={controller.status().kind === 'testing'}>{controller.status().kind === 'testing' ? '测试中…' : '测试并保存'}</button></div>
      </section>
      <section class="settings-section preferences" aria-labelledby="preferences-heading">
        <div class="section-heading"><Settings2Icon aria-hidden="true" /><div><h2 id="preferences-heading">显示偏好</h2><p>用开关快速调整 LeetCode 页面</p></div></div>
        <Switch.Root class="native-switch" checked={settings().theme === 'dark'} onCheckedChange={(details) => controller.changeTheme(details.checked)}><Switch.Control class="switch-control"><Switch.Thumb class="switch-thumb" /></Switch.Control><span><Switch.Label class="switch-label">深色模式</Switch.Label><span class="switch-description">打开后固定使用深色界面</span></span><Switch.HiddenInput /></Switch.Root>
        <Switch.Root class="native-switch" checked={settings().hideNativeLeet} onCheckedChange={(details) => controller.changeHideNativeLeet(details.checked)}><Switch.Control class="switch-control"><Switch.Thumb class="switch-thumb" /></Switch.Control><span><Switch.Label class="switch-label">隐藏原生 Leet 面板</Switch.Label><span class="switch-description">在 LeetCode 内仅显示 LeetCopilot</span></span><Switch.HiddenInput /></Switch.Root>
      </section>
      <footer class="popup-footer"><span>显示偏好会即时生效，API Key 测试成功后保存</span></footer>
    </div>
  </main>;
}
