import { batch, createEffect, createSignal, onCleanup, onMount, type Accessor } from 'solid-js';
import { clearErrorLogs, clearHistory, getErrorLogs, getHistory, getSettings, saveHistory } from '../shared/storage';
import { extractCodeAction } from '../shared/parse';
import type { BackgroundEvent } from '../shared/messages';
import type { ChatMessage, ErrorLog, ProblemContext, Theme } from '../shared/domain';
import { extractContext, extractContextWithEditor } from './context-extractor';
import { host, mountHost, syncLayout } from './layout';

export interface PanelController {
  context: Accessor<ProblemContext>;
  messages: Accessor<ChatMessage[]>;
  draft: Accessor<string>;
  open: Accessor<boolean>;
  busy: Accessor<boolean>;
  error: Accessor<string>;
  errorLogs: Accessor<ErrorLog[]>;
  errorLogId: Accessor<string | undefined>;
  showErrorLogs: Accessor<boolean>;
  receivedToken: Accessor<boolean>;
  width: Accessor<number>;
  theme: Accessor<Theme | 'auto'>;
  hasApiKey: Accessor<boolean>;
  setDraft: (value: string) => void;
  setOpen: (value: boolean) => void;
  setShowErrorLogs: (value: boolean) => void;
  clearError: () => void;
  refresh: () => Promise<void>;
  send: (text?: string) => Promise<void>;
  cancel: () => void;
  applyCode: (action: ReturnType<typeof extractCodeAction>) => Promise<void>;
  resize: (event: MouseEvent) => void;
  copy: (text: string) => Promise<void>;
  reset: () => Promise<void>;
  openErrorLogs: () => Promise<void>;
  onConversationScroll: (event: Event) => void;
  setScrollArea: (element: HTMLDivElement) => void;
}

const uid = () => crypto.randomUUID();

