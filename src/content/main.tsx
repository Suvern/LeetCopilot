import { batch, createEffect, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { Collapsible } from '@ark-ui/solid/collapsible';
import { ChevronDownIcon, KeyRoundIcon } from 'lucide-solid';
import { render } from 'solid-js/web';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { clearErrorLogs, clearHistory, getErrorLogs, getHistory, getSettings, saveHistory } from '../shared/storage';
import { cleanText, extractCodeAction, normalizeLanguage, problemId } from '../shared/parse';
import { LeetCopilotLogo } from '../shared/Logo';
import { PROVIDERS } from '../shared/providers';
import type { CodeAction } from '../shared/parse';
import { shortcuts } from '../shared/prompt';
import type { BackgroundEvent, ChatMessage, ErrorLog, ProblemContext, Theme } from '../shared/types';
import './style.css';

const uid = () => crypto.randomUUID();
const markdown = (value: string) => DOMPurify.sanitize(marked.parse(value, { async: false }) as string);
const actionLabel = (action: CodeAction) => action.kind === 'full' ? '完整代码' : '局部更新';
const errorKindLabel = (kind: ErrorLog['kind']) => ({ configuration: '配置错误', timeout: '首 token 超时', http: 'HTTP 错误', network: '网络错误', stream: '流响应错误', unknown: '未知错误' }[kind ?? 'unknown']);

function selectedText(selectors: string[]) {
  for (const selector of selectors) {
    const element = document.querySelector<HTMLElement>(selector);
    if (element?.innerText) return cleanText(element.innerText);
  }
  return '';
}

function extractContext(): ProblemContext {
  const workbench = (document.querySelector('#qd-content') ?? document.querySelector('main') ?? document.body).cloneNode(true) as HTMLElement;
  workbench.querySelector('#leetcopilot-root')?.remove();
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
  const [errorLogs, setErrorLogs] = createSignal<ErrorLog[]>([]);
  const [errorLogId, setErrorLogId] = createSignal<string>();
  const [showErrorLogs, setShowErrorLogs] = createSignal(false);
  const [receivedToken, setReceivedToken] = createSignal(false);
  const [width, setWidth] = createSignal(408);
  const [theme, setTheme] = createSignal<Theme | 'auto'>('auto');
  const [hideNativeLeet, setHideNativeLeet] = createSignal(false);
  const [hasApiKey, setHasApiKey] = createSignal(false);
  let requestId = '';
  let scrollArea!: HTMLDivElement;
  let stickToBottom = true;
  let nativeRestoreRequested = false;

  let contextLoadId = 0;
  const refresh = async () => {
    const loadId = ++contextLoadId;
    const initialContext = extractContext();
    if (initialContext.id !== context().id) {
      if (busy() && requestId) void chrome.runtime.sendMessage({ type: 'cancel', requestId });
      requestId = '';
      batch(() => {
        setContext(initialContext);
        setMessages([]);
        setDraft('');
        setBusy(false);
        setError('');
        setErrorLogs([]);
        setErrorLogId();
        setShowErrorLogs(false);
        setReceivedToken(false);
      });
      stickToBottom = true;
    }
    const next = await extractContextWithEditor();
    const history = await getHistory(next.id);
    if (loadId !== contextLoadId) return;
    batch(() => {
      setContext(next);
      setMessages(history);
      setError('');
      setErrorLogs([]);
      setErrorLogId();
      setShowErrorLogs(false);
      setReceivedToken(false);
    });
  };
  const syncContext = async () => {
    if (extractContext().id !== context().id) { void refresh(); return; }
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
    nativeSelectionPopups().forEach((element) => { element.dataset.leetcopilotHidden = 'true'; element.hidden = true; element.style.display = 'none'; });
  };
  const showNativeLeet = () => {
    const control = document.querySelector<HTMLElement>('[aria-label="问下 Leet"]');
    const target = control?.closest('.ai-agent-guide') as HTMLElement | null;
    if (target) {
      delete target.dataset.leetcopilotHidden;
      target.hidden = false;
      target.style.display = '';
    }
    nativeSelectionPopups().forEach((element) => { if (element.dataset.leetcopilotHidden === 'true') { delete element.dataset.leetcopilotHidden; element.hidden = false; element.style.display = ''; } });
    if (!document.querySelector('#ai-agent_tab')) control?.click();
  };
  const syncNativeLeet = () => {
    const control = document.querySelector<HTMLElement>('[aria-label="问下 Leet"]');
    const target = control?.closest('.ai-agent-guide') as HTMLElement | null;
    if (target) {
      if (hideNativeLeet()) {
        target.dataset.leetcopilotHidden = 'true';
        target.hidden = true;
        target.style.display = 'none';
      } else if (target.dataset.leetcopilotHidden === 'true') {
        delete target.dataset.leetcopilotHidden;
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
    void getSettings().then((settings) => { setHasApiKey(Object.values(settings.apiKeys).some((key) => key.trim())); setTheme(settings.theme); setHideNativeLeet(settings.hideNativeLeet); }).catch(() => { setHasApiKey(false); setTheme('auto'); setHideNativeLeet(false); });
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area !== 'local' || !changes['leet-copilot:settings']) return;
      void getSettings().then((settings) => {
        setHasApiKey(Object.values(settings.apiKeys).some((key) => key.trim()));
        if (settings.hideNativeLeet !== hideNativeLeet()) nativeRestoreRequested = !settings.hideNativeLeet;
        setTheme(settings.theme);
        setHideNativeLeet(settings.hideNativeLeet);
        setTimeout(syncNativeLeet, 0);
      });
    };
    chrome.storage.onChanged.addListener(storageListener);
    document.addEventListener('keydown', clearShortcut, true);
    const listener = (data: BackgroundEvent) => {
      if (!data || data.requestId !== requestId) return;
      if (data.type === 'delta') { setReceivedToken(true); setMessages((items) => items.map((item) => item.id === requestId ? { ...item, content: item.content + data.text } : item)); }
      if (data.type === 'done') setBusy(false);
      if (data.type === 'error') { setBusy(false); setMessages((items) => items.filter((item) => item.id !== requestId)); setErrorLogId(data.errorLogId); setError(data.message); }
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
    onCleanup(() => { chrome.runtime.onMessage.removeListener(listener); chrome.storage.onChanged.removeListener(storageListener); document.removeEventListener('keydown', clearShortcut, true); observer.disconnect(); resizeObserver.disconnect(); clearTimeout(hydration); });
  });

  createEffect(() => {
    const current = messages();
    if (context().id && current.length) void saveHistory(context().id, current);
    if (stickToBottom) queueMicrotask(() => scrollArea?.scrollTo({ top: scrollArea.scrollHeight, behavior: 'smooth' }));
  });
  createEffect(() => {
    const host = document.getElementById('leetcopilot-root');
    if (host) { host.style.width = open() ? `${width()}px` : '44px'; syncLayout(); }
  });

  const send = async (text = draft()) => {
    const value = text.trim();
    if (!value || busy()) return;
    const settings = await getSettings();
    if (!settings.apiKey.trim()) { setError(`尚未设置${settings.provider === 'qwen' ? '千问' : 'DeepSeek'} API Key。请点击浏览器工具栏中的 LeetCopilot 图标完成设置。`); return; }
    setError('');
    setErrorLogs([]);
    setErrorLogId();
    setShowErrorLogs(false);
    setReceivedToken(false);
    stickToBottom = true;
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
  const reset = async () => {
    const activeRequestId = requestId;
    if (busy() && activeRequestId) void chrome.runtime.sendMessage({ type: 'cancel', requestId: activeRequestId });
    requestId = '';
    batch(() => {
      setMessages([]);
      setDraft('');
      setBusy(false);
      setError('');
      setErrorLogs([]);
      setErrorLogId();
      setShowErrorLogs(false);
      setReceivedToken(false);
    });
    await Promise.all([clearHistory(context().id), clearErrorLogs()]);
  };
  const clearShortcut = (event: KeyboardEvent) => {
    if ((!event.ctrlKey && !event.metaKey) || event.key.toLowerCase() !== 'c') return;
    const targetInPanel = event.target instanceof Node && host.contains(event.target);
    const panelHasFocus = host.matches(':focus-within');
    if (!targetInPanel && !panelHasFocus) return;
    event.preventDefault();
    void reset();
  };
  const openErrorLogs = async () => {
    const logs = await getErrorLogs();
    setErrorLogs(errorLogId() ? logs.filter((log) => log.id === errorLogId()) : logs.filter((log) => log.requestId === requestId));
    setShowErrorLogs(true);
  };

  return <aside tabIndex={-1} class={`leetcopilot ${open() ? 'is-open' : 'is-collapsed'} ${busy() && !receivedToken() ? 'is-streaming' : ''}`} data-theme={theme()} style={{ width: open() ? `${width()}px` : undefined }} data-testid="leetcopilot-panel">
    <div class="leetcopilot-tabset">
    <div class="panel-content" aria-hidden={!open()}>
      <div class="resize" onMouseDown={resize} />
      <header class="panel-header"><div class="active-tab"><LeetCopilotLogo class="logo" /><strong>LeetCopilot</strong></div><span class="problem-title">{context().title}</span><div class="header-actions"><button onClick={() => setOpen(false)} title="收起面板" aria-label="收起面板">&#x203A;</button></div></header>
      <div class="shortcut-row"><For each={shortcuts}>{(item) => <button disabled={busy()} onClick={() => void send(item)}>{item}</button>}</For></div>
      <div class="conversation" ref={scrollArea!} onScroll={(event) => { const target = event.currentTarget; stickToBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 32; }}><Show when={!messages().length}><div class="empty"><LeetCopilotLogo class="empty-icon" /><h2>从这道题开始</h2><p>我已读取题目与当前编辑器语言。你可以提问，或选择上方操作。</p></div></Show><For each={messages()}>{(message) => { const action = () => extractCodeAction(message.content); return <article class={`message ${message.role}`}><div class="message-label">{message.role === 'user' ? '你' : 'LeetCopilot'}</div><Show when={message.role === 'assistant'} fallback={<p>{message.content}</p>}><div class="answer" innerHTML={markdown(message.content || (busy() ? '正在思考...' : ''))} /><Show when={action()}>{(currentAction) => <div class="code-actions"><span class="code-kind">{actionLabel(currentAction())}</span><button onClick={() => void applyCode(currentAction())}>应用代码</button></div>}</Show><button class="copy" onClick={() => void copy(message.content)} title="复制回答">复制</button></Show></article>; }}</For><Show when={error()}><Collapsible.Root class="error-area" open={showErrorLogs()} onOpenChange={(details) => { setShowErrorLogs(details.open); if (details.open) void openErrorLogs(); }}><div class="error" role="alert"><span>{error()}</span><div class="error-actions"><Collapsible.Trigger class="error-log-trigger">查看错误日志<Collapsible.Indicator><ChevronDownIcon /></Collapsible.Indicator></Collapsible.Trigger><button onClick={() => { setError(''); setShowErrorLogs(false); }}>关闭</button></div></div><Collapsible.Content class="error-logs"><div class="error-logs-header"><strong>错误日志</strong><button onClick={() => setShowErrorLogs(false)}>关闭</button></div><Show when={errorLogs().length} fallback={<p class="error-logs-empty">暂无错误日志</p>}><For each={errorLogs()}>{(log) => <article class="error-log"><div class="error-log-meta"><strong>{PROVIDERS[log.provider]?.label ?? log.provider}</strong><span>{errorKindLabel(log.kind)}{log.status ? ` · HTTP ${log.status}${log.statusText ? ` ${log.statusText}` : ''}` : ''}</span><time>{new Date(log.createdAt).toLocaleString()}</time></div><p>{log.message}</p><Show when={log.details}><pre>{log.details}</pre></Show><Show when={log.endpoint || log.model || log.attempts !== undefined || log.timeoutMs}><dl class="error-log-diagnostics"><Show when={log.model}><div><dt>模型</dt><dd>{log.model}</dd></div></Show><Show when={log.endpoint}><div><dt>端点</dt><dd>{log.endpoint}</dd></div></Show><Show when={log.attempts !== undefined}><div><dt>尝试</dt><dd>{log.attempts}</dd></div></Show><Show when={log.timeoutMs}><div><dt>首 token 超时</dt><dd>{log.timeoutMs} ms</dd></div></Show><Show when={log.requestId}><div><dt>请求 ID</dt><dd>{log.requestId}</dd></div></Show></dl></Show></article>}</For></Show></Collapsible.Content></Collapsible.Root></Show></div>
      <form class="composer" onSubmit={(event) => { event.preventDefault(); void send(); }}><textarea value={draft()} onInput={(event) => setDraft(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="询问题目思路、检查代码或要求完整解法..." rows="3" disabled={busy()} /><div><Show when={busy()}><span>正在生成</span></Show><button type="button" class="new-conversation" disabled={busy()} onClick={() => void reset()}>新建对话</button><button type="button" class="clear" disabled={!messages().length && !error()} onClick={() => void reset()} title="清空当前对话与错误消息 (Ctrl + C)" aria-label="清空当前对话与错误消息" aria-keyshortcuts="Control+C">清空 (Ctrl + C)</button><Show when={busy()} fallback={<button type="submit" disabled={!draft().trim()} aria-keyshortcuts="Enter">发送 (Enter)</button>}><button type="button" class="stop" onClick={cancel}>停止</button></Show></div></form>
      <Show when={!hasApiKey()}><div class="setup-overlay" role="dialog" aria-modal="true" aria-labelledby="setup-title"><div class="setup-dialog"><KeyRoundIcon class="setup-icon" aria-hidden="true" /><h2 id="setup-title">先连接 AI 平台</h2><p>请先在浏览器工具栏打开 LeetCopilot，填写至少一个平台的 API Key。验证成功后即可开始使用。</p><div class="setup-hint">API Key 仅保存在本地扩展存储中</div></div></div></Show>
    </div>
    <Show when={!open()}><button class="reopen" onClick={() => setOpen(true)} title="打开 LeetCopilot" aria-label="打开 LeetCopilot"><LeetCopilotLogo class="reopen-logo" /></button></Show>
    </div>
  </aside>;
}

const host = document.createElement('div');
host.id = 'leetcopilot-root';
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
