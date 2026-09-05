import type { ApiProtocol, Provider } from './domain';

export type ProviderPreset = {
  id: Provider;
  label: string;
  endpoint: string;
  defaultModel: string;
  apiKeysUrl: string;
  protocol: ApiProtocol;
};

export const PROVIDERS: Record<Provider, ProviderPreset> = {
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/chat/completions',
    defaultModel: 'deepseek-v4-flash',
    apiKeysUrl: 'https://platform.deepseek.com/api_keys',
    protocol: 'openai-chat',
  },
  qwen: {
    id: 'qwen',
    label: '千问',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    defaultModel: 'qwen-plus',
    apiKeysUrl: 'https://platform.qianwenai.com/home/api-keys',
    protocol: 'openai-chat',
  },
};

export function getProviderPreset(providerId: Provider): ProviderPreset | undefined {
  return PROVIDERS[providerId];
}

export const PROVIDER_OPTIONS = Object.entries(PROVIDERS).map(([value, provider]) => ({
  value: value as Provider,
  label: provider.label,
}));
