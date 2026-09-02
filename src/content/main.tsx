import { createEffect, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { render } from 'solid-js/web';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { clearHistory, getHistory, getSettings, saveHistory } from '../shared/storage';
import { cleanText, normalizeLanguage, problemId } from '../shared/parse';
import type { BackgroundEvent, ChatMessage, ProblemContext } from '../shared/types';
import './style.css';

const shortcuts = ['分析思路', '给出提示', '检查我的代码', '解释我的代码', '优化复杂度', '生成完整解法'];
const uid = () => crypto.randomUUID();
const markdown = (value: string) => DOMPurify.sanitize(marked.parse(value, { async: false }) as string);

function selectedText(selectors: string[]) { for (const selector of selectors) { const element = document.querySelector<HTMLElement>(selector); if (element?.innerText) return cleanText(element.innerText); } return ''; }
function extractContext(): ProblemContext {
  const main = document.querySelector('main') ?? document.body;
  const heading = selectedText(['h1', '[data-cy="question-title"]']);
  const bodyText = cleanText(main.innerText).slice(0, 18000);
  const title = heading || document.title.replace(/[-|].*/, '').trim() || '当前题目';
  const difficulty = selectedText(['[diff="easy"]', '[diff="medium"]', '[diff="hard"]']) || (bodyText.match(/简单|中等|困难/)?.[0] ?? '未知');
  const languageLabel = [...document.querySelectorAll<HTMLElement>('button, [role="button"], [role="combobox"]')].map((element) => cleanText(element.innerText || element.textContent)).find((value) => /^(C\+\+|C|Java|JavaScript|Python|Python3)$/.test(value)) || selectedText(['[data-cy="lang-select"]', '.ant-select-selection-item']) || 'JavaScript';
  const editor = [...document.querySelectorAll<HTMLTextAreaElement>('textarea.inputarea, textarea')].find((element) => element.value.trim() && element.offsetParent !== null) ?? document.querySelector<HTMLTextAreaElement>('[data-cy="code-area"]');
  const code = editor?.value ?? '';
  return { id: problemId(), title, difficulty, description: bodyText, examples: '', constraints: '', tags: [], language: normalizeLanguage(languageLabel), code, url: location.href };
}

function App() {
  const [context, setContext] = createSignal(extractContext());
  const [messages, setMessages] = createSignal<ChatMessage[]>([]);
  const [draft, setDraft] = createSignal(''); const [open, setOpen] = createSignal(true); const [busy, setBusy] = createSignal(false); const [error, setError] = createSignal(''); const [width, setWidth] = createSignal(408);
  let requestId = ''; let scrollArea!: HTMLDivElement;
  const refresh = async () => { const next = extractContext(); setContext(next); setMessages(await getHistory(next.id)); setError(''); };
  const syncContext = () => { const next = extractContext(); if (next.id !== context().id) { void refresh(); return; } setContext(next); };
  onMount(() => { void refresh(); const listener = (data: BackgroundEvent) => { if (!data || data.requestId !== requestId) return; if (data.type === 'delta') setMessages((items) => items.map((item) => item.id === requestId ? { ...item, content: item.content + data.text } : item)); if (data.type === 'done') setBusy(false); if (data.type === 'error') { setBusy(false); setMessages((items) => items.filter((item) => item.id !== requestId)); setError(data.message); } }; chrome.runtime.onMessage.addListener(listener); let pending = false; const observer = new MutationObserver(() => { if (pending) return; pending = true; setTimeout(() => { pending = false; syncContext(); }, 250); }); observer.observe(document.body, { childList: true, subtree: true }); const hydration = setTimeout(syncContext, 1200); onCleanup(() => { chrome.runtime.onMessage.removeListener(listener); observer.disconnect(); clearTimeout(hydration); }); });
  createEffect(() => { const current = messages(); if (context().id && current.length) void saveHistory(context().id, current); queueMicrotask(() => scrollArea?.scrollTo({ top: scrollArea.scrollHeight, behavior: 'smooth' })); });
  const send = async (text = draft()) => { const value = text.trim(); if (!value || busy()) return; const settings = await getSettings(); if (!settings.apiKey.trim()) { setError('尚未设置 DeepSeek API Key。请点击浏览器工具栏中的 LeetLens 图标完成设置。'); return; } setError(''); requestId = uid(); const user: ChatMessage = { id: uid(), role: 'user', content: value, createdAt: Date.now() }; const assistant: ChatMessage = { id: requestId, role: 'assistant', content: '', createdAt: Date.now() }; setMessages((items) => [...items, user, assistant]); setDraft(''); setBusy(true); chrome.runtime.sendMessage({ type: 'chat', requestId, problem: extractContext(), messages: [...messages(), user] }); };
  const cancel = () => { if (busy()) chrome.runtime.sendMessage({ type: 'cancel', requestId }); setBusy(false); };
  const resize = (event: MouseEvent) => { event.preventDefault(); const startX = event.clientX; const startWidth = width(); const move = (moveEvent: MouseEvent) => setWidth(Math.max(340, Math.min(620, startWidth + startX - moveEvent.clientX))); const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); }; document.addEventListener('mousemove', move); document.addEventListener('mouseup', up); };
  const copy = async (text: string) => { await navigator.clipboard.writeText(text); };
  const reset = async () => { setMessages([]); await clearHistory(context().id); };
  return <aside class={`leetlens ${open() ? 'is-open' : 'is-collapsed'}`} style={{ width: open() ? `${width()}px` : undefined }} data-testid="leetlens-panel"><Show when={open()} fallback={<button class="reopen" onClick={() => setOpen(true)} title="打开 LeetLens" aria-label="打开 LeetLens">AI</button>}><div class="resize" onMouseDown={resize} /><header class="panel-header"><div class="identity"><div class="logo">L</div><div><strong>LeetLens</strong><span>{context().title}</span></div></div><div class="header-actions"><button onClick={() => void reset()} title="新建对话" aria-label="新建对话">+</button><button onClick={() => setOpen(false)} title="收起面板" aria-label="收起面板">&#x203A;</button></div></header><section class="meta"><span>{context().difficulty}</span><span>{context().language}</span><span>DeepSeek</span></section><div class="shortcut-row"><For each={shortcuts}>{(item) => <button disabled={busy()} onClick={() => void send(item)}>{item}</button>}</For></div><div class="conversation" ref={scrollArea!}><Show when={!messages().length}><div class="empty"><div class="empty-icon">L</div><h2>从这道题开始</h2><p>我已读取题目与当前编辑器语言。你可以提问，或选择上方操作。</p></div></Show><For each={messages()}>{(message) => <article class={`message ${message.role}`}><div class="message-label">{message.role === 'user' ? '你' : 'LeetLens'}</div><Show when={message.role === 'assistant'} fallback={<p>{message.content}</p>}><div class="answer" innerHTML={markdown(message.content || (busy() ? '正在思考...' : ''))} /><button class="copy" onClick={() => void copy(message.content)} title="复制回答">复制</button></Show></article>}</For></div><Show when={error()}><div class="error"><span>{error()}</span><button onClick={() => setError('')}>关闭</button></div></Show><form class="composer" onSubmit={(event) => { event.preventDefault(); void send(); }}><textarea value={draft()} onInput={(event) => setDraft(event.currentTarget.value)} placeholder="询问题目思路、检查代码或要求完整解法..." rows="3" disabled={busy()} /><div><span>{busy() ? '正在生成' : 'Enter 发送'}</span><Show when={busy()} fallback={<button type="submit" disabled={!draft().trim()}>发送</button>}><button type="button" class="stop" onClick={cancel}>停止</button></Show></div></form></Show></aside>;
}

const host = document.createElement('div'); host.id = 'leetlens-root'; document.documentElement.append(host); render(() => <App />, host);
