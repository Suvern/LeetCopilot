import { PROVIDERS } from './providers';
import type { Provider, Settings } from './domain';

export const DEFAULT_SETTINGS: Settings = {
  provider: 'deepseek',
  apiKey: '',
  apiKeys: { deepseek: '', qwen: '' },
  model: PROVIDERS.deepseek.defaultModel,
  theme: 'auto',
  hideNativeLeet: false,
};

export type StoredSettings = Omit<Partial<Settings>, 'apiKeys'> & {
  apiKey?: string;
  apiKeys?: Partial<Record<Provider, string>>;
};

export function normalizeSettings(stored?: StoredSettings): Settings {
  const provider: Provider = stored?.provider === 'qwen' ? 'qwen' : 'deepseek';
  const apiKeys = { ...DEFAULT_SETTINGS.apiKeys, ...(stored?.apiKeys ?? {}) };
  if (!stored?.apiKeys && stored?.apiKey) apiKeys[provider] = stored.apiKey;

  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    provider,
    apiKeys,
    apiKey: stored?.apiKey ?? apiKeys[provider],
    model: stored?.model || PROVIDERS[provider].defaultModel,
  };
}
