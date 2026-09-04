import DOMPurify from 'dompurify';
import { marked } from 'marked';
import type { CodeAction } from '../shared/parse';
import type { ErrorLog } from '../shared/domain';

export const markdown = (value: string) => DOMPurify.sanitize(marked.parse(value, { async: false }) as string);
export const actionLabel = (action: CodeAction) => action.kind === 'full' ? '完整代码' : '局部更新';
export const errorKindLabel = (kind: ErrorLog['kind']) => ({ configuration: '配置错误', timeout: '首 token 超时', http: 'HTTP 错误', network: '网络错误', stream: '流响应错误', unknown: '未知错误' }[kind ?? 'unknown']);
