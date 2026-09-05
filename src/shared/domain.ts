export type Language = 'C' | 'C++' | 'Java' | 'JavaScript' | 'TypeScript' | 'Python';
export type Theme = 'light' | 'dark';
export type Provider = string;
export type ApiProtocol = 'openai-chat' | 'anthropic-messages' | 'openai-responses';
export type ErrorKind = 'configuration' | 'timeout' | 'http' | 'network' | 'stream' | 'unknown';

export interface ProblemContext {
  id: string;
  title: string;
  difficulty: string;
  description: string;
  examples: string;
  constraints: string;
  tags: string[];
  language: Language;
  code: string;
  url: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface ErrorLog {
  id: string;
  provider: Provider;
  message: string;
  createdAt: number;
  kind?: ErrorKind;
  details?: string;
  endpoint?: string;
  model?: string;
  status?: number;
  statusText?: string;
  attempts?: number;
  timeoutMs?: number;
  requestId?: string;
}

export interface ProviderAccount {
  providerId: Provider;
  apiKey: string;
  model: string;
  customName?: string;
  customBaseUrl?: string;
  customProtocol?: Extract<ApiProtocol, 'openai-chat' | 'anthropic-messages'>;
  lastTestedAt?: number;
}

export interface Settings {
  schemaVersion: 2;
  provider: Provider;
  apiKey: string;
  apiKeys: Record<Provider, string>;
  model: string;
  activeProviderId: Provider;
  accounts: Record<string, ProviderAccount>;
  theme: Theme | 'auto';
  hideNativeLeet: boolean;
}
