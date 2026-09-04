import type { BackgroundRequest, OperationFailure } from '../shared/messages';
import { cancelChat, streamChat } from './chat-service';
import { applyCode, readEditorCode } from './editor-gateway';
import { testProviderKey } from './provider-client';

export function registerMessageRouter() {
  chrome.runtime.onMessage.addListener((request: BackgroundRequest, sender, sendResponse) => {
    void handleMessage(request, sender.tab?.id, sendResponse).catch((error) => {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : '请求失败。' });
    });
    return true;
  });
}

async function handleMessage(request: BackgroundRequest, tabId: number | undefined, sendResponse: (response?: unknown) => void) {
  switch (request.type) {
    case 'cancel':
      cancelChat(request.requestId);
      sendResponse({ ok: true });
      return;
    case 'read-editor':
      sendResponse(await respond(() => readEditorCode(tabId), '无法读取代码编辑器。'));
      return;
    case 'apply-code':
      sendResponse(await respond(() => applyCode(request.code, request.startLine, request.endLine, tabId), '无法更新代码编辑器。'));
      return;
    case 'test-key':
      sendResponse(await respond(() => testProviderKey(request.provider, request.apiKey, request.model), 'API Key 测试失败。'));
      return;
    case 'chat':
      await streamChat(request, tabId);
      sendResponse({ ok: true });
      return;
  }
}

async function respond<T>(operation: () => Promise<T>, fallback: string): Promise<T | OperationFailure> {
  try {
    return await operation();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : fallback };
  }
}