export function createPanelController(): PanelController {
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
  let scrollArea: HTMLDivElement | undefined;
  let stickToBottom = true;
  let nativeRestoreRequested = false;
  let contextLoadId = 0;

  const clearConversationState = () => {
    setMessages([]);
    setDraft('');
    setBusy(false);
    setError('');
    setErrorLogs([]);
    setErrorLogId();
    setShowErrorLogs(false);
    setReceivedToken(false);
  };

  const refresh = async () => {
    const loadId = ++contextLoadId;
    const initialContext = extractContext();
    if (initialContext.id !== context().id) {
      if (busy() && requestId) void chrome.runtime.sendMessage({ type: 'cancel', requestId });
      requestId = '';
      batch(clearConversationState);
      setContext(initialContext);
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
  const syncNativeLeet = (hide: boolean) => {
    const control = document.querySelector<HTMLElement>('[aria-label="问下 Leet"]');
    const target = control?.closest('.ai-agent-guide') as HTMLElement | null;
    if (target) {
      if (hide) {
        target.dataset.leetcopilotHidden = 'true';
        target.hidden = true;
        target.style.display = 'none';
      } else if (target.dataset.leetcopilotHidden === 'true') {
        delete target.dataset.leetcopilotHidden;
        target.hidden = false;
        target.style.display = '';
      }
    }
    if (hide) closeNativeLeet();
    else if (nativeRestoreRequested) {
      nativeRestoreRequested = false;
      showNativeLeet();
    }
  };

  const send = async (text = draft()) => {
    const value = text.trim();
    if (!value || busy()) return;
    const settings = await getSettings();
    if (!settings.apiKey.trim()) { setError(`尚未设置${settings.provider === 'qwen' ? '千问' : 'DeepSeek'} API Key。请点击浏览器工具栏中的 LeetCopilot 图标完成设置。`); return; }
    batch(() => { setError(''); setErrorLogs([]); setErrorLogId(); setShowErrorLogs(false); setReceivedToken(false); });
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
    } catch (sendError) {
      setBusy(false);
      setMessages((items) => items.filter((item) => item.id !== requestId));
      setError(sendError instanceof Error ? sendError.message : '请求失败，请重试。');
    }
  };

  const cancel = () => {
    if (!busy()) return;
    void chrome.runtime.sendMessage({ type: 'cancel', requestId });
    setMessages((items) => items.filter((item) => item.id !== requestId));
    setBusy(false);
  };

  const applyCode = async (action: ReturnType<typeof extractCodeAction>) => {
    if (!action) { setError('这段回答没有可安全应用的代码。局部代码必须带有 diff 行号。'); return; }
    try {
      const response = await chrome.runtime.sendMessage({ type: 'apply-code', code: action.code, ...(action.kind === 'patch' ? { startLine: action.startLine, endLine: action.endLine } : {}) });
      if (!response?.ok) { setError(response?.error ?? '无法更新代码编辑器。'); return; }
      setError('');
      await syncContext();
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : '无法更新代码编辑器。');
    }
  };

  const resize = (event: MouseEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width();
    const move = (moveEvent: MouseEvent) => setWidth(Math.max(340, Math.min(620, startWidth + startX - moveEvent.clientX)));
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };

  const reset = async () => {
    const activeRequestId = requestId;
    if (busy() && activeRequestId) void chrome.runtime.sendMessage({ type: 'cancel', requestId: activeRequestId });
    requestId = '';
    batch(clearConversationState);
    await Promise.all([clearHistory(context().id), clearErrorLogs()]);
  };

  const clearShortcut = (event: KeyboardEvent) => {
    if ((!event.ctrlKey && !event.metaKey) || event.key.toLowerCase() !== 'c') return;
    const targetInPanel = event.target instanceof Node && host.contains(event.target);
    if (!targetInPanel && !host.matches(':focus-within')) return;
    event.preventDefault();
    void reset();
  };

  const clearError = () => {
    setError('');
    setShowErrorLogs(false);
  };

  const openErrorLogs = async () => {
    const logs = await getErrorLogs();
    setErrorLogs(errorLogId() ? logs.filter((log) => log.id === errorLogId()) : logs.filter((log) => log.requestId === requestId));
    setShowErrorLogs(true);
  };

  onMount(() => {
    void refresh();
    void getSettings().then((settings) => {
      setHasApiKey(Object.values(settings.apiKeys).some((key) => key.trim()));
      setTheme(settings.theme);
      setHideNativeLeet(settings.hideNativeLeet);
      syncNativeLeet(settings.hideNativeLeet);
    }).catch(() => { setHasApiKey(false); setTheme('auto'); setHideNativeLeet(false); syncNativeLeet(false); });
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area !== 'local' || !changes['leet-copilot:settings']) return;
      void getSettings().then((settings) => {
        setHasApiKey(Object.values(settings.apiKeys).some((key) => key.trim()));
        if (settings.hideNativeLeet !== hideNativeLeet()) nativeRestoreRequested = !settings.hideNativeLeet;
        setTheme(settings.theme);
        setHideNativeLeet(settings.hideNativeLeet);
        syncNativeLeet(settings.hideNativeLeet);
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
      syncNativeLeet(hideNativeLeet());
      if (pending) return;
      pending = true;
      setTimeout(() => { pending = false; void syncContext(); }, 250);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const hydration = setTimeout(() => void syncContext(), 1200);
    const resizeObserver = new ResizeObserver(syncLayout);
    resizeObserver.observe(host);
    onCleanup(() => {
      chrome.runtime.onMessage.removeListener(listener);
      chrome.storage.onChanged.removeListener(storageListener);
      document.removeEventListener('keydown', clearShortcut, true);
      observer.disconnect();
      resizeObserver.disconnect();
      clearTimeout(hydration);
    });
  });

  createEffect(() => {
    const current = messages();
    if (context().id && current.length) void saveHistory(context().id, current);
    if (stickToBottom) queueMicrotask(() => scrollArea?.scrollTo({ top: scrollArea.scrollHeight, behavior: 'smooth' }));
  });
  createEffect(() => {
    host.style.width = open() ? `${width()}px` : '44px';
    syncLayout();
  });

  return {
    context, messages, draft, open, busy, error, errorLogs, errorLogId, showErrorLogs, receivedToken, width, theme, hasApiKey,
    setDraft, setOpen, setShowErrorLogs, clearError, refresh, send, cancel, applyCode, resize,
    copy: async (text) => { await navigator.clipboard.writeText(text); },
    reset, openErrorLogs,
    onConversationScroll: (event) => {
      const target = event.currentTarget as HTMLDivElement;
      stickToBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 32;
    },
    setScrollArea: (element) => { scrollArea = element; },
  };
}
