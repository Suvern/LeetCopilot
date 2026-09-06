import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'solid-js';
import { extractCodeAction, extractCodeBlock, normalizeLanguage, problemId, replaceLines } from '../src/shared/parse';
import { parseSseEvent, parseSseLine } from '../src/shared/stream';
import { buildKeyTestBody, buildStreamingBody, getProviderAdapter } from '../src/shared/provider-protocol';
import { getProviderPreset, PROVIDERS } from '../src/shared/providers';
import { streamAttempt, testProviderKey } from '../src/background/provider-client';
import { buildContext, shortcutInstruction, userPrompt } from '../src/shared/prompt';
import { getActiveAccount } from '../src/shared/settings';
import { migrateSettings } from '../src/shared/settings-migration';
import { getSettings, saveSettings } from '../src/shared/storage';
import { createSettingsController } from '../src/popup/settings-controller';
import type { ChatRequest } from '../src/shared/messages';
import type { ProblemContext } from '../src/shared/domain';

const problem: ProblemContext = { id: 'two-sum', title: '两数之和', difficulty: '简单', description: '找出目标和', examples: '示例', constraints: '限制', tags: [], language: 'Python', code: 'print(1)', url: 'https://leetcode.cn/problems/two-sum/' };
const chatRequest: ChatRequest = { type: 'chat', requestId: 'request-1', problem, messages: [] };
describe('shared helpers', () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([['c', 'C'], ['cpp', 'C++'], ['JavaScript', 'JavaScript'], ['TypeScript', 'TypeScript'], ['python3', 'Python']])('normalizes %s', (input, expected) => expect(normalizeLanguage(input)).toBe(expected));
  it('extracts a stable problem id', () => expect(problemId(problem.url)).toBe('two-sum'));
  it('parses streaming content deltas', () => expect(parseSseLine('data: {"choices":[{"delta":{"content":"你好"}}]}')).toBe('你好'));
  it('parses streaming content after reasoning deltas', () => expect(parseSseLine('data: {"choices":[{"delta":{"reasoning_content":"分析中","content":""}}]}')).toBe(''));
  it('ignores non-data and done lines', () => { expect(parseSseLine('event: message')).toBeNull(); expect(parseSseLine('data: [DONE]')).toBeNull(); });
  it('distinguishes stream errors from malformed lines', () => {
    expect(parseSseEvent('{"error":{"message":"无效 Key"}}')).toEqual({ kind: 'error', details: '{\n  "message": "无效 Key"\n}' });
    expect(parseSseEvent('{malformed')).toEqual({ kind: 'ignore' });
  });
  it('builds provider request bodies without credentials', () => {
    expect(JSON.parse(buildKeyTestBody('qwen-plus'))).toMatchObject({ model: 'qwen-plus', stream: false, max_tokens: 1 });
    expect(JSON.parse(buildStreamingBody('deepseek-v4-flash', [{ role: 'system', content: '系统' }]))).toEqual({ model: 'deepseek-v4-flash', stream: true, messages: [{ role: 'system', content: '系统' }] });
  });
  it('registers providers with an explicit protocol and stable id', () => {
    expect(getProviderPreset('deepseek')).toMatchObject({ id: 'deepseek', protocol: 'openai-chat' });
    expect(PROVIDERS.qwen.protocol).toBe('openai-chat');
    expect(getProviderPreset('openai')).toMatchObject({ endpoint: 'https://api.openai.com/v1/chat/completions', defaultModel: 'gpt-4.1-mini' });
    expect(getProviderPreset('kimi-api')).toMatchObject({ label: 'Kimi', description: 'API', endpoint: 'https://api.moonshot.cn/v1/chat/completions' });
    expect(getProviderPreset('kimi-code-plan')).toMatchObject({ label: 'Kimi', description: 'Code Plan', endpoint: 'https://api.kimi.com/coding/v1/chat/completions', defaultModel: 'kimi-for-coding' });
    expect(getProviderPreset('minimax-cn-api')).toMatchObject({ label: 'MiniMax CN', description: 'API', endpoint: 'https://api.minimax.cn/v1/chat/completions', defaultModel: 'MiniMax-M3', apiKeysUrl: 'https://platform.minimaxi.com/user-center/basic-information/interface-key', protocol: 'openai-chat' });
    expect(getProviderPreset('minimax-cn-plan')).toMatchObject({ label: 'MiniMax CN', description: 'Token Plan', endpoint: 'https://api.minimax.cn/v1/chat/completions', defaultModel: 'MiniMax-M3', apiKeysUrl: 'https://platform.minimaxi.com/user-center/payment/token-plan', protocol: 'openai-chat' });
    expect(getProviderPreset('minimax-api')).toMatchObject({ label: 'MiniMax', description: 'API', endpoint: 'https://api.minimax.io/v1/chat/completions', defaultModel: 'MiniMax-M3', apiKeysUrl: 'https://platform.minimax.io/user-center/basic-information/interface-key', protocol: 'openai-chat' });
    expect(getProviderPreset('minimax-plan')).toMatchObject({ label: 'MiniMax', description: 'Token Plan', endpoint: 'https://api.minimax.io/v1/chat/completions', defaultModel: 'MiniMax-M3', apiKeysUrl: 'https://platform.minimax.io/user-center/payment/token-plan', protocol: 'openai-chat' });
    expect(getProviderPreset('zhipu')).toMatchObject({ endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', defaultModel: 'glm-4-flash' });
    expect(getProviderPreset('openrouter')).toMatchObject({ endpoint: 'https://openrouter.ai/api/v1/chat/completions', defaultModel: 'openai/gpt-4.1-mini' });
    expect(getProviderPreset('missing-provider')).toBeUndefined();
  });
  it('builds and parses OpenAI Chat adapter events', () => {
    const adapter = getProviderAdapter('openai-chat');
    expect(adapter).toBeDefined();
    expect(adapter?.buildHeaders('secret')).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer secret' });
    expect(adapter?.parseStreamEvent('{"choices":[{"delta":{"content":"hello"}}]}')).toEqual({ kind: 'delta', content: 'hello' });
    expect(adapter?.parseStreamEvent('[DONE]')).toEqual({ kind: 'done' });
    expect(adapter?.parseStreamEvent('{"error":{"message":"bad key"}}')).toEqual({ kind: 'error', details: '{\n  "message": "bad key"\n}' });
  });
  it('does not fetch for an empty or unregistered provider key test', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(testProviderKey('deepseek', '  ', '')).resolves.toEqual({ ok: false, error: '请先填写 API Key。' });
    await expect(testProviderKey('missing-provider', 'key', '')).resolves.toEqual({ ok: false, error: '未注册的 provider：missing-provider。' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('streams a complete OpenAI Chat response through the active provider account', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"hello"}}]}\n\ndata: [DONE]\n\n'));
        controller.close();
      },
    }), { status: 200, statusText: 'OK' }));
    vi.stubGlobal('fetch', fetchMock);
    const config = getProviderPreset('openrouter')!;
    const deltas: string[] = [];

    await streamAttempt(chatRequest, { providerId: 'openrouter', apiKey: 'router-key', model: 'openai/gpt-4.1-mini' }, config, new AbortController(), async (text) => { deltas.push(text); });

    expect(deltas).toEqual(['hello']);
    expect(fetchMock).toHaveBeenCalledWith(config.endpoint, expect.objectContaining({
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer router-key' },
      body: expect.stringContaining('openai/gpt-4.1-mini'),
    }));
  });
  it('streams a complete Kimi Code Plan response through its isolated endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"plan"}}]}\n\ndata: [DONE]\n\n'));
        controller.close();
      },
    }), { status: 200, statusText: 'OK' }));
    vi.stubGlobal('fetch', fetchMock);
    const config = getProviderPreset('kimi-code-plan')!;
    const deltas: string[] = [];

    await streamAttempt(chatRequest, { providerId: 'kimi-code-plan', apiKey: 'plan-key', model: 'kimi-for-coding' }, config, new AbortController(), async (text) => { deltas.push(text); });

    expect(deltas).toEqual(['plan']);
    expect(fetchMock).toHaveBeenCalledWith('https://api.kimi.com/coding/v1/chat/completions', expect.objectContaining({
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer plan-key' },
      body: expect.stringContaining('kimi-for-coding'),
    }));
  });
  it('streams a complete MiniMax Token Plan response through the OpenAI Chat adapter', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"minimax"}}]}\n\ndata: [DONE]\n\n'));
        controller.close();
      },
    }), { status: 200, statusText: 'OK' }));
    vi.stubGlobal('fetch', fetchMock);
    const config = getProviderPreset('minimax-cn-plan')!;
    const deltas: string[] = [];

    await streamAttempt(chatRequest, { providerId: 'minimax-cn-plan', apiKey: 'plan-key', model: 'MiniMax-M3' }, config, new AbortController(), async (text) => { deltas.push(text); });

    expect(deltas).toEqual(['minimax']);
    expect(fetchMock).toHaveBeenCalledWith('https://api.minimax.cn/v1/chat/completions', expect.objectContaining({
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer plan-key' },
      body: expect.stringContaining('MiniMax-M3'),
    }));
  });
  it('preserves the provider diagnostic when an OpenAI Chat service returns an HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('denied', { status: 401, statusText: 'Unauthorized' })));
    const config = getProviderPreset('openai')!;

    await expect(streamAttempt(chatRequest, { providerId: 'openai', apiKey: 'openai-key', model: 'gpt-4.1-mini' }, config, new AbortController(), async () => {}))
      .rejects.toMatchObject({ diagnostic: { kind: 'http', status: 401, details: 'denied' } });
  });
  it('migrates v0.1.0 settings into the current shape', () => {
    expect(migrateSettings({ provider: 'qwen', apiKey: 'legacy-key' })).toMatchObject({ provider: 'qwen', apiKey: 'legacy-key', apiKeys: { qwen: 'legacy-key' } });
    expect(migrateSettings({ provider: 'deepseek', apiKeys: { qwen: 'qwen-key' } })).toMatchObject({ provider: 'deepseek', apiKey: '', apiKeys: { qwen: 'qwen-key' } });
  });
  it('creates isolated built-in accounts while migrating legacy settings', () => {
    const settings = migrateSettings({ provider: 'qwen', apiKey: 'qwen-key', model: 'qwen-custom' });
    expect(settings.schemaVersion).toBe(2);
    expect(settings.activeProviderId).toBe('qwen');
    expect(settings.accounts.qwen).toMatchObject({
      providerId: 'qwen',
      apiKey: 'qwen-key',
      model: 'qwen-custom',
    });
    expect(getActiveAccount(settings)).toMatchObject({ providerId: 'qwen', apiKey: 'qwen-key' });
  });
  it('creates separate default accounts for all built-in OpenAI Chat providers', () => {
    const settings = migrateSettings();
    expect(settings.accounts.openai).toMatchObject({ providerId: 'openai', model: 'gpt-4.1-mini' });
    expect(settings.accounts['kimi-api']).toMatchObject({ providerId: 'kimi-api', model: 'kimi-k2.7-code' });
    expect(settings.accounts['kimi-code-plan']).toMatchObject({ providerId: 'kimi-code-plan', model: 'kimi-for-coding' });
    expect(settings.accounts['minimax-cn-api']).toMatchObject({ providerId: 'minimax-cn-api', model: 'MiniMax-M3' });
    expect(settings.accounts['minimax-cn-plan']).toMatchObject({ providerId: 'minimax-cn-plan', model: 'MiniMax-M3' });
    expect(settings.accounts['minimax-api']).toMatchObject({ providerId: 'minimax-api', model: 'MiniMax-M3' });
    expect(settings.accounts['minimax-plan']).toMatchObject({ providerId: 'minimax-plan', model: 'MiniMax-M3' });
    expect(settings.accounts.zhipu).toMatchObject({ providerId: 'zhipu', model: 'glm-4-flash' });
    expect(settings.accounts.openrouter).toMatchObject({ providerId: 'openrouter', model: 'openai/gpt-4.1-mini' });
  });
  it('keeps Kimi API and Code Plan accounts isolated when switching', async () => {
    const stored: Record<string, unknown> = {};
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: async (key: string) => ({ [key]: stored[key] }),
          set: async (values: Record<string, unknown>) => Object.assign(stored, values),
        },
      },
    });
    const current = migrateSettings();
    await saveSettings({
      ...current,
      activeProviderId: 'kimi-api',
      apiKey: 'api-key',
      model: 'api-model',
      accounts: { ...current.accounts, 'kimi-api': { ...current.accounts['kimi-api'], apiKey: 'api-key', model: 'api-model' } },
    });
    const apiSettings = await getSettings();
    await saveSettings({
      ...apiSettings,
      activeProviderId: 'kimi-code-plan',
      apiKey: 'plan-key',
      model: 'plan-model',
      accounts: { ...apiSettings.accounts, 'kimi-code-plan': { ...apiSettings.accounts['kimi-code-plan'], apiKey: 'plan-key', model: 'plan-model' } },
    });
    const planSettings = await getSettings();
    expect(planSettings.accounts['kimi-api']).toMatchObject({ apiKey: 'api-key', model: 'api-model' });
    expect(planSettings.accounts['kimi-code-plan']).toMatchObject({ apiKey: 'plan-key', model: 'plan-model' });
  });
  it('keeps MiniMax regional and Token Plan accounts isolated when switching', async () => {
    const stored: Record<string, unknown> = {};
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: async (key: string) => ({ [key]: stored[key] }),
          set: async (values: Record<string, unknown>) => Object.assign(stored, values),
        },
      },
    });
    const current = migrateSettings();
    await saveSettings({
      ...current,
      activeProviderId: 'minimax-cn-api',
      apiKey: 'cn-api-key',
      model: 'cn-model',
      accounts: { ...current.accounts, 'minimax-cn-api': { ...current.accounts['minimax-cn-api'], apiKey: 'cn-api-key', model: 'cn-model' } },
    });
    const apiSettings = await getSettings();
    await saveSettings({
      ...apiSettings,
      activeProviderId: 'minimax-plan',
      apiKey: 'global-plan-key',
      model: 'global-plan-model',
      accounts: { ...apiSettings.accounts, 'minimax-plan': { ...apiSettings.accounts['minimax-plan'], apiKey: 'global-plan-key', model: 'global-plan-model' } },
    });
    const planSettings = await getSettings();
    expect(planSettings.accounts['minimax-cn-api']).toMatchObject({ apiKey: 'cn-api-key', model: 'cn-model' });
    expect(planSettings.accounts['minimax-plan']).toMatchObject({ apiKey: 'global-plan-key', model: 'global-plan-model' });
  });
  it('ignores a completed Kimi API key test after switching to Code Plan', async () => {
    let resolveTest: ((value: { ok: true }) => void) | undefined;
    const testPromise = new Promise<{ ok: true }>((resolve) => { resolveTest = resolve; });
    const sendMessage = vi.fn().mockReturnValue(testPromise);
    const setStorage = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('chrome', {
      runtime: { sendMessage },
      storage: { local: { get: async () => ({}), set: setStorage } },
    });

    let controller!: ReturnType<typeof createSettingsController>;
    let dispose!: () => void;
    createRoot((rootDispose) => {
      controller = createSettingsController();
      controller.changeProvider('kimi-api');
      controller.update('apiKey', 'api-key');
      dispose = rootDispose;
    });
    const pending = controller.testAndSave();
    await Promise.resolve();
    controller.changeProvider('kimi-code-plan');
    resolveTest?.({ ok: true });
    await pending;

    expect(sendMessage).toHaveBeenCalledWith({ type: 'test-key', provider: 'kimi-api', apiKey: 'api-key', model: 'kimi-k2.7-code' });
    expect(setStorage).not.toHaveBeenCalled();
    expect(controller.status()).toEqual({ kind: 'idle', message: '' });
    dispose();
  });
  it('preserves custom and mode-specific accounts without making them legacy providers', () => {
    const settings = migrateSettings({
      provider: 'deepseek',
      activeProviderId: 'kimi-code-plan',
      accounts: {
        'kimi-code-plan': {
          providerId: 'kimi-code-plan',
          apiKey: 'code-key',
          model: 'kimi-for-coding',
        },
      },
    });
    expect(getActiveAccount(settings)).toMatchObject({
      providerId: 'kimi-code-plan',
      apiKey: 'code-key',
      model: 'kimi-for-coding',
    });
    expect(settings.provider).toBe('deepseek');
  });
  it('round-trips the new account fields while retaining legacy fields', async () => {
    const stored: Record<string, unknown> = {};
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: async (key: string) => ({ [key]: stored[key] }),
          set: async (values: Record<string, unknown>) => Object.assign(stored, values),
        },
      },
    });

    const current = migrateSettings();
    const switchedSettings = {
      ...current,
      provider: 'qwen' as const,
      activeProviderId: 'qwen',
      apiKey: ' qwen-key ',
      model: ' qwen-custom ',
      accounts: { ...current.accounts, qwen: { ...current.accounts.qwen, apiKey: ' qwen-key ', model: ' qwen-custom ' } },
    };
    await saveSettings(switchedSettings);
    const settings = await getSettings();
    expect(settings.apiKey).toBe('qwen-key');
    expect(settings.apiKeys.qwen).toBe('qwen-key');
    expect(settings.activeProviderId).toBe('qwen');
    expect(settings.accounts.qwen).toMatchObject({ apiKey: 'qwen-key', model: 'qwen-custom' });
  });
  it('keeps newly added provider accounts independent when saving the active account', async () => {
    const stored: Record<string, unknown> = {};
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: async (key: string) => ({ [key]: stored[key] }),
          set: async (values: Record<string, unknown>) => Object.assign(stored, values),
        },
      },
    });
    const current = migrateSettings();
    await saveSettings({
      ...current,
      activeProviderId: 'kimi-api',
      apiKey: ' kimi-key ',
      model: ' kimi-custom ',
      accounts: { ...current.accounts, 'kimi-api': { ...current.accounts['kimi-api'], apiKey: ' kimi-key ', model: ' kimi-custom ' } },
    });

    const settings = await getSettings();
    expect(settings.activeProviderId).toBe('kimi-api');
    expect(getActiveAccount(settings)).toMatchObject({ apiKey: 'kimi-key', model: 'kimi-custom' });
    expect(settings.accounts.deepseek).toMatchObject({ apiKey: '', model: 'deepseek-v4-flash' });
  });
  it('saves an active custom provider without overwriting the legacy provider account', async () => {
    const stored: Record<string, unknown> = {};
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: async (key: string) => ({ [key]: stored[key] }),
          set: async (values: Record<string, unknown>) => Object.assign(stored, values),
        },
      },
    });

    const settings = migrateSettings({
      activeProviderId: 'custom:local',
      accounts: {
        'custom:local': {
          providerId: 'custom:local',
          apiKey: ' custom-key ',
          model: 'custom-model',
        },
      },
    });
    await saveSettings(settings);
    const saved = stored['leet-copilot:settings'] as { activeProviderId: string; accounts: Record<string, { apiKey: string }> };
    expect(saved.activeProviderId).toBe('custom:local');
    expect(saved.accounts['custom:local']).toMatchObject({ apiKey: 'custom-key' });
    expect(saved.accounts.deepseek).toMatchObject({ apiKey: '' });
  });
  it('includes problem context in user prompts', () => expect(userPrompt(problem, '分析')).toContain('当前代码'));
  it('uses the selected language in context', () => expect(buildContext(problem)).toContain('语言：Python'));
  it('keeps analysis shortcuts code-free', () => {
    const instruction = shortcutInstruction('分析思路');
    expect(instruction).toContain('不要给出任何代码');
    expect(instruction).toContain('伪代码');
  });
  it('keeps hint shortcuts code-free', () => {
    const instruction = shortcutInstruction('给出提示');
    expect(instruction).toContain('不要给出完整算法');
    expect(instruction).toContain('不要给出任何代码');
  });
  it('only allows a full program for the full-solution shortcut', () => {
    expect(shortcutInstruction('优化复杂度')).toContain('不要输出完整程序');
    expect(shortcutInstruction('生成完整解法')).toContain('完整可提交的解法');
  });
  it('selects an implementation block over a formula block', () => expect(extractCodeBlock('公式：\n```text\nmissing(i) = arr[i] - i - 1\n```\n实现：\n```typescript\nfunction solve() { return 1; }\n```')).toContain('function solve'));
  it('keeps the first complete implementation when an answer includes alternatives', () => expect(extractCodeBlock('```typescript\nfunction binarySearch() {\n  while (true) return 1;\n}\n```\n```typescript\nfunction linear() { return 1; }\n```')).toContain('binarySearch'));
  it('extracts a full-code action', () => expect(extractCodeAction('```typescript leetcopilot-full\nconst answer = 42;\n```')).toEqual({ kind: 'full', code: 'const answer = 42;' }));
  it('extracts a line patch from a unified diff', () => expect(extractCodeAction('```diff\n@@ -2,2 +2,2 @@\n old line\n-old value\n+new value\n```')).toEqual({ kind: 'patch', startLine: 2, endLine: 3, code: 'old line\nnew value' }));
  it('extracts a single-line patch from an explicitly numbered code block', () => expect(extractCodeAction('修改第 5 行：\n```typescript\nreturn answer;\n```')).toEqual({ kind: 'patch', startLine: 5, endLine: 5, code: 'return answer;' }));
  it('rejects an ambiguous partial block', () => expect(extractCodeAction('```typescript patch\nreturn answer;\n```')).toBeNull());
  it('replaces only the requested lines', () => expect(replaceLines('one\ntwo\nthree\nfour', 2, 3, 'new\nlines')).toBe('one\nnew\nlines\nfour'));
});
