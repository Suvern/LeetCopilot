import { describe, expect, it } from 'vitest';
import { normalizeLanguage, problemId, parseSseLine } from '../src/shared/parse';
import { buildContext, userPrompt } from '../src/shared/prompt';
import type { ProblemContext } from '../src/shared/types';

const problem: ProblemContext = { id: 'two-sum', title: '两数之和', difficulty: '简单', description: '找出目标和', examples: '示例', constraints: '限制', tags: [], language: 'Python', code: 'print(1)', url: 'https://leetcode.cn/problems/two-sum/' };
describe('shared helpers', () => {
  it.each([['c', 'C'], ['cpp', 'C++'], ['JavaScript', 'JavaScript'], ['python3', 'Python']])('normalizes %s', (input, expected) => expect(normalizeLanguage(input)).toBe(expected));
  it('extracts a stable problem id', () => expect(problemId(problem.url)).toBe('two-sum'));
  it('parses streaming content deltas', () => expect(parseSseLine('data: {"choices":[{"delta":{"content":"你好"}}]}')).toBe('你好'));
  it('ignores non-data and done lines', () => { expect(parseSseLine('event: message')).toBeNull(); expect(parseSseLine('data: [DONE]')).toBeNull(); });
  it('includes problem context in user prompts', () => expect(userPrompt(problem, '分析')).toContain('当前代码'));
  it('uses the selected language in context', () => expect(buildContext(problem)).toContain('语言：Python'));
});
