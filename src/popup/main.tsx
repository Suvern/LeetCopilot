import { createSignal, Show } from 'solid-js';
import { render } from 'solid-js/web';
import { clearErrorLogs, DEFAULT_SETTINGS, getErrorLogs, getSettings, saveSettings } from '../shared/storage';
import { LeetLensLogo } from '../shared/Logo';
import type { ErrorLog, Provider } from '../shared/types';
import './style.css';

function Popup() {
  const [settings, setSettings] = createSignal(DEFAULT_SETTINGS); const [saved, setSaved] = createSignal(false);
  const [showApiKey, setShowApiKey] = createSignal(false); const [errorLogs, setErrorLogs] = createSignal<ErrorLog[]>([]);
  void getSettings().then(setSettings);
  const refreshErrorLogs = () => void getErrorLogs().then(setErrorLogs);
  void getErrorLogs().then(setErrorLogs);
  const update = (key: 'apiKey' | 'model' | 'theme' | 'hideNativeLeet', value: string | boolean) => {
    const current = settings();
    setSettings({ ...current, [key]: value, apiKeys: key === 'apiKey' ? { ...current.apiKeys, [current.provider]: value as string } : current.apiKeys });
  };
  const changeProvider = (provider: Provider) => {
    const current = settings();
    setShowApiKey(false); setSettings({ ...current, provider, apiKey: current.apiKeys[provider], model: provider === 'qwen' ? 'qwen-plus' : 'deepseek-v4-flash' });
  };
  const openApiKeys = () => void chrome.tabs.create({ url: settings().provider === 'qwen' ? 'https://platform.qianwenai.com/home/api-keys' : 'https://platform.deepseek.com/api_keys' });
  const save = async (event: SubmitEvent) => { event.preventDefault(); await saveSettings(settings()); setSaved(true); setTimeout(() => setSaved(false), 1800); };
  const providerLabel = () => settings().provider === 'qwen' ? '千问' : 'DeepSeek';
  const clearLogs = async () => { await clearErrorLogs(); setErrorLogs([]); };
  return <main class="popup"><header><LeetLensLogo class="brand-mark" /><div><h1>LeetLens</h1><p>你的中文 AI 解题工作台</p></div></header><form onSubmit={save}><label>AI 平台<select aria-label="AI 平台" value={settings().provider} onChange={(e) => changeProvider(e.currentTarget.value as Provider)}><option value="deepseek">DeepSeek</option><option value="qwen">千问</option></select></label><label>{providerLabel()} API Key<div class="key-row"><div class="key-input-row"><input aria-label={`${providerLabel()} API Key`} type={showApiKey() ? 'text' : 'password'} value={settings().apiKey} onInput={(e) => update('apiKey', e.currentTarget.value)} placeholder="请输入 API Key" autocomplete="off" /><button class="visibility-button" type="button" aria-label={showApiKey() ? '隐藏 API Key' : '显示 API Key'} aria-pressed={showApiKey()} onClick={() => setShowApiKey((visible) => !visible)}>{showApiKey() ? '隐藏' : '显示'}</button></div><button class="link-button" type="button" onClick={openApiKeys}>获取 API Key</button></div></label><label>模型名称<input value={settings().model} onInput={(e) => update('model', e.currentTarget.value)} /></label><label>页面主题<select value={settings().theme} onChange={(e) => update('theme', e.currentTarget.value)}><option value="auto">跟随 LeetCode</option><option value="light">浅色</option><option value="dark">深色</option></select></label><label class="setting-toggle"><input type="checkbox" checked={settings().hideNativeLeet} onChange={(e) => update('hideNativeLeet', e.currentTarget.checked)} /><span>隐藏原生 Leet 面板</span></label><button type="submit">保存设置</button><Show when={saved()}><span class="saved">设置已保存</span></Show></form><section class="logs" aria-label="错误日志"><div class="logs-header"><strong>错误日志</strong><div><button class="text-button" type="button" onClick={refreshErrorLogs}>刷新</button><button class="text-button" type="button" disabled={!errorLogs().length} onClick={() => void clearLogs()}>清空</button></div></div><Show when={errorLogs().length} fallback={<p class="logs-empty">暂无错误日志</p>}><div class="log-list">{errorLogs().map((log) => <article class="log-entry"><div><strong>{log.provider}</strong><time>{new Date(log.createdAt).toLocaleString()}</time></div><p>{log.message}</p></article>)}</div></Show></section><footer>设置保存在本地，仅用于当前浏览器中的 LeetLens。</footer></main>;
}
render(() => <Popup />, document.getElementById('root')!);
