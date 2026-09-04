import { LeetCopilotLogo } from '../../shared/Logo';

interface PanelHeaderProps {
  title: string;
  onCollapse: () => void;
}

export function PanelHeader(props: PanelHeaderProps) {
  return <header class="panel-header">
    <div class="active-tab"><LeetCopilotLogo class="logo" /><strong>LeetCopilot</strong></div>
    <span class="problem-title">{props.title}</span>
    <div class="header-actions"><button onClick={props.onCollapse} title="收起面板" aria-label="收起面板">&#x203A;</button></div>
  </header>;
}
