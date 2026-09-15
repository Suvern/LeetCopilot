# Chrome Web Store Listing — LeetCopilot

> Last Updated: 2026-09-15

## Store Listing

**Extension Name**
<!-- Must match manifest.json "name". Max 75 characters. -->
LeetCopilot - AI LeetCode Assistant

**Short Description**
<!-- Max 132 characters. Shown in search results and tiles. Be specific about function. -->
Adds a Chinese AI coding assistant to leetcode.cn problem pages. Streams hints, code,
and editor edits powered by DeepSeek or 通义千问. Bring your own API key.

**Detailed Description**
<!-- Max 16,000 characters. WRITE FROM A USER'S PERSPECTIVE — what the extension
     does FOR them, not HOW it works. -->

LeetCopilot 把一个 AI 编程助手直接放进你的 LeetCode 题目页。

仅支持 leetcode.cn（中文站）。填入你自己的 DeepSeek 或 通义千问 API Key 即可使用，
不需要注册账号，没有后端服务器。

打开任意一道题目，编辑器旁边会出现一个助手面板。你可以直接提问，也可以用快捷
按钮一键获取：
- 分析思路 — 拆解题目、给出关键点
- 给出提示 — 渐进式提示，不直接给答案
- 优化复杂度 — 给出时间和空间复杂度更优的写法
- 生成完整解法 — 直接产出可运行的代码

AI 的回复是流式的，逐字打出，不必等待。回复里的代码可以一键应用到编辑器，AI 会
按 LeetCode 编辑器的格式自动套用缩进和补全括号。

如果你不想看到 LeetCode 自带的"Leet"付费助手，弹窗里有个开关可以一键隐藏。

使用步骤：
1. 从 Chrome 应用商店安装本扩展
2. 打开任意一道 leetcode.cn 题目
3. 点击工具栏的 LeetCopilot 图标，在弹窗中填入服务商（DeepSeek / 通义千问）和对应的 API Key
4. 点击"测试连接"确认配置可用
5. 回到题目页，助手面板会自动出现，开始提问即可

隐私与安全：
- 你的 API Key 只保存在本机的 Chrome 扩展存储中，不会上传到任何中间服务器
- 扩展只把题目信息、你的代码、对话消息发给你自己选择的服务商
- 不收集任何分析数据，不投放广告，不混淆代码，全部源码公开在 GitHub

支持语言：C、C++、Java、JavaScript、Python

需要帮助或提交反馈：https://github.com/Suvern/LeetCopilot/issues

---

LeetCopilot puts an AI coding assistant right next to your LeetCode problem page.

Currently supports leetcode.cn only. Bring your own DeepSeek or 通义千问 API key — no
account, no backend, no telemetry.

When you open any problem, a side panel appears next to the editor. You can ask freely
or use the shortcut buttons for:
- Analyze the approach — break down the problem and surface the key insights
- Give a hint — progressive hints without spoiling the answer
- Optimize complexity — propose a faster or leaner solution
- Generate a full solution — drop in runnable code

Replies stream token by token. Code blocks in the reply can be applied to the editor
with one click; LeetCopilot matches LeetCode's indentation and bracket style.

If you want to hide LeetCode's paid "Leet" assistant, there's a toggle in the popup.

How to use:
1. Install LeetCopilot from the Chrome Web Store
2. Open any leetcode.cn problem
3. Click the LeetCopilot toolbar icon, pick a provider (DeepSeek / 通义千问) and paste
   your API key
4. Click "Test connection" to verify
5. Return to the problem — the assistant panel will appear. Start chatting.

Privacy & safety:
- Your API key is stored only in your browser's local extension storage, never on a
  middleman server
- The extension only sends problem info, your code, and chat messages to the provider
  you selected
- No analytics, no ads, no obfuscation. Full source on GitHub

Supported languages: C, C++, Java, JavaScript, Python

Support & feedback: https://github.com/Suvern/LeetCopilot/issues

**Category**
Developer Tools

**Single Purpose**
Adds an AI-powered assistant panel to LeetCode problem pages that streams coding hints
and applies suggested edits back to the LeetCode editor.

**Primary Language**
Chinese (Simplified) — also documented in English above.

---

## Graphics & Assets

| Asset | Dimensions | Status | Filename / Location |
|-------|-----------|--------|---------------------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `public/leetcopilot-icon-128.png` |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | 🔴 Needs update | `docs/media/workspace.png` is 1440×876 — needs cropping |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | 🔴 Needs update | Re-screenshot popup settings in 1280×800 |
| Screenshot 3 [RECOMMENDED] | 1280×800 or 640×400 | 🔴 Needs update | Re-screenshot streaming reply in 1280×800 |
| Screenshot 4 | 1280×800 or 640×400 | 🔴 Needs update | Re-screenshot editor-apply result |
| Screenshot 5 | 1280×800 or 640×400 | ⬜ Not created | — |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | — |
| Marquee Promo Tile | 1400×560 | ⬜ Not created | — |

