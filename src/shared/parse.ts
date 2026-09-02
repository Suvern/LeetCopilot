import type { Language } from './types';
const languageMap: Record<string, Language> = { c: 'C', 'c++': 'C++', cpp: 'C++', java: 'Java', javascript: 'JavaScript', js: 'JavaScript', python: 'Python', python3: 'Python' };
export function normalizeLanguage(value: string): Language { return languageMap[value.toLowerCase().replace(/\s/g, '')] ?? 'JavaScript'; }
export function problemId(url = location.href) { return url.match(/\/problems\/([^/?#]+)/)?.[1] ?? 'current-problem'; }
export function cleanText(value: string | undefined) { return (value ?? '').replace(/\s+/g, ' ').trim(); }
export function parseSseLine(line: string): string | null { if (!line.startsWith('data:')) return null; const data = line.slice(5).trim(); if (data === '[DONE]') return null; try { return JSON.parse(data).choices?.[0]?.delta?.content ?? ''; } catch { return ''; } }
