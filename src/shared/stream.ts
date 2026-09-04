export type ParsedStreamEvent =
  | { kind: 'delta'; content: string }
  | { kind: 'done' }
  | { kind: 'error'; details: string }
  | { kind: 'ignore' };

type StreamPayload = {
  choices?: Array<{ delta?: { content?: string; reasoning_content?: string } }>;
  error?: unknown;
};

export function parseSseEvent(data: string): ParsedStreamEvent {
  if (data === '[DONE]') return { kind: 'done' };

  let payload: StreamPayload;
  try {
    payload = JSON.parse(data) as StreamPayload;
  } catch {
    return { kind: 'ignore' };
  }

  if (payload.error) return { kind: 'error', details: JSON.stringify(payload.error, null, 2) };
  const delta = payload.choices?.[0]?.delta;
  if (!delta || Object.keys(delta).length === 0) return { kind: 'ignore' };
  return { kind: 'delta', content: typeof delta.content === 'string' ? delta.content : '' };
}

export function parseSseLine(line: string): string | null {
  if (!line.startsWith('data:')) return null;
  const event = parseSseEvent(line.slice(5).trim());
  return event.kind === 'delta' ? event.content : null;
}
