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

export function getProviderAdapter(protocol: ApiProtocol): ProviderAdapter | undefined {
  return protocol === 'openai-chat' ? openAiChatAdapter : undefined;
}
