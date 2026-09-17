import { LeetCopilotLogo } from '../../shared/Logo';

interface PanelHeaderProps {
  title: string;
  updateAvailable: boolean;
  latestVersion?: string;
  useChromeWebStore: boolean;
  onCollapse: () => void;
  onOpenRelease: () => void;
}

export function PanelHeader(props: PanelHeaderProps) {
  return <header class="panel-header">
    <div class="panel-header-main">
      <div class="active-tab"><LeetCopilotLogo class="logo" /><strong>LeetCopilot</strong></div>
      <span class="problem-title">{props.title}</span>
      <div class="header-actions"><button onClick={props.onCollapse} title="收起面板" aria-label="收起面板">&#x203A;</button></div>
    </div>
    {props.updateAvailable && <button class="update-card" type="button" onClick={props.onOpenRelease} title={props.latestVersion ? `发现 ${props.latestVersion}，点击查看更新页面` : '点击查看更新页面'}>
      <strong>发现新版本</strong>
      <span>{props.useChromeWebStore
        ? 'LeetCopilot 已上架 Chrome 插件商店，请移除本插件，然后从 Chrome 插件商店重新下载'
        : '请前往 GitHub 下载最新 Release，然后解压到插件现有目录，在 chrome://extensions/ 页面点击“更新”'}</span>
    </button>}
  </header>;
}