### Screenshot Notes
- The existing `docs/media/` GIFs and PNGs were captured at non-standard sizes for the
  project README and do not match CWS 1280×800 / 640×400 requirements.
- Recommend capturing screenshots against a 1280×800 viewport (or HiDPI equivalent)
  with the assistant panel + editor visible.
- Use the existing `workspace.png` as a starting reference and trim to 1280×800.

---

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Saves your provider choice, API key(s), theme/UI preferences, chat history per problem (capped at 30 messages), and capped error logs (50 entries) on your device. None of this leaves your machine except as part of a request you send to the AI provider you selected. |
| `scripting` | permissions | Used to write AI-suggested code edits back into LeetCode's Monaco editor (via `chrome.scripting.executeScript`) when you click "Apply" on a code block in the assistant panel. |
| `https://leetcode.cn/*` | host_permissions | Required so the content script can inject the assistant panel and read the problem page DOM (title, description, examples, constraints, tags, language, current code) on `https://leetcode.cn/problems/*` pages only. |
| `https://api.deepseek.com/*` | host_permissions | Required to call DeepSeek's chat completions API when you select DeepSeek as the provider. The request includes your selected model, problem context, chat messages, and your API key as a Bearer token. |
| `https://dashscope.aliyuncs.com/*` | host_permissions | Required to call DashScope (通义千问) chat completions when you select 千问 as the provider. Same payload structure as the DeepSeek host permission. |

> The `activeTab` permission that was previously declared is **not used** anywhere in
> the source and has been removed in the version prepared for CWS submission. Tab
> access is provided through `host_permissions` + `scripting`, which is the standard
> pattern for inserting-and-editing on a specific site.

---

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** Yes (limited, as detailed below)

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | No | — | — | — |
| Health info | No | — | — | — |
| Financial info | No | — | — | — |
| Authentication info (API keys) | Yes — entered by user, stored locally only | Only as Bearer token to the AI provider you selected | Authenticate requests to the AI provider | Only to the AI provider you selected, as a Bearer token in HTTPS requests |
| Personal communications | No | — | — | — |
| Location | No | — | — | — |
| Web history | No | — | — | — |
| User activity (LeetCode problem context + editor code, only on `leetcode.cn/problems/*`) | Yes — read from the active problem page | Sent to your selected AI provider with each chat request | Build the prompt for the AI assistant | Only to the AI provider you selected |
| Website content (problem title, description, examples, constraints, tags) | Yes — read from the active problem page | Sent to your selected AI provider with each chat request | Build the prompt for the AI assistant | Only to the AI provider you selected |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

---

## Privacy Policy

**Privacy Policy URL** [REQUIRED]
<!-- Publish to a publicly accessible URL. Recommended: GitHub Pages. -->

`https://github.com/Suvern/LeetCopilot/blob/main/PRIVACY.md`

(Raw markdown is acceptable. For a styled page, enable GitHub Pages on the repo and
point to `https://<username>.github.io/LeetCopilot/PRIVACY` — same file.)

---

## Distribution

**Visibility**: Public
**Regions**: All regions

## Developer Info

**Publisher Name**
Suvern

**Contact Email**
suvern.w@gmail.com

**Support URL**
https://github.com/Suvern/LeetCopilot/issues

**Homepage URL**
https://github.com/Suvern/LeetCopilot

---

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 0.1.0 | 2026-09-04 | Initial public release | Draft |
| 0.1.0-cws | 2026-09-15 | Removed unused `activeTab` permission; added `PRIVACY.md` and `CHROMEWEBSTORE.md` for CWS submission | Draft |

---

## Review Notes

### Known Issues / Limitations
- Only supports `leetcode.cn` (Chinese LeetCode); `leetcode.com` (international) is not
  supported and is listed as TODO in the README. CWS listing should make this clear.
- The "LeetCopilot" name and the description's mention of LeetCode are intended to
  describe a third-party integration, not to imply affiliation with LeetCode/力扣. If
  the review team flags this, consider a name change (e.g., `CN-LeetCopilot`,
  `LeetCode CN Helper`).

### Rejection History
| Date | Reason | Fix Applied | Resubmitted |
|------|--------|-------------|-------------|
| —    | —      | —           | —            |