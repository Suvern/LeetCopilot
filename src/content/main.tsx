import { Show } from 'solid-js';
import { render } from 'solid-js/web';
import { LeetCopilotLogo } from '../shared/Logo';
import { createPanelController } from './panel-controller';
import { Composer } from './components/composer';
import { MessageList } from './components/message-list';
import { PanelHeader } from './components/panel-header';
import { SetupOverlay } from './components/setup-overlay';
import { ShortcutRow } from './components/shortcut-row';
import { host } from './layout';
import './style.css';

function App() {
  const panel = createPanelController();

  return <aside tabIndex={-1} class={`leetcopilot ${panel.open() ? 'is-open' : 'is-collapsed'} ${panel.busy() && !panel.receivedToken() ? 'is-streaming' : ''}`} data-theme={panel.theme()} style={{ width: panel.open() ? `${panel.width()}px` : undefined }} data-testid="leetcopilot-panel">
    <div class="leetcopilot-tabset">
      <div class="panel-content" aria-hidden={!panel.open()}>
        <div class="resize" onMouseDown={panel.resize} />
        <PanelHeader title={panel.context().title} onCollapse={() => panel.setOpen(false)} />
        <ShortcutRow busy={panel.busy()} onSend={(text) => void panel.send(text)} />
        <MessageList panel={panel} />
        <Composer panel={panel} />
        <Show when={!panel.hasApiKey()}><SetupOverlay /></Show>
      </div>
      <Show when={!panel.open()}><button class="reopen" onClick={() => panel.setOpen(true)} title="打开 LeetCopilot" aria-label="打开 LeetCopilot"><LeetCopilotLogo class="reopen-logo" /></button></Show>
    </div>
  </aside>;
}

render(() => <App />, host);
