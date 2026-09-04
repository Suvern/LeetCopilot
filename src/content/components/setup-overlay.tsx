import { KeyRoundIcon } from 'lucide-solid';

export function SetupOverlay() {
  return <div class="setup-overlay" role="dialog" aria-modal="true" aria-labelledby="setup-title">
    <div class="setup-dialog">
      <KeyRoundIcon class="setup-icon" aria-hidden="true" />
      <h2 id="setup-title">先连接 AI 平台</h2>
      <p>请先在浏览器工具栏打开 LeetCopilot，填写至少一个平台的 API Key。验证成功后即可开始使用。</p>
      <div class="setup-hint">API Key 仅保存在本地扩展存储中</div>
    </div>
  </div>;
}
