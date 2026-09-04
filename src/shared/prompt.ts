import type { ProblemContext } from './types';
export const systemPrompt = '你是 LeetCopilot，一名严谨、耐心的 LeetCode 编程助手。优先使用用户当前选择的编程语言。回答要具体、可执行，并准确遵循用户或快捷指令对代码输出范围的限制。不要声称运行过代码。\n\n代码应用格式：只有在明确要求完整代码时，才给出可直接替换编辑器的完整程序；使用一个代码围栏，并在语言后加 leetcopilot-full，例如 ```typescript leetcopilot-full。若只修改现有代码的连续行，必须使用 unified diff 围栏，例如 ```diff，且包含 @@ -起始行,行数 +起始行,行数 @@ hunk；不要只给没有行号的局部代码。除非用户明确要求，不要在一个完整解法中混入多个可应用代码块。';

export const shortcuts = [
  '分析思路',
  '给出提示',
  '检查我的代码',
  '解释我的代码',
  '优化复杂度',
  '生成完整解法',
] as const;

export type Shortcut = typeof shortcuts[number];

const shortcutInstructions: Record<Shortcut, string> = {
  '分析思路': '请分析这道题的解题思路。按“核心观察、算法步骤、正确性要点、时间和空间复杂度”组织回答。只讲思路，不要给出任何代码、伪代码、代码围栏、diff 或完整实现。',
  '给出提示': '请给出循序渐进的解题提示：先给方向，再给关键观察，最后给出接近解法的提示；每层提示都应让用户仍能自己完成推导。不要给出完整算法。不要给出任何代码，包括伪代码、代码围栏、diff 和完整实现。',
  '检查我的代码': '请检查当前编辑器中的代码是否正确。先给出结论，再指出具体问题、触发问题的输入和原因，并说明最小修复方向。除非确有必要，不要输出代码；需要给出修改时，只能输出带行号 hunk 的 unified diff，绝不能输出完整程序。',
  '解释我的代码': '请解释当前编辑器中的代码：说明各部分职责、关键数据结构或不变量、主流程，以及时间和空间复杂度。聚焦现有代码，不要给出替代实现、完整代码、伪代码、代码围栏或 diff。',
  '优化复杂度': '请评估当前编辑器代码的时间和空间复杂度，指出瓶颈，并给出可行的优化思路、取舍和目标复杂度。不要输出完整程序；如必须展示修改，只能输出带行号 hunk 的 unified diff。',
  '生成完整解法': '请给出完整可提交的解法：先简要说明思路和复杂度，再输出一个使用当前语言的完整程序。完整程序必须放在唯一的 leetcopilot-full 代码围栏中。',
};

export function shortcutInstruction(value: string) { return Object.hasOwn(shortcutInstructions, value) ? shortcutInstructions[value as Shortcut] : value; }

export function buildContext(problem: ProblemContext) { return `题目：${problem.title}\n难度：${problem.difficulty}\n语言：${problem.language}\n题目描述：${problem.description}\n示例：${problem.examples}\n约束：${problem.constraints}\n当前代码：\n\`\`\`${problem.language}\n${problem.code}\n\`\`\``; }
export function userPrompt(problem: ProblemContext, text: string) { return `${buildContext(problem)}\n\n用户请求：${text}`; }
