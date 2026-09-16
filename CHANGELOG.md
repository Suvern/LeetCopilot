# Changelog

本文件记录面向用户的重要变更。版本遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [0.2.0] - 开发中

### 新增

- 支持保存多个 AI 平台账户，并可在设置中随时切换；每个平台独立保存 API Key 和模型名称。
- 新增 OpenAI、Anthropic、Kimi API、Kimi Code Plan、MiniMax CN API、MiniMax CN Token Plan、MiniMax API、MiniMax Token Plan、智谱 GLM 与 OpenRouter 预置平台。
- 智谱平台名称补充为“智谱 GLM（BigModel）”，默认模型更新为 `glm-5.3-flash`。
- 支持自定义兼容 OpenAI Chat Completions 或 Anthropic Messages 的平台，可填写名称、Base URL、模型和协议。
- 新增 Anthropic Messages 请求与流式响应适配。
- 新增 API Key 可用性测试，以及各平台的回归/API 可用性测试覆盖。
- 请求失败时展示可展开的错误日志，包含实际使用的平台、模型、端点、HTTP 状态、重试次数和请求 ID。

### 改进

- 升级设置存储结构，并自动迁移 v0.1.0 的 DeepSeek/千问设置；已有 API Key 和模型配置可继续使用。
- 错误日志会自动脱敏所有已保存的 API Key。
- 发布流程会校验 Git tag、扩展 Manifest 与 package 版本一致性，并使用受支持的 Node.js 版本构建。

### 修复

- 修复切换平台后保存设置时，旧版 `provider` 字段可能覆盖当前平台的问题；现在请求会使用当前所选账户对应的 API Key、模型和端点。

## [0.1.0] - 2026-09-04

### 新增

- 初始版本，支持在 `leetcode.cn` 中文站的题目页使用 LeetCopilot。
- 根据当前题目、编程语言和编辑器代码生成上下文，支持流式追问解题思路和完整解法。
- 支持 DeepSeek 与千问 API Key、模型名称配置和连接测试。
- 支持隐藏 LeetCode 原生的付费 Leet 助手。
- 支持浅色、深色和跟随系统主题。
- 支持 C、C++、Java、JavaScript、TypeScript 和 Python 代码上下文。

[0.2.0]: https://github.com/Suvern/LeetCopilot/compare/v0.1.0...develop/v0.2.0
[0.1.0]: https://github.com/Suvern/LeetCopilot/releases/tag/v0.1.0
