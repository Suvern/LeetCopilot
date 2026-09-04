import { describe, expect, it } from 'vitest';
import { extractCodeAction, extractCodeBlock, normalizeLanguage, problemId, parseSseLine, replaceLines } from '../src/shared/parse';
import { buildContext, shortcutInstruction, userPrompt } from '../src/shared/prompt';
import type { ProblemContext } from '../src/shared/types';

const problem: ProblemContext = { id: 'two-sum', title: '两数之和', difficulty: '简单', description: '找出目标和', examples: '示例', constraints: '限制', tags: [], language: 'Python', code: 'print(1)', url: 'https://leetcode.cn/problems/two-sum/' };
describe('shared helpers', () => {
  it.each([['c', 'C'], ['cpp', 'C++'], ['JavaScript', 'JavaScript'], ['TypeScript', 'TypeScript'], ['python3', 'Python']])('normalizes %s', (input, expected) => expect(normalizeLanguage(input)).toBe(expected));
  it('extracts a stable problem id', () => expect(problemId(problem.url)).toBe('two-sum'));
  it('parses streaming content deltas', () => expect(parseSseLine('data: {"choices":[{"delta":{"content":"你好"}}]}')).toBe('你好'));
  it('parses streaming content after reasoning deltas', () => expect(parseSseLine('data: {"choices":[{"delta":{"reasoning_content":"分析中","content":""}}]}')).toBe(''));
  it('ignores non-data and done lines', () => { expect(parseSseLine('event: message')).toBeNull(); expect(parseSseLine('data: [DONE]')).toBeNull(); });
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
