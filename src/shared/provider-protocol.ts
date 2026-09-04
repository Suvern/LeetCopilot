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
