import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractCodeAction, extractCodeBlock, normalizeLanguage, problemId, replaceLines } from '../src/shared/parse';
import { parseSseEvent, parseSseLine } from '../src/shared/stream';
import { buildKeyTestBody, buildStreamingBody, getProviderAdapter } from '../src/shared/provider-protocol';
import { getProviderPreset, PROVIDERS } from '../src/shared/providers';
import { testProviderKey } from '../src/background/provider-client';
import { buildContext, shortcutInstruction, userPrompt } from '../src/shared/prompt';
import { getActiveAccount, normalizeSettings } from '../src/shared/settings';
import { getSettings, saveSettings } from '../src/shared/storage';
import type { ProblemContext } from '../src/shared/domain';

const problem: ProblemContext = { id: 'two-sum', title: '两数之和', difficulty: '简单', description: '找出目标和', examples: '示例', constraints: '限制', tags: [], language: 'Python', code: 'print(1)', url: 'https://leetcode.cn/problems/two-sum/' };
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
  it('normalizes legacy settings into the current shape', () => {
    expect(normalizeSettings({ provider: 'qwen', apiKey: 'legacy-key' })).toMatchObject({ provider: 'qwen', apiKey: 'legacy-key', apiKeys: { qwen: 'legacy-key' } });
    expect(normalizeSettings({ provider: 'deepseek', apiKeys: { qwen: 'qwen-key' } })).toMatchObject({ provider: 'deepseek', apiKey: '', apiKeys: { qwen: 'qwen-key' } });
  });
  it('creates isolated built-in accounts while migrating legacy settings', () => {
    const settings = normalizeSettings({ provider: 'qwen', apiKey: 'qwen-key', model: 'qwen-custom' });
    expect(settings.schemaVersion).toBe(2);
    expect(settings.activeProviderId).toBe('qwen');
    expect(settings.accounts.qwen).toMatchObject({
      providerId: 'qwen',
      apiKey: 'qwen-key',
      model: 'qwen-custom',
    });
    expect(getActiveAccount(settings)).toMatchObject({ providerId: 'qwen', apiKey: 'qwen-key' });
  });
  it('preserves custom and mode-specific accounts without making them legacy providers', () => {
    const settings = normalizeSettings({
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

    const switchedSettings = { ...normalizeSettings(), provider: 'qwen' as const, apiKey: ' qwen-key ', model: ' qwen-custom ' };
    await saveSettings(switchedSettings);
    const settings = await getSettings();
    expect(settings.apiKey).toBe('qwen-key');
    expect(settings.apiKeys.qwen).toBe('qwen-key');
    expect(settings.activeProviderId).toBe('qwen');
    expect(settings.accounts.qwen).toMatchObject({ apiKey: 'qwen-key', model: 'qwen-custom' });
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

    const settings = normalizeSettings({
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
