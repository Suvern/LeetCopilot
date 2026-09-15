# LeetCopilot Privacy Policy / LeetCopilot 隐私政策

> Last updated / 最后更新: 2026-09-15

This extension ("LeetCopilot") is open-source, free, and ad-free. It does not have a
backend, does not collect analytics, and does not sell data. This document describes
exactly what data the extension handles and how, in plain language.

LeetCopilot 是一款开源、免费、无广告的浏览器扩展。它没有自己的后端服务器，不收集任何
分析数据，也不会出售任何用户数据。本文档用清晰的语言说明扩展会处理哪些数据、如何处理。

---

## 1. Data the extension handles / 扩展处理的数据

| Data / 数据 | Source / 来源 | Storage / 存储位置 | Sent off-device? / 是否外传 |
|-------------|---------------|--------------------|----------------------------|
| **API key(s) you enter / 你填写的 API Key** | User input in popup / 弹窗中用户输入 | `chrome.storage.local` (never synced) / 本地存储（不同步） | Only sent to the provider you selected (DeepSeek / 千问) as a Bearer token / 仅以 Bearer token 形式发往你选择的服务商 |
| **LeetCode problem page content / 题目页内容** | Read from `leetcode.cn` DOM / 从 `leetcode.cn` 页面 DOM 读取 | Not stored / 不存储 | Sent to your selected AI provider with each request / 每次请求时随同提示词发往你选择的服务商 |
| **Your editor code / 你编辑器里的代码** | Read from LeetCode's Monaco editor / 从 LeetCode 编辑器读取 | Not stored / 不存储 | Sent to your selected AI provider with each request / 每次请求时发往你选择的服务商 |
| **Chat messages (last 30 per problem) / 对话消息（每题最多保留 30 条）** | Your messages + AI replies / 你的提问 + AI 回复 | `chrome.storage.local` | Not sent anywhere except back to your selected provider during the conversation / 仅在该题会话中发回所选服务商 |
| **Error diagnostics (capped at 50 entries) / 错误日志（最多保留 50 条）** | Auto-generated on failed requests / 请求失败时自动生成 | `chrome.storage.local` | Not sent anywhere / 不外传 |
| **Settings (provider, model, theme, UI prefs) / 设置项（服务商、模型、主题、UI 偏好）** | User input / 用户输入 | `chrome.storage.local` | Not sent anywhere / 不外传 |

What the extension **does not** do / 扩展**不会**做的事：

- No analytics, telemetry, tracking pixels, or fingerprinting / 不收集分析、埋点、追踪像素或指纹
- No advertising / 不投放广告
- No sale of data to third parties / 不向第三方出售数据
- No remote code execution / 不远程加载执行代码
- No code obfuscation / 代码未混淆
- No login, no account, no server-side profile / 无登录、无账号、无服务端档案
- No data transmitted to anyone other than the AI provider you configured / 除你配置的服务商外不向任何第三方传输数据

---

## 2. Third-party services the extension talks to / 扩展会访问的第三方服务

The extension only makes outbound HTTP requests to the AI provider you choose in the
popup settings. The current supported providers are:

扩展只会向你弹窗中选定的 AI 服务商发起 HTTP 请求。当前支持的服务商：

| Provider / 服务商 | Endpoint / 端点 | What is sent / 传输内容 | Their policy / 对方隐私政策 |
|-------------------|-----------------|--------------------------|------------------------------|
| DeepSeek | `https://api.deepseek.com/chat/completions` | Problem context + editor code + chat messages + Bearer token (your API key) / 题目上下文、编辑器代码、对话消息、Bearer token（你的 API Key） | https://platform.deepseek.com/privacy |
| 阿里云百炼 / 千问 (DashScope) | `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` | Same as above / 同上 | https://terms.aliyun.com/legal-agreement/terms/suit_bu1_ali_cloud/suit_bu1_ali_cloud20210728181410_website.html |

You can switch providers or stop using the extension at any time. Removing the extension
deletes everything in `chrome.storage.local`.

你可以随时切换服务商或停止使用。卸载扩展即删除 `chrome.storage.local` 里的全部数据。

---

## 3. Permissions explained / 权限说明

The extension declares the following in `manifest.json` / 扩展在 `manifest.json` 中声明：

- `storage` — Save settings, API keys, chat history, and error logs locally on your
  device. / 用于在本地保存设置、API Key、对话历史和错误日志
- `scripting` — Apply AI-recommended code edits back into the LeetCode editor on
  `leetcode.cn` problem pages. / 用于把 AI 给出的代码修改写回 `leetcode.cn` 题目页编辑器
- Host permission `https://leetcode.cn/*` — Inject the assistant UI and read the
  problem/editor DOM only on LeetCode problem pages. / 用于在 LeetCode 题目页注入助手面板并读取题目/编辑器内容
- Host permission `https://api.deepseek.com/*` — Call DeepSeek's API when you select
  DeepSeek as the provider. / 当你选择 DeepSeek 时调用其 API
- Host permission `https://dashscope.aliyuncs.com/*` — Call DashScope (千问) when you
  select 千问 as the provider. / 当你选择千问时调用其 API

---

## 4. Data retention / 数据保留

- Chat history: last 30 messages per problem, stored only on your device. / 对话历史：每题最多保留 30 条，仅存于本机
- Error logs: last 50 entries, stored only on your device. / 错误日志：最多保留 50 条，仅存于本机
- API keys, settings: stored until you uninstall the extension or click "Clear" in the
  popup. / API Key、设置：一直保留直到你卸载扩展或在弹窗中点击「清除」

Uninstalling the extension removes all data stored by LeetCopilot.
卸载扩展即删除全部 LeetCopilot 存储的数据。

---

## 5. Children's privacy / 儿童隐私

LeetCopilot is not directed at children under 13 and we do not knowingly collect data
from children.
LeetCopilot 不面向 13 岁以下儿童，也不会明知故犯地收集儿童数据。

---

## 6. Changes to this policy / 政策变更

This document lives in the project's GitHub repository. Any changes will be tracked via
git history and noted in `CHANGELOG.md`.
本文档存放在项目 GitHub 仓库中，任何变更都会通过 git 历史记录并写入 `CHANGELOG.md`。

---

## 7. Contact / 联系方式

- Source code / 源代码: https://github.com/Suvern/LeetCopilot
- Issue tracker / 问题反馈: https://github.com/Suvern/LeetCopilot/issues
- Email / 邮箱: suvern.w@gmail.com