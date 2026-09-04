import type { EditorResponse } from '../shared/messages';

export async function readEditorCode(tabId: number | undefined): Promise<EditorResponse> {
  if (tabId === undefined) return { ok: false, error: '找不到当前页面。' };

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        const page = globalThis as typeof globalThis & { lcMonaco?: any; monaco?: any };
        const editors = (page.lcMonaco ?? page.monaco)?.editor?.getEditors?.() ?? [];
        const editor = editors.find((item: any) => item.getModel?.()?.getValue?.().trim()) ?? editors[0];
        const code = editor?.getModel?.()?.getValue?.();
        return typeof code === 'string' ? { ok: true, code } : { ok: false, error: '找不到 Monaco 代码编辑器。' };
      },
    });
    return normalizeEditorResponse(results[0]?.result, '无法读取代码编辑器。');
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : '无法读取代码编辑器。' };
  }
}

export async function applyCode(code: string, startLine: number | undefined, endLine: number | undefined, tabId: number | undefined): Promise<EditorResponse> {
  if (tabId === undefined) return { ok: false, error: '找不到当前页面。' };

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: (nextCode: string, firstLine?: number, lastLine?: number) => {
        const page = globalThis as typeof globalThis & { lcMonaco?: any; monaco?: any };
        const api = page.lcMonaco ?? page.monaco;
        const editors = api?.editor?.getEditors?.() ?? [];
        const editor = editors.find((item: any) => item.getModel?.()?.getValue?.().trim()) ?? editors[0];
        const model = editor?.getModel?.();
        if (!api || !editor || !model) return { ok: false, error: '找不到 Monaco 代码编辑器。' };
        const first = firstLine ?? 1;
        const last = lastLine ?? model.getLineCount();
        if (!Number.isInteger(first) || !Number.isInteger(last) || first < 1 || last < first || last > model.getLineCount()) return { ok: false, error: 'AI 返回的代码行号超出编辑器范围。' };
        const endColumn = model.getLineMaxColumn(last);
        editor.executeEdits('leetcopilot', [{ range: new api.Range(first, 1, last, endColumn), text: nextCode }]);
        editor.pushUndoStop?.();
        editor.focus?.();
        return { ok: true };
      },
      args: startLine === undefined || endLine === undefined ? [code] : [code, startLine, endLine],
    });
    return normalizeEditorResponse(results[0]?.result, '无法更新代码编辑器。');
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : '无法注入编辑器更新。' };
  }
}

function normalizeEditorResponse(value: unknown, fallback: string): EditorResponse {
  if (!value || typeof value !== 'object') return { ok: false, error: fallback };
  const result = value as { ok?: unknown; code?: unknown; error?: unknown };
  if (result.ok === true) return { ok: true, ...(typeof result.code === 'string' ? { code: result.code } : {}) };
  return { ok: false, error: typeof result.error === 'string' ? result.error : fallback };
}
