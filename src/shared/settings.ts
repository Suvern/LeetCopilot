import { PROVIDERS } from './providers';
import type { Provider, ProviderAccount, Settings } from './domain';

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: 2,
  provider: 'deepseek',
  apiKey: '',
  apiKeys: { deepseek: '', qwen: '' },
  model: PROVIDERS.deepseek.defaultModel,
  activeProviderId: 'deepseek',
  accounts: {
    deepseek: {
      providerId: 'deepseek',
      apiKey: '',
      model: PROVIDERS.deepseek.defaultModel,
    },
  },
  theme: 'auto',
  hideNativeLeet: false,
};

type StoredProviderAccount = Partial<ProviderAccount>;

export type StoredSettings = Omit<Partial<Settings>, 'accounts' | 'apiKeys'> & {
  apiKey?: string;
  apiKeys?: Partial<Record<Provider, string>>;
  accounts?: Record<string, StoredProviderAccount>;
};

type LegacyProvider = 'deepseek' | 'qwen';

const isProvider = (value: unknown): value is LegacyProvider => value === 'deepseek' || value === 'qwen';
const isCustomProtocol = (value: unknown): value is 'openai-chat' | 'anthropic-messages' => value === 'openai-chat' || value === 'anthropic-messages';

const stringValue = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;

function createBuiltinAccount(provider: Provider, apiKey: string, model?: string): ProviderAccount {
  return {
    providerId: provider,
    apiKey,
    model: model || PROVIDERS[provider].defaultModel,
  };
}

function normalizeAccounts(stored: StoredSettings, apiKeys: Record<Provider, string>): Record<string, ProviderAccount> {
  const accounts: Record<string, ProviderAccount> = { ...DEFAULT_SETTINGS.accounts };

  for (const provider of ['deepseek', 'qwen'] as const) {
    const storedAccount = stored.accounts?.[provider];
    accounts[provider] = {
      ...createBuiltinAccount(provider, apiKeys[provider]),
      ...(storedAccount ?? {}),
      providerId: provider,
      apiKey: stringValue(storedAccount?.apiKey, apiKeys[provider]),
      model: stringValue(storedAccount?.model, PROVIDERS[provider].defaultModel),
    };
  }

  for (const [providerId, storedAccount] of Object.entries(stored.accounts ?? {})) {
    if (accounts[providerId] || !storedAccount || typeof storedAccount !== 'object') continue;
    const model = stringValue(storedAccount.model);
    if (!model) continue;
    accounts[providerId] = {
      providerId,
      apiKey: stringValue(storedAccount.apiKey),
      model,
      ...(storedAccount.customName ? { customName: storedAccount.customName } : {}),
      ...(storedAccount.customBaseUrl ? { customBaseUrl: storedAccount.customBaseUrl } : {}),
      ...(isCustomProtocol(storedAccount.customProtocol) ? { customProtocol: storedAccount.customProtocol } : {}),
      ...(typeof storedAccount.lastTestedAt === 'number' ? { lastTestedAt: storedAccount.lastTestedAt } : {}),
    };
  }

  return accounts;
}

export function normalizeSettings(stored?: StoredSettings): Settings {
  const provider: LegacyProvider = isProvider(stored?.provider) ? stored.provider : 'deepseek';
  const apiKeys: Record<'deepseek' | 'qwen', string> = {
    deepseek: stringValue(stored?.apiKeys?.deepseek, DEFAULT_SETTINGS.apiKeys.deepseek),
    qwen: stringValue(stored?.apiKeys?.qwen, DEFAULT_SETTINGS.apiKeys.qwen),
  };

  if (!stored?.apiKeys && stored?.apiKey) apiKeys[provider] = stored.apiKey;

  const accounts = normalizeAccounts(stored ?? {}, apiKeys);
  const activeProviderId = typeof stored?.activeProviderId === 'string' && accounts[stored.activeProviderId]
    ? stored.activeProviderId
    : provider;
  const activeAccount = accounts[activeProviderId] ?? accounts[provider];
  const apiKey = stringValue(stored?.apiKey, activeAccount?.apiKey ?? apiKeys[provider]);
  const model = stringValue(stored?.model, activeAccount?.model ?? PROVIDERS[provider].defaultModel) || PROVIDERS[provider].defaultModel;

  if (activeAccount && activeProviderId === provider) {
    activeAccount.apiKey = apiKey;
    activeAccount.model = model;
  }

  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    schemaVersion: 2,
    provider,
    apiKeys,
    apiKey,
    model,
    activeProviderId,
    accounts,
  };
}

export function getActiveAccount(settings: Settings): ProviderAccount | undefined {
  return settings.accounts[settings.activeProviderId];
}
