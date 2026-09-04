import { Show } from 'solid-js';
import type { PanelController } from '../panel-controller';

interface ComposerProps {
  panel: PanelController;
}

export function Composer(props: ComposerProps) {
  const panel = props.panel;
  return <form class="composer" onSubmit={(event) => { event.preventDefault(); void panel.send(); }}>
    <textarea value={panel.draft()} onInput={(event) => panel.setDraft(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void panel.send(); } }} placeholder="询问题目思路、检查代码或要求完整解法..." rows="3" disabled={panel.busy()} />
    <div>
      <Show when={panel.busy()}><span>正在生成</span></Show>
      <button type="button" class="new-conversation" disabled={panel.busy()} onClick={() => void panel.reset()}>新建对话</button>
      <button type="button" class="clear" disabled={!panel.messages().length && !panel.error()} onClick={() => void panel.reset()} title="清空当前对话与错误消息 (Ctrl + C)" aria-label="清空当前对话与错误消息" aria-keyshortcuts="Control+C">清空 (Ctrl + C)</button>
      <Show when={panel.busy()} fallback={<button type="submit" disabled={!panel.draft().trim()} aria-keyshortcuts="Enter">发送 (Enter)</button>}>
        <button type="button" class="stop" onClick={panel.cancel}>停止</button>
      </Show>
    </div>
  </form>;
}
