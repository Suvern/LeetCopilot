import { cleanText, normalizeLanguage, problemId } from '../shared/parse';
import type { ProblemContext } from '../shared/domain';

function selectedText(selectors: string[]) {
  for (const selector of selectors) {
    const element = document.querySelector<HTMLElement>(selector);
    if (element?.innerText) return cleanText(element.innerText);
  }
  return '';
}

export function extractContext(): ProblemContext {
  const workbench = (document.querySelector('#qd-content') ?? document.querySelector('main') ?? document.body).cloneNode(true) as HTMLElement;
  workbench.querySelector('#leetcopilot-root')?.remove();
  const heading = selectedText(['h1', '[data-cy="question-title"]']);
  const bodyText = cleanText(workbench.innerText).slice(0, 18000);
  const title = heading || document.title.replace(/[-|].*/, '').trim() || '当前题目';
  const difficulty = selectedText(['[diff="easy"]', '[diff="medium"]', '[diff="hard"]']) || (bodyText.match(/简单|中等|困难/)?.[0] ?? '未知');
  const languageLabel = [...document.querySelectorAll<HTMLElement>('button, [role="button"], [role="combobox"]')]
    .map((element) => cleanText(element.innerText || element.textContent))
    .find((value) => /^(C\+\+|C|Java|JavaScript|TypeScript|Python|Python3)$/.test(value))
    || selectedText(['[data-cy="lang-select"]', '.ant-select-selection-item'])
    || 'JavaScript';
  const editor = [...document.querySelectorAll<HTMLTextAreaElement>('textarea.inputarea, textarea')]
    .find((element) => element.value.trim() && element.offsetParent !== null)
    ?? document.querySelector<HTMLTextAreaElement>('[data-cy="code-area"]');
  return { id: problemId(), title, difficulty, description: bodyText, examples: '', constraints: '', tags: [], language: normalizeLanguage(languageLabel), code: editor?.value ?? '', url: location.href };
}

export async function extractContextWithEditor(): Promise<ProblemContext> {
  const context = extractContext();
  try {
    const response = await chrome.runtime.sendMessage({ type: 'read-editor' });
    return response?.ok && typeof response.code === 'string' ? { ...context, code: response.code } : context;
  } catch {
    return context;
  }
}
