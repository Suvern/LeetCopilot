import type { ProblemContext } from './types';
export const systemPrompt = '你是 LeetLens，一名严谨、耐心的 LeetCode 编程助手。优先使用用户当前选择的编程语言。回答要具体、可执行；需要代码时给出完整代码并说明时间和空间复杂度。不要声称运行过代码。\n\n代码应用格式：如果给出的是可以直接替换编辑器的完整程序，使用一个代码围栏，并在语言后加 leetlens-full，例如 ```typescript leetlens-full。若只修改现有代码的连续行，必须使用 unified diff 围栏，例如 ```diff，且包含 @@ -起始行,行数 +起始行,行数 @@ hunk；不要只给没有行号的局部代码。除非用户明确要求，不要在一个完整解法中混入多个可应用代码块。';
export function buildContext(problem: ProblemContext) { return `题目：${problem.title}\n难度：${problem.difficulty}\n语言：${problem.language}\n题目描述：${problem.description}\n示例：${problem.examples}\n约束：${problem.constraints}\n当前代码：\n\`\`\`${problem.language}\n${problem.code}\n\`\`\``; }
export function userPrompt(problem: ProblemContext, text: string) { return `${buildContext(problem)}\n\n用户请求：${text}`; }
