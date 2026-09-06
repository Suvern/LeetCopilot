import type { ApiProtocol, Provider, ProviderAccount } from './domain';

export type ProviderPreset = {
  id: Provider;
  label: string;
  description?: string;
  endpoint: string;
  defaultModel: string;
  apiKeysUrl?: string;
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
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-sonnet-4-5-20250929',
    apiKeysUrl: 'https://console.anthropic.com/settings/keys',
    protocol: 'anthropic-messages',
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
  'kimi-code-plan': {
    id: 'kimi-code-plan',
    label: 'Kimi',
    description: 'Code Plan',
    endpoint: 'https://api.kimi.com/coding/v1/chat/completions',
    defaultModel: 'kimi-for-coding',
    apiKeysUrl: 'https://www.kimi.com/code',
    protocol: 'openai-chat',
  },
  'minimax-cn-api': {
    id: 'minimax-cn-api',
    label: 'MiniMax CN',
    description: 'API',
    endpoint: 'https://api.minimax.cn/v1/chat/completions',
    defaultModel: 'MiniMax-M3',
    apiKeysUrl: 'https://platform.minimaxi.com/user-center/basic-information/interface-key',
    protocol: 'openai-chat',
  },
  'minimax-cn-plan': {
    id: 'minimax-cn-plan',
    label: 'MiniMax CN',
    description: 'Token Plan',
    endpoint: 'https://api.minimax.cn/v1/chat/completions',
    defaultModel: 'MiniMax-M3',
    apiKeysUrl: 'https://platform.minimaxi.com/user-center/payment/token-plan',
    protocol: 'openai-chat',
  },
  'minimax-api': {
    id: 'minimax-api',
    label: 'MiniMax',
    description: 'API',
    endpoint: 'https://api.minimax.io/v1/chat/completions',
    defaultModel: 'MiniMax-M3',
    apiKeysUrl: 'https://platform.minimax.io/user-center/basic-information/interface-key',
    protocol: 'openai-chat',
  },
  'minimax-plan': {
    id: 'minimax-plan',
    label: 'MiniMax',
    description: 'Token Plan',
    endpoint: 'https://api.minimax.io/v1/chat/completions',
    defaultModel: 'MiniMax-M3',
    apiKeysUrl: 'https://platform.minimax.io/user-center/payment/token-plan',
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

export function isCustomProviderId(providerId: Provider) {
  return providerId.startsWith('custom:');
}

function customEndpoint(baseUrl: string, protocol: ApiProtocol) {
  try {
    const url = new URL(baseUrl.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) return undefined;
    const path = url.pathname.replace(/\/+$/, '');
    if (protocol === 'anthropic-messages') {
      url.pathname = path.endsWith('/v1/messages') ? path : path.endsWith('/v1') ? `${path}/messages` : `${path}/v1/messages`;
    } else if (!path.endsWith('/chat/completions')) {
      url.pathname = `${path}/chat/completions`;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

export function getProviderPreset(providerId: Provider, account?: ProviderAccount): ProviderPreset | undefined {
  const builtin = PROVIDERS[providerId];
  if (builtin) return builtin;
  if (!isCustomProviderId(providerId) || !account || !account.customProtocol) return undefined;
  const endpoint = customEndpoint(account.customBaseUrl ?? '', account.customProtocol);
  if (!endpoint) return undefined;
  return {
    id: providerId,
    label: account.customName?.trim() || '自定义平台',
    description: account.customProtocol === 'anthropic-messages' ? 'Anthropic Messages' : 'OpenAI Chat',
    endpoint,
    defaultModel: account.model.trim(),
    protocol: account.customProtocol,
  };
}

export const PROVIDER_OPTIONS = Object.entries(PROVIDERS).map(([value, provider]) => ({
  value: value as Provider,
  label: provider.label,
  description: provider.description,
}));
