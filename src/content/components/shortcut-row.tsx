import { For } from 'solid-js';
import { shortcuts } from '../../shared/prompt';

interface ShortcutRowProps {
  busy: boolean;
  onSend: (text: string) => void;
}

export function ShortcutRow(props: ShortcutRowProps) {
  return <div class="shortcut-row"><For each={shortcuts}>{(item) => <button disabled={props.busy} onClick={() => props.onSend(item)}>{item}</button>}</For></div>;
}
