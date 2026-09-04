import { For, Show } from 'solid-js';
import { extractCodeAction } from '../../shared/parse';
import { LeetCopilotLogo } from '../../shared/Logo';
import type { ChatMessage } from '../../shared/domain';
import type { PanelController } from '../panel-controller';
import { actionLabel, markdown } from '../view-helpers';
import { ErrorPanel } from './error-panel';

interface MessageListProps {
  panel: PanelController;
}

export function MessageList(props: MessageListProps) {
  const panel = props.panel;
  const renderMessage = (message: ChatMessage) => {
    const action = () => extractCodeAction(message.content);
    return <article class={`message ${message.role}`}>
      <div class="message-label">{message.role === 'user' ? '你' : 'LeetCopilot'}</div>
      <Show when={message.role === 'assistant'} fallback={<p>{message.content}</p>}>
        <div class="answer" innerHTML={markdown(message.content || (panel.busy() ? '正在思考...' : ''))} />
        <Show when={action()}>{(currentAction) => <div class="code-actions"><span class="code-kind">{actionLabel(currentAction())}</span><button onClick={() => void panel.applyCode(currentAction())}>应用代码</button></div>}</Show>
        <button class="copy" onClick={() => void panel.copy(message.content)} title="复制回答">复制</button>
      </Show>
    </article>;
  };

  return <div class="conversation" ref={panel.setScrollArea} onScroll={panel.onConversationScroll}>
    <Show when={!panel.messages().length}><div class="empty"><LeetCopilotLogo class="empty-icon" /><h2>从这道题开始</h2><p>我已读取题目与当前编辑器语言。你可以提问，或选择上方操作。</p></div></Show>
    <For each={panel.messages()}>{renderMessage}</For>
    <ErrorPanel panel={panel} />
  </div>;
}
