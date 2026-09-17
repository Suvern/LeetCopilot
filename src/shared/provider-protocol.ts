import type { ApiProtocol } from './domain';
import type { ParsedStreamEvent } from './stream';
import { parseSseEvent } from './stream';

export type CompletionMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export function buildStreamingBody(model: string, messages: CompletionMessage[]) {
  return JSON.stringify({ model, stream: true, messages });
}

export function buildKeyTestBody(model: string) {
  return JSON.stringify({
    model,
    stream: false,
    max_tokens: 1,
    messages: [{ role: 'user', content: 'Reply with OK.' }],
  });
}

function buildAnthropicBody(model: string, messages: CompletionMessage[], stream: boolean, maxTokens: number) {
  const system = messages.filter((message) => message.role === 'system').map((message) => message.content).join('\n\n');
  return JSON.stringify({
    model,
    max_tokens: maxTokens,
    stream,
    ...(system ? { system } : {}),
    messages: messages.filter((message) => message.role !== 'system').map((message) => ({ role: message.role, content: message.content })),
  });
}

function parseAnthropicStreamEvent(data: string): ParsedStreamEvent {
  let payload: { type?: string; delta?: { type?: string; text?: string }; error?: unknown };
  try {
    payload = JSON.parse(data) as typeof payload;
  } catch {
    return { kind: 'ignore' };
  }
  if (payload.type === 'message_stop') return { kind: 'done' };
  if (payload.type === 'error' || payload.error) return { kind: 'error', details: JSON.stringify(payload.error ?? payload, null, 2) };
  if (payload.type === 'content_block_delta' && payload.delta?.type === 'text_delta') return { kind: 'delta', content: payload.delta.text ?? '' };
  return { kind: 'ignore' };
}

export interface ProviderAdapter {
  readonly protocol: ApiProtocol;
  buildHeaders(apiKey: string): Record<string, string>;
  buildKeyTestBody(model: string): string;
  buildStreamingBody(model: string, messages: CompletionMessage[]): string;
  parseStreamEvent(data: string): ParsedStreamEvent;
}

export const openAiChatAdapter: ProviderAdapter = {
  protocol: 'openai-chat',
  buildHeaders: (apiKey) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }),
  buildKeyTestBody,
  buildStreamingBody,
  parseStreamEvent: parseSseEvent,
};

export const anthropicMessagesAdapter: ProviderAdapter = {
  protocol: 'anthropic-messages',
  buildHeaders: (apiKey) => ({ 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }),
  buildKeyTestBody: (model) => buildAnthropicBody(model, [{ role: 'user', content: 'Reply with OK.' }], false, 1),
  buildStreamingBody: (model, messages) => buildAnthropicBody(model, messages, true, 4096),
  parseStreamEvent: parseAnthropicStreamEvent,
};

export function getProviderAdapter(protocol: ApiProtocol): ProviderAdapter | undefined {
  return protocol === 'openai-chat' ? openAiChatAdapter : protocol === 'anthropic-messages' ? anthropicMessagesAdapter : undefined;
}
