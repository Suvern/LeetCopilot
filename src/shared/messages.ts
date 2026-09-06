import type { ChatMessage, ProblemContext, ProviderAccount } from './domain';

export type BackgroundRequest =
  | { type: 'chat'; requestId: string; problem: ProblemContext; messages: ChatMessage[] }
  | { type: 'cancel'; requestId: string }
  | { type: 'read-editor' }
  | { type: 'apply-code'; code: string; startLine?: number; endLine?: number }
  | { type: 'test-key'; account: ProviderAccount };

export type BackgroundEvent =
  | { type: 'delta'; requestId: string; text: string }
  | { type: 'done'; requestId: string }
  | { type: 'error'; requestId: string; message: string; errorLogId?: string };

export type OperationFailure = { ok: false; error: string };
export type EditorResponse = { ok: true; code?: string } | OperationFailure;
export type KeyTestResponse = { ok: true } | OperationFailure;
export type OperationResponse = EditorResponse | KeyTestResponse;

export type ChatRequest = Extract<BackgroundRequest, { type: 'chat' }>;
export type KeyTestRequest = Extract<BackgroundRequest, { type: 'test-key' }>;
