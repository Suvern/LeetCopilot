import type { ProblemContext } from './types';
export const systemPrompt = '你是 LeetLens，一名严谨、耐心的 LeetCode 编程助手。优先使用用户当前选择的编程语言。回答要具体、可执行；需要代码时给出完整代码并说明时间和空间复杂度。不要声称运行过代码。';
export function buildContext(problem: ProblemContext) { return `题目：${problem.title}\n难度：${problem.difficulty}\n语言：${problem.language}\n题目描述：${problem.description}\n示例：${problem.examples}\n约束：${problem.constraints}\n当前代码：\n\`\`\`${problem.language}\n${problem.code}\n\`\`\``; }
export function userPrompt(problem: ProblemContext, text: string) { return `${buildContext(problem)}\n\n用户请求：${text}`; }
