import type { Language } from './domain';
const languageMap: Record<string, Language> = { c: 'C', 'c++': 'C++', cpp: 'C++', java: 'Java', javascript: 'JavaScript', js: 'JavaScript', typescript: 'TypeScript', ts: 'TypeScript', python: 'Python', python3: 'Python' };
export function normalizeLanguage(value: string): Language { return languageMap[value.toLowerCase().replace(/\s/g, '')] ?? 'JavaScript'; }
export function problemId(url = location.href) { return url.match(/\/problems\/([^/?#]+)/)?.[1] ?? 'current-problem'; }
export function cleanText(value: string | undefined) { return (value ?? '').replace(/\s+/g, ' ').trim(); }
export type CodeAction = { kind: 'full'; code: string } | { kind: 'patch'; startLine: number; endLine: number; code: string };

type CodeBlock = { language: string; code: string; index: number; before: string };
function codeBlocks(value: string): CodeBlock[] {
  return [...value.matchAll(/```([^\n]*)\n([\s\S]*?)```/g)]
    .map((match, index) => ({ language: match[1].trim().toLowerCase(), code: match[2].replace(/^\n|\n$/g, ''), index, before: value.slice(Math.max(0, (match.index ?? 0) - 100), match.index ?? 0) }))
    .filter((block) => block.code.trim());
}

export function extractCodeBlock(value: string) {
  const blocks = codeBlocks(value);
  const score = (block: { language: string; code: string }) => {
    let result = /^(?:typescript|javascript|python|java|cpp|c\+\+|c)(?:\b|\s|$)/.test(block.language) ? 2 : 0;
    if (/(?:function\s+\w+|class\s+\w+|def\s+\w+|#include|public\s+(?:static\s+)?class)/.test(block.code)) result += 5;
    if (/(?:return\b|const\b|let\b|while\s*\(|for\s*\()/.test(block.code)) result += 1;
    if (/^[\w()[\] .+-]+\s*=/.test(block.code) && !/[{};]/.test(block.code)) result -= 4;
    return result;
  };
  return blocks.sort((left, right) => score(right) - score(left) || left.index - right.index)[0]?.code ?? '';
}

function parseRange(value: string) {
  const match = value.match(/(?:lines?\s*|第\s*|行\s*)(\d+)(?:\s*行)?(?:\s*(?:-|至|到)\s*(?:第\s*)?(\d+)\s*行?)?/i);
  if (!match) return null;
  const startLine = Number(match[1]);
  const endLine = Number(match[2] ?? match[1]);
  return startLine >= 1 && endLine >= startLine ? { startLine, endLine } : null;
}

function parseUnifiedDiff(block: CodeBlock): CodeAction | null {
  const lines = block.code.split('\n');
  const headerIndex = lines.findIndex((line) => /^@@\s+-\d+(?:,\d+)?\s+\+\d+(?:,\d+)?\s+@@/.test(line));
  if (headerIndex < 0) return null;
  const header = lines[headerIndex].match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/);
  if (!header) return null;
  const startLine = Number(header[1]);
  const oldCount = Number(header[2] ?? 1);
  const hunk = lines.slice(headerIndex + 1).filter((line) => !line.startsWith('\\ No newline at end of file'));
  const oldLines = hunk.filter((line) => line.startsWith(' ') || line.startsWith('-'));
  const newLines = hunk.filter((line) => line.startsWith(' ') || line.startsWith('+'));
  if (oldLines.length !== oldCount || (!newLines.length && oldCount > 0) || hunk.some((line) => ![' ', '+', '-'].includes(line[0] ?? ''))) return null;
  return { kind: 'patch', startLine, endLine: startLine + oldCount - 1, code: newLines.map((line) => line.slice(1)).join('\n') };
}

export function extractCodeAction(value: string): CodeAction | null {
  const blocks = codeBlocks(value);
  for (const block of blocks) {
    if (block.language === 'diff' || block.language.includes('patch')) {
      const diff = parseUnifiedDiff(block);
      if (diff) return diff;
      const range = parseRange(`${block.language} ${block.before}`);
      if (range) return { kind: 'patch', ...range, code: block.code.trim() };
      return null;
    }
    const range = parseRange(`${block.language} ${block.before}`);
    if (range || /(?:partial|局部|patch)/i.test(block.language)) {
      if (!range) return null;
      return { kind: 'patch', ...range, code: block.code.trim() };
    }
  }
  const code = extractCodeBlock(value);
  return code ? { kind: 'full', code } : null;
}

export function replaceLines(source: string, startLine: number, endLine: number, replacement: string) {
  const lines = source.split('\n');
  if (!Number.isInteger(startLine) || !Number.isInteger(endLine) || startLine < 1 || endLine < startLine || endLine > lines.length) return null;
  return [...lines.slice(0, startLine - 1), ...replacement.split('\n'), ...lines.slice(endLine)].join('\n');
}
