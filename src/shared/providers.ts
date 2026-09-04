import type { Provider } from './domain';

export type ProviderConfig = {
  label: string;
  endpoint: string;
  defaultModel: string;
  apiKeysUrl: string;
};

export const PROVIDERS: Record<Provider, ProviderConfig> = {
  deepseek: {
    label: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/chat/completions',
    defaultModel: 'deepseek-v4-flash',
    apiKeysUrl: 'https://platform.deepseek.com/api_keys',
  },
  qwen: {
    label: '千问',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    defaultModel: 'qwen-plus',
    apiKeysUrl: 'https://platform.qianwenai.com/home/api-keys',
  },
};

export const PROVIDER_OPTIONS = Object.entries(PROVIDERS).map(([value, provider]) => ({
  value: value as Provider,
  label: provider.label,
}));
