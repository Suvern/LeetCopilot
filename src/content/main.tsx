import { createEffect, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { render } from 'solid-js/web';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { clearHistory, getHistory, getSettings, saveHistory } from '../shared/storage';
import { cleanText, extractCodeAction, normalizeLanguage, problemId } from '../shared/parse';
import type { CodeAction } from '../shared/parse';
import type { BackgroundEvent, ChatMessage, ProblemContext, Theme } from '../shared/types';
import './style.css';

const shortcuts = ['分析思路', '给出提示', '检查我的代码', '解释我的代码', '优化复杂度', '生成完整解法'];
const uid = () => crypto.randomUUID();
const markdown = (value: string) => DOMPurify.sanitize(marked.parse(value, { async: false }) as string);
const actionLabel = (action: CodeAction) => action.kind === 'full' ? '完整代码' : '局部更新';

function selectedText(selectors: string[]) {
  for (const selector of selectors) {
    const element = document.querySelector<HTMLElement>(selector);
    if (element?.innerText) return cleanText(element.innerText);
  }
  return '';
}

function extractContext(): ProblemContext {
  const workbench = (document.querySelector('#qd-content') ?? document.querySelector('main') ?? document.body).cloneNode(true) as HTMLElement;
  workbench.querySelector('#leetlens-root')?.remove();
  const heading = selectedText(['h1', '[data-cy="question-title"]']);
  const bodyText = cleanText(workbench.innerText).slice(0, 18000);
  const title = heading || document.title.replace(/[-|].*/, '').trim() || '当前题目';
  const difficulty = selectedText(['[diff="easy"]', '[diff="medium"]', '[diff="hard"]']) || (bodyText.match(/简单|中等|困难/)?.[0] ?? '未知');
  const languageLabel = [...document.querySelectorAll<HTMLElement>('button, [role="button"], [role="combobox"]')]
    .map((element) => cleanText(element.innerText || element.textContent))
    .find((value) => /^(C\+\+|C|Java|JavaScript|TypeScript|Python|Python3)$/.test(value))
    || selectedText(['[data-cy="lang-select"]', '.ant-select-selection-item'])
    || 'JavaScript';
  const editor = [...document.querySelectorAll<HTMLTextAreaElement>('textarea.inputarea, textarea')]
    .find((element) => element.value.trim() && element.offsetParent !== null)
    ?? document.querySelector<HTMLTextAreaElement>('[data-cy="code-area"]');
  return { id: problemId(), title, difficulty, description: bodyText, examples: '', constraints: '', tags: [], language: normalizeLanguage(languageLabel), code: editor?.value ?? '', url: location.href };
}

async function extractContextWithEditor(): Promise<ProblemContext> {
  const context = extractContext();
  try {
    const response = await chrome.runtime.sendMessage({ type: 'read-editor' });
    return response?.ok && typeof response.code === 'string' ? { ...context, code: response.code } : context;
  } catch {
    return context;
  }
}

function App() {
  const [context, setContext] = createSignal(extractContext());
  const [messages, setMessages] = createSignal<ChatMessage[]>([]);
  const [draft, setDraft] = createSignal('');
  const [open, setOpen] = createSignal(true);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal('');
  const [width, setWidth] = createSignal(408);
  const [theme, setTheme] = createSignal<Theme | 'auto'>('auto');
  const [hideNativeLeet, setHideNativeLeet] = createSignal(false);
  let requestId = '';
  let scrollArea!: HTMLDivElement;
  let nativeRestoreRequested = false;

  const refresh = async () => {
    const next = await extractContextWithEditor();
    setContext(next);
    setMessages(await getHistory(next.id));
    setError('');
  };
  const syncContext = async () => {
    const next = await extractContextWithEditor();
    if (next.id !== context().id) { void refresh(); return; }
    setContext(next);
  };
  const nativeSelectionPopups = () => [...document.querySelectorAll<HTMLElement>('[class*="z-50"]')].filter((element) => (element.innerText || '').includes('问下'));
  const closeNativeLeet = () => {
    const tab = document.querySelector<HTMLElement>('#ai-agent_tab');
    const tabset = tab?.closest('.flexlayout__tabset');
    const close = tabset?.querySelector<HTMLElement>('.flexlayout__tab_button_trailing[title="Close"], .flexlayout__tab_button_trailing');
    close?.click();
    tabset?.querySelector<HTMLElement>('.flexlayout__tabset_content')?.setAttribute('aria-hidden', 'true');
    nativeSelectionPopups().forEach((element) => { element.dataset.leetlensHidden = 'true'; element.hidden = true; element.style.display = 'none'; });
  };
  const showNativeLeet = () => {
    const control = document.querySelector<HTMLElement>('[aria-label="问下 Leet"]');
    const target = control?.closest('.ai-agent-guide') as HTMLElement | null;
    if (target) {
      delete target.dataset.leetlensHidden;
      target.hidden = false;
      target.style.display = '';
    }
    nativeSelectionPopups().forEach((element) => { if (element.dataset.leetlensHidden === 'true') { delete element.dataset.leetlensHidden; element.hidden = false; element.style.display = ''; } });
    if (!document.querySelector('#ai-agent_tab')) control?.click();
  };
  const syncNativeLeet = () => {
    const control = document.querySelector<HTMLElement>('[aria-label="问下 Leet"]');
    const target = control?.closest('.ai-agent-guide') as HTMLElement | null;
    if (target) {
      if (hideNativeLeet()) {
        target.dataset.leetlensHidden = 'true';
        target.hidden = true;
        target.style.display = 'none';
      } else if (target.dataset.leetlensHidden === 'true') {
        delete target.dataset.leetlensHidden;
        target.hidden = false;
        target.style.display = '';
      }
    }
    if (hideNativeLeet()) closeNativeLeet();
    else if (nativeRestoreRequested) {
      nativeRestoreRequested = false;
      showNativeLeet();
    }
  };

  onMount(() => {
    void refresh();
    void getSettings().then((settings) => { setTheme(settings.theme); setHideNativeLeet(settings.hideNativeLeet); }).catch(() => { setTheme('auto'); setHideNativeLeet(false); });
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area !== 'local' || !changes['leetlens:settings']) return;
      void getSettings().then((settings) => {
        if (settings.hideNativeLeet !== hideNativeLeet()) nativeRestoreRequested = !settings.hideNativeLeet;
        setTheme(settings.theme);
        setHideNativeLeet(settings.hideNativeLeet);
        setTimeout(syncNativeLeet, 0);
      });
    };
    chrome.storage.onChanged.addListener(storageListener);
    const listener = (data: BackgroundEvent) => {
      if (!data || data.requestId !== requestId) return;
      if (data.type === 'delta') setMessages((items) => items.map((item) => item.id === requestId ? { ...item, content: item.content + data.text } : item));
      if (data.type === 'done') setBusy(false);
      if (data.type === 'error') { setBusy(false); setMessages((items) => items.filter((item) => item.id !== requestId)); setError(data.message); }
    };
    chrome.runtime.onMessage.addListener(listener);
    let pending = false;
    const observer = new MutationObserver(() => {
      mountHost();
      syncNativeLeet();
      if (pending) return;
      pending = true;
      setTimeout(() => { pending = false; void syncContext(); }, 250);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    syncNativeLeet();
    const hydration = setTimeout(syncContext, 1200);
    const resizeObserver = new ResizeObserver(syncLayout);
    resizeObserver.observe(host);
    onCleanup(() => { chrome.runtime.onMessage.removeListener(listener); chrome.storage.onChanged.removeListener(storageListener); observer.disconnect(); resizeObserver.disconnect(); clearTimeout(hydration); });
  });

  createEffect(() => {
    const current = messages();
    if (context().id && current.length) void saveHistory(context().id, current);
    queueMicrotask(() => scrollArea?.scrollTo({ top: scrollArea.scrollHeight, behavior: 'smooth' }));
  });
  createEffect(() => {
    const host = document.getElementById('leetlens-root');
    if (host) { host.style.width = open() ? `${width()}px` : '44px'; syncLayout(); }
  });

  const send = async (text = draft()) => {
    const value = text.trim();
    if (!value || busy()) return;
    const settings = await getSettings();
    if (!settings.apiKey.trim()) { setError('尚未设置 DeepSeek API Key。请点击浏览器工具栏中的 LeetLens 图标完成设置。'); return; }
    setError('');
    requestId = uid();
    const currentMessages = messages();
    const user: ChatMessage = { id: uid(), role: 'user', content: value, createdAt: Date.now() };
    const assistant: ChatMessage = { id: requestId, role: 'assistant', content: '', createdAt: Date.now() };
    setMessages([...currentMessages, user, assistant]);
    setDraft('');
    setBusy(true);
    try {
      const problem = await extractContextWithEditor();
      setContext(problem);
      await chrome.runtime.sendMessage({ type: 'chat', requestId, problem, messages: [...currentMessages, user] });
    }
    catch (sendError) { setBusy(false); setMessages((items) => items.filter((item) => item.id !== requestId)); setError(sendError instanceof Error ? sendError.message : '请求失败，请重试。'); }
  };
  const cancel = () => { if (!busy()) return; chrome.runtime.sendMessage({ type: 'cancel', requestId }); setMessages((items) => items.filter((item) => item.id !== requestId)); setBusy(false); };
  const applyCode = async (action: ReturnType<typeof extractCodeAction>) => {
    if (!action) { setError('这段回答没有可安全应用的代码。局部代码必须带有 diff 行号。'); return; }
    try {
      const response = await chrome.runtime.sendMessage({ type: 'apply-code', code: action.code, ...(action.kind === 'patch' ? { startLine: action.startLine, endLine: action.endLine } : {}) });
      if (!response?.ok) { setError(response?.error ?? '无法更新代码编辑器。'); return; }
      setError('');
      syncContext();
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : '无法更新代码编辑器。');
    }
  };
  const resize = (event: MouseEvent) => { event.preventDefault(); const startX = event.clientX; const startWidth = width(); const move = (moveEvent: MouseEvent) => setWidth(Math.max(340, Math.min(620, startWidth + startX - moveEvent.clientX))); const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); }; document.addEventListener('mousemove', move); document.addEventListener('mouseup', up); };
  const copy = async (text: string) => { await navigator.clipboard.writeText(text); };
  const reset = async () => { setMessages([]); setDraft(''); await clearHistory(context().id); };

  return <aside class={`leetlens ${open() ? 'is-open' : 'is-collapsed'}`} data-theme={theme()} style={{ width: open() ? `${width()}px` : undefined }} data-testid="leetlens-panel">
    <div class="panel-content" aria-hidden={!open()}>
      <div class="resize" onMouseDown={resize} />
      <header class="panel-header"><div class="identity"><div class="logo">L</div><div><strong>LeetLens</strong><span>{context().title}</span></div></div><div class="header-actions"><button onClick={() => void reset()} title="新建对话" aria-label="新建对话">+</button><button onClick={() => setOpen(false)} title="收起面板" aria-label="收起面板">&#x203A;</button></div></header>
      <div class="shortcut-row"><For each={shortcuts}>{(item) => <button disabled={busy()} onClick={() => void send(item)}>{item}</button>}</For></div>
      <div class="conversation" ref={scrollArea!}><Show when={!messages().length}><div class="empty"><div class="empty-icon">L</div><h2>从这道题开始</h2><p>我已读取题目与当前编辑器语言。你可以提问，或选择上方操作。</p></div></Show><For each={messages()}>{(message) => { const action = () => extractCodeAction(message.content); return <article class={`message ${message.role}`}><div class="message-label">{message.role === 'user' ? '你' : 'LeetLens'}</div><Show when={message.role === 'assistant'} fallback={<p>{message.content}</p>}><div class="answer" innerHTML={markdown(message.content || (busy() ? '正在思考...' : ''))} /><Show when={action()}>{(currentAction) => <div class="code-actions"><span class="code-kind">{actionLabel(currentAction())}</span><button onClick={() => void applyCode(currentAction())}>应用代码</button></div>}</Show><button class="copy" onClick={() => void copy(message.content)} title="复制回答">复制</button></Show></article>; }}</For></div>
      <Show when={error()}><div class="error"><span>{error()}</span><button onClick={() => setError('')}>关闭</button></div></Show>
      <form class="composer" onSubmit={(event) => { event.preventDefault(); void send(); }}><textarea value={draft()} onInput={(event) => setDraft(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="询问题目思路、检查代码或要求完整解法..." rows="3" disabled={busy()} /><div><span>{busy() ? '正在生成' : 'Enter 发送'}</span><button type="button" class="clear" disabled={!messages().length || busy()} onClick={() => void reset()} title="清空当前对话" aria-label="清空当前对话">清空</button><Show when={busy()} fallback={<button type="submit" disabled={!draft().trim()}>发送</button>}><button type="button" class="stop" onClick={cancel}>停止</button></Show></div></form>
    </div>
    <Show when={!open()}><button class="reopen" onClick={() => setOpen(true)} title="打开 LeetLens" aria-label="打开 LeetLens">AI</button></Show>
  </aside>;
}

const host = document.createElement('div');
host.id = 'leetlens-root';
const mountHost = () => {
  const layout = document.querySelector<HTMLElement>('#qd-content');
  if (layout && host.parentElement !== layout) layout.append(host);
};
const syncLayout = () => {
  const layout = host.parentElement as HTMLElement | null;
  const workbench = layout?.querySelector<HTMLElement>(':scope > .flexlayout__layout');
  if (!layout || !workbench) return;
  const sidebarWidth = host.offsetWidth || 408;
  layout.style.position = 'relative';
  workbench.style.position = 'absolute';
  workbench.style.top = '0'; workbench.style.left = '0'; workbench.style.bottom = '0'; workbench.style.right = `${sidebarWidth}px`; workbench.style.width = 'auto';
  host.style.position = 'absolute'; host.style.top = '0'; host.style.right = '0'; host.style.bottom = '0'; host.style.height = '100%';
};
mountHost();
if (!host.parentElement) document.documentElement.append(host);
syncLayout();
render(() => <App />, host);
