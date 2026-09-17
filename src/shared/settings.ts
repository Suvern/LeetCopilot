import { PROVIDERS } from './providers';
import type { Provider, ProviderAccount, Settings } from './domain';

const BUILTIN_PROVIDER_IDS = Object.keys(PROVIDERS);

const DEFAULT_ACCOUNTS = Object.fromEntries(BUILTIN_PROVIDER_IDS.map((providerId) => [providerId, {
  providerId,
  apiKey: '',
  model: PROVIDERS[providerId].defaultModel,
}])) as Record<string, ProviderAccount>;

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: 2,
  provider: 'deepseek',
  apiKey: '',
  apiKeys: Object.fromEntries(BUILTIN_PROVIDER_IDS.map((providerId) => [providerId, ''])) as Record<Provider, string>,
  model: PROVIDERS.deepseek.defaultModel,
  activeProviderId: 'deepseek',
  accounts: DEFAULT_ACCOUNTS,
  theme: 'auto',
  hideNativeLeet: false,
};

export function getActiveAccount(settings: Settings): ProviderAccount | undefined {
  return settings.accounts[settings.activeProviderId];
}
