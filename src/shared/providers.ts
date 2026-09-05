import type { ApiProtocol, Provider } from './domain';

export type ProviderPreset = {
  id: Provider;
  label: string;
  description?: string;
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
  openai: {
    id: 'openai',
    label: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4.1-mini',
    apiKeysUrl: 'https://platform.openai.com/api-keys',
    protocol: 'openai-chat',
  },
  'kimi-api': {
    id: 'kimi-api',
    label: 'Kimi',
    description: 'API',
    endpoint: 'https://api.moonshot.cn/v1/chat/completions',
    defaultModel: 'kimi-k2.7-code',
    apiKeysUrl: 'https://platform.kimi.com/console/api-keys',
    protocol: 'openai-chat',
  },
  zhipu: {
    id: 'zhipu',
    label: '智谱 GLM',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    defaultModel: 'glm-4-flash',
    apiKeysUrl: 'https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys',
    protocol: 'openai-chat',
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'openai/gpt-4.1-mini',
    apiKeysUrl: 'https://openrouter.ai/keys',
    protocol: 'openai-chat',
  },
};

export function getProviderPreset(providerId: Provider): ProviderPreset | undefined {
  return PROVIDERS[providerId];
}

export const PROVIDER_OPTIONS = Object.entries(PROVIDERS).map(([value, provider]) => ({
  value: value as Provider,
  label: provider.label,
  description: provider.description,
}));
