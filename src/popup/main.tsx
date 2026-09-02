import { createSignal, Show } from 'solid-js';
import { render } from 'solid-js/web';
import { DEFAULT_SETTINGS, getSettings, saveSettings } from '../shared/storage';
import './style.css';

function Popup() {
  const [settings, setSettings] = createSignal(DEFAULT_SETTINGS); const [saved, setSaved] = createSignal(false);
  void getSettings().then(setSettings);
  const update = (key: 'apiKey' | 'model' | 'theme' | 'hideNativeLeet', value: string | boolean) => setSettings({ ...settings(), [key]: value });
  const save = async (event: SubmitEvent) => { event.preventDefault(); await saveSettings(settings()); setSaved(true); setTimeout(() => setSaved(false), 1800); };
  return <main class="popup"><header><div class="brand-mark">L</div><div><h1>LeetLens</h1><p>你的中文 AI 解题工作台</p></div></header><form onSubmit={save}><label>DeepSeek API Key<input type="password" value={settings().apiKey} onInput={(e) => update('apiKey', e.currentTarget.value)} placeholder="sk-..." autocomplete="off" /></label><label>模型名称<input value={settings().model} onInput={(e) => update('model', e.currentTarget.value)} /></label><label>页面主题<select value={settings().theme} onChange={(e) => update('theme', e.currentTarget.value)}><option value="auto">跟随 LeetCode</option><option value="light">浅色</option><option value="dark">深色</option></select></label><label class="setting-toggle"><input type="checkbox" checked={settings().hideNativeLeet} onChange={(e) => update('hideNativeLeet', e.currentTarget.checked)} /><span>隐藏原生 Leet 面板</span></label><button type="submit">保存设置</button><Show when={saved()}><span class="saved">设置已保存</span></Show></form><footer>设置保存在本地，仅用于当前浏览器中的 LeetLens。</footer></main>;
}
render(() => <Popup />, document.getElementById('root')!);
