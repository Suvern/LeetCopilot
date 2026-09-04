import { For, Show } from 'solid-js';
import { Collapsible } from '@ark-ui/solid/collapsible';
import { ChevronDownIcon } from 'lucide-solid';
import { PROVIDERS } from '../../shared/providers';
import type { PanelController } from '../panel-controller';
import { errorKindLabel } from '../view-helpers';

interface ErrorPanelProps {
  panel: PanelController;
}

export function ErrorPanel(props: ErrorPanelProps) {
  const panel = props.panel;
  return <Show when={panel.error()}>
    <Collapsible.Root class="error-area" open={panel.showErrorLogs()} onOpenChange={(details) => { panel.setShowErrorLogs(details.open); if (details.open) void panel.openErrorLogs(); }}>
      <div class="error" role="alert">
        <span>{panel.error()}</span>
        <div class="error-actions"><Collapsible.Trigger class="error-log-trigger">查看错误日志<Collapsible.Indicator><ChevronDownIcon /></Collapsible.Indicator></Collapsible.Trigger><button onClick={panel.clearError}>关闭</button></div>
      </div>
      <Collapsible.Content class="error-logs">
        <div class="error-logs-header"><strong>错误日志</strong><button onClick={() => panel.setShowErrorLogs(false)}>关闭</button></div>
        <Show when={panel.errorLogs().length} fallback={<p class="error-logs-empty">暂无错误日志</p>}>
          <For each={panel.errorLogs()}>{(log) => <article class="error-log">
            <div class="error-log-meta"><strong>{PROVIDERS[log.provider]?.label ?? log.provider}</strong><span>{errorKindLabel(log.kind)}{log.status ? ` · HTTP ${log.status}${log.statusText ? ` ${log.statusText}` : ''}` : ''}</span><time>{new Date(log.createdAt).toLocaleString()}</time></div>
            <p>{log.message}</p>
            <Show when={log.details}><pre>{log.details}</pre></Show>
            <Show when={log.endpoint || log.model || log.attempts !== undefined || log.timeoutMs}><dl class="error-log-diagnostics">
              <Show when={log.model}><div><dt>模型</dt><dd>{log.model}</dd></div></Show>
              <Show when={log.endpoint}><div><dt>端点</dt><dd>{log.endpoint}</dd></div></Show>
              <Show when={log.attempts !== undefined}><div><dt>尝试</dt><dd>{log.attempts}</dd></div></Show>
              <Show when={log.timeoutMs}><div><dt>首 token 超时</dt><dd>{log.timeoutMs} ms</dd></div></Show>
              <Show when={log.requestId}><div><dt>请求 ID</dt><dd>{log.requestId}</dd></div></Show>
            </dl></Show>
          </article>}</For>
        </Show>
      </Collapsible.Content>
    </Collapsible.Root>
  </Show>;
}
