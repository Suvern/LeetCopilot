import { getSettings } from '../shared/storage';
import { systemPrompt, userPrompt } from '../shared/prompt';
import type { BackgroundRequest, BackgroundEvent } from '../shared/types';

const controllers = new Map<string, AbortController>();

chrome.runtime.onMessage.addListener((request: BackgroundRequest, sender) => {
  if (request.type === 'cancel') { controllers.get(request.requestId)?.abort(); controllers.delete(request.requestId); return; }
  void streamChat(request, sender.tab?.id);
});

async function send(event: BackgroundEvent, tabId?: number) {
  if (tabId !== undefined) await chrome.tabs.sendMessage(tabId, event).catch(() => undefined);
}

async function streamChat(request: Extract<BackgroundRequest, { type: 'chat' }>, tabId?: number) {
  const settings = await getSettings();
  if (!settings.apiKey.trim()) return send({ type: 'error', requestId: request.requestId, message: '请先在 LeetLens 设置中填写 DeepSeek API Key。' }, tabId);
  const controller = new AbortController(); controllers.set(request.requestId, controller);
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey.trim()}` }, body: JSON.stringify({ model: settings.model.trim() || 'deepseek-chat', stream: true, messages: [{ role: 'system', content: `${systemPrompt}\n\n${userPrompt(request.problem, '请使用以下题目上下文回答后续对话。')}` }, ...request.messages.map((message) => ({ role: message.role, content: message.content }))] }) });
    if (!response.ok) { const detail = await response.text(); throw new Error(response.status === 401 ? 'API Key 无效，请检查设置。' : response.status === 429 ? '请求过于频繁，请稍后重试。' : `DeepSeek 请求失败（${response.status}）：${detail.slice(0, 160)}`); }
    if (!response.body) throw new Error('DeepSeek 没有返回可读取的内容。');
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
    const consume = async (chunk: string) => { buffer += chunk; const lines = buffer.split(/\r?\n/); buffer = lines.pop() ?? ''; for (const line of lines) { const dataLine = line.trim(); if (!dataLine.startsWith('data:')) continue; const data = dataLine.slice(5).trim(); if (data === '[DONE]') continue; try { const text = JSON.parse(data).choices?.[0]?.delta?.content; if (text) await send({ type: 'delta', requestId: request.requestId, text }, tabId); } catch { /* Ignore malformed provider lines. */ } } };
    while (true) { const next = await Promise.race([reader.read(), new Promise<never>((_, reject) => setTimeout(() => reject(new Error('DeepSeek 响应超时，请重试。')), 90000))]); if (next.done) break; await consume(decoder.decode(next.value, { stream: true })); }
    await consume(decoder.decode());
    if (buffer.trim().startsWith('data:')) await consume('\n');
    await send({ type: 'done', requestId: request.requestId }, tabId);
  } catch (error) { if ((error as Error).name !== 'AbortError') await send({ type: 'error', requestId: request.requestId, message: (error as Error).message || '请求失败，请重试。' }, tabId); }
  finally { controllers.delete(request.requestId); }
}
