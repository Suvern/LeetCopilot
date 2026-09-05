import { getProviderPreset, PROVIDERS } from './providers';
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

type StoredProviderAccount = Partial<ProviderAccount>;

export type StoredSettings = Omit<Partial<Settings>, 'accounts' | 'apiKeys'> & {
  apiKey?: string;
  apiKeys?: Partial<Record<Provider, string>>;
  accounts?: Record<string, StoredProviderAccount>;
};

type LegacyProvider = 'deepseek' | 'qwen';

const isLegacyProvider = (value: unknown): value is LegacyProvider => value === 'deepseek' || value === 'qwen';
const isCustomProtocol = (value: unknown): value is 'openai-chat' | 'anthropic-messages' => value === 'openai-chat' || value === 'anthropic-messages';

const stringValue = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;

function createBuiltinAccount(provider: Provider, apiKey: string, model?: string): ProviderAccount {
  const preset = getProviderPreset(provider);
  return {
    providerId: provider,
    apiKey,
    model: model || preset?.defaultModel || '',
  };
}

function normalizeAccounts(stored: StoredSettings, apiKeys: Record<Provider, string>): Record<string, ProviderAccount> {
  const accounts: Record<string, ProviderAccount> = { ...DEFAULT_SETTINGS.accounts };

  for (const provider of BUILTIN_PROVIDER_IDS) {
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
  const provider: LegacyProvider = isLegacyProvider(stored?.provider) ? stored.provider : 'deepseek';
  const apiKeys: Record<Provider, string> = Object.fromEntries(BUILTIN_PROVIDER_IDS.map((providerId) => [
    providerId,
    stringValue(stored?.apiKeys?.[providerId], DEFAULT_SETTINGS.apiKeys[providerId]),
  ]));

  if (!stored?.apiKeys && stored?.apiKey) apiKeys[provider] = stored.apiKey;

  const accounts = normalizeAccounts(stored ?? {}, apiKeys);
  const activeProviderId = typeof stored?.activeProviderId === 'string' && accounts[stored.activeProviderId]
    ? stored.activeProviderId
    : provider;
  const activeAccount = accounts[activeProviderId] ?? accounts[provider];
  const storedActiveAccount = stored?.accounts?.[activeProviderId];
  const preset = getProviderPreset(activeProviderId) ?? PROVIDERS.deepseek;
  const apiKey = stringValue(storedActiveAccount?.apiKey, activeAccount?.apiKey ?? (activeProviderId === provider ? apiKeys[provider] : ''));
  const model = stringValue(
    storedActiveAccount?.model,
    activeProviderId === provider ? stringValue(stored?.model, activeAccount?.model ?? preset.defaultModel) : activeAccount?.model ?? preset.defaultModel,
  ) || preset.defaultModel;

  if (activeAccount) {
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
