export type Language = 'C' | 'C++' | 'Java' | 'JavaScript' | 'Python';
export type Theme = 'light' | 'dark';
export interface ProblemContext { id: string; title: string; difficulty: string; description: string; examples: string; constraints: string; tags: string[]; language: Language; code: string; url: string; }
export interface ChatMessage { id: string; role: 'user' | 'assistant'; content: string; createdAt: number; }
export interface Settings { apiKey: string; model: string; theme: Theme | 'auto'; }
export type BackgroundRequest = { type: 'chat'; requestId: string; problem: ProblemContext; messages: ChatMessage[] } | { type: 'cancel'; requestId: string };
export type BackgroundEvent = { type: 'delta'; requestId: string; text: string } | { type: 'done'; requestId: string } | { type: 'error'; requestId: string; message: string };
