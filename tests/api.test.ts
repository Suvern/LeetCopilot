import { describe, expect, it } from 'vitest';
import { loadEnv } from 'vite';
import { testProviderKey } from '../src/background/provider-client';
import type { ProviderAccount } from '../src/shared/domain';
import type { Provider } from '../src/shared/domain';

type ApiTestConfig = {
  label: string;
  providerId: Provider;
  keyVariable: string;
  modelVariable: string;
  defaultModel: string;
};

const apiTestEnv = loadEnv('test', process.cwd(), '');

const API_TEST_CONFIGS: ApiTestConfig[] = [
  { label: 'DeepSeek', providerId: 'deepseek', keyVariable: 'API_TEST_DEEPSEEK_KEY', modelVariable: 'API_TEST_DEEPSEEK_MODEL', defaultModel: 'deepseek-chat' },
  { label: '千问', providerId: 'qwen', keyVariable: 'API_TEST_QWEN_KEY', modelVariable: 'API_TEST_QWEN_MODEL', defaultModel: 'qwen-turbo' },
  { label: 'OpenAI', providerId: 'openai', keyVariable: 'API_TEST_OPENAI_KEY', modelVariable: 'API_TEST_OPENAI_MODEL', defaultModel: 'gpt-4o-mini' },
  { label: 'Anthropic', providerId: 'anthropic', keyVariable: 'API_TEST_ANTHROPIC_KEY', modelVariable: 'API_TEST_ANTHROPIC_MODEL', defaultModel: 'claude-3-5-haiku-20241022' },
  { label: 'Kimi API', providerId: 'kimi-api', keyVariable: 'API_TEST_KIMI_API_KEY', modelVariable: 'API_TEST_KIMI_API_MODEL', defaultModel: 'moonshot-v1-8k' },
  { label: 'Kimi Code Plan', providerId: 'kimi-code-plan', keyVariable: 'API_TEST_KIMI_CODE_PLAN_KEY', modelVariable: 'API_TEST_KIMI_CODE_PLAN_MODEL', defaultModel: 'kimi-for-coding' },
  { label: 'MiniMax CN API', providerId: 'minimax-cn-api', keyVariable: 'API_TEST_MINIMAX_CN_API_KEY', modelVariable: 'API_TEST_MINIMAX_CN_API_MODEL', defaultModel: 'MiniMax-M3' },
  { label: 'MiniMax CN Token Plan', providerId: 'minimax-cn-plan', keyVariable: 'API_TEST_MINIMAX_CN_PLAN_KEY', modelVariable: 'API_TEST_MINIMAX_CN_PLAN_MODEL', defaultModel: 'MiniMax-M3' },
  { label: 'MiniMax API', providerId: 'minimax-api', keyVariable: 'API_TEST_MINIMAX_API_KEY', modelVariable: 'API_TEST_MINIMAX_API_MODEL', defaultModel: 'MiniMax-M3' },
  { label: 'MiniMax Token Plan', providerId: 'minimax-plan', keyVariable: 'API_TEST_MINIMAX_PLAN_KEY', modelVariable: 'API_TEST_MINIMAX_PLAN_MODEL', defaultModel: 'MiniMax-M3' },
  { label: '智谱 GLM', providerId: 'zhipu', keyVariable: 'API_TEST_ZHIPU_KEY', modelVariable: 'API_TEST_ZHIPU_MODEL', defaultModel: 'glm-4-flash' },
  { label: 'OpenRouter', providerId: 'openrouter', keyVariable: 'API_TEST_OPENROUTER_KEY', modelVariable: 'API_TEST_OPENROUTER_MODEL', defaultModel: 'google/gemini-2.0-flash-lite-001' },
];

function accountFor(config: ApiTestConfig): ProviderAccount {
  return {
    providerId: config.providerId,
    apiKey: apiTestEnv[config.keyVariable]?.trim() ?? '',
    model: apiTestEnv[config.modelVariable]?.trim() || config.defaultModel,
  };
}

describe.sequential('provider API availability', () => {
  for (const config of API_TEST_CONFIGS) {
    const account = accountFor(config);
    const test = account.apiKey ? it : it.skip;

    test(`${config.label} API 可用性`, async () => {
      const result = await testProviderKey(account);

      expect(result.ok, result.ok ? undefined : result.error).toBe(true);
    }, 20_000);
  }
});
