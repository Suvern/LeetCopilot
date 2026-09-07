# 更新日志

本文件记录 LeetCopilot 的重要变更

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)

## [未发布]

### 新增

- 将服务商配置从单一当前平台扩展为多账户模型，支持保存多个平台并快速切换
- 增加服务商账户数据迁移，将旧版 DeepSeek / 千问配置平滑迁移到新的配置结构
- 增加 OpenAI Chat Completions 与 Anthropic Messages 协议适配器
- 增加 OpenAI、Kimi API、Kimi Code Plan、MiniMax 国内 API、MiniMax 国内 Token Plan、MiniMax API、MiniMax Token Plan、智谱 GLM 和 OpenRouter 预置平台
- 支持添加自定义平台，并可选择 OpenAI Chat Completions 或 Anthropic Messages 协议
- 增加 API 可用性检查测试和发布脚本测试

### 变更

- 扩展平台配置、模型、API Key 测试和自定义平台编辑流程
- 完善错误诊断，使不同协议和服务商的请求错误能被统一记录与展示
- 更新平台图标、README 平台列表及相关使用说明
- 将 CI 和 Release 工作流切换到 pnpm 11 所需的受支持 Node.js 版本
- 补充项目级 Claude/Codex 上下文说明，并整理 IDE 与本地工具配置的忽略规则

### 测试

- 扩充共享模块回归测试，覆盖服务商预置、协议请求、配置迁移和自定义平台校验
- 增加服务商 API 可用性测试入口，使用 `.env.example` 配置可选的真实 API 检查

## [0.1.0] - 2026-09-04

首个公开版本，完成从项目原型到可发布 Chrome 扩展的完整闭环

### 新增

- 创建 Chrome Manifest V3 扩展基础工程，支持在 `leetcode.cn` 题目页面运行
- 基于当前题目、编程语言和编辑器代码提问，并以流式方式显示 AI 回复
- 支持“分析思路”“给出提示”“优化复杂度”“生成完整解法”等快捷操作
- 支持从 AI 回复中提取完整代码或指定行补丁，并回写 LeetCode 编辑器
- 支持 DeepSeek 和千问，并提供 API Key 测试、保存和切换能力
- 支持浅色、深色和跟随系统主题，支持隐藏 LeetCode 原生 Leet 助手
- 增加题目上下文解析、代码语言识别、Markdown 渲染和 SSE 流式响应处理
- 增加请求超时、网络错误、HTTP 错误和流式错误的诊断记录，并对日志中的 API Key 做脱敏
- 增加内容脚本、后台服务和设置弹窗的基础端到端 Smoke Test

### 变更

- 将扩展正式更名为 LeetCopilot，统一 Manifest、图标、Logo、文档和发布包命名
- 使用 Ark UI 重建扩展设置界面，细化助手面板、设置弹窗、错误状态和诊断体验
- 将共享类型与协议拆分为领域模型、消息、设置、流式处理和服务商协议模块
- 将后台逻辑拆分为聊天服务、服务商客户端、编辑器网关、消息路由、通信和诊断模块
- 将题目上下文提取、面板布局、面板组件和设置控制器拆分为独立模块，降低页面入口复杂度
- 使用 pnpm 统一本地开发、测试、构建和 GitHub Actions 工作流

### 测试

- 增加共享解析、提示词、流式响应、设置规范化和代码操作提取测试
- 分离单元测试与浏览器 Smoke Test 命令，覆盖面板注入、设置保存、折叠展开、请求发送和流式回复

### 构建与发布

- 增加版本一致性检查，确保 `package.json` 与 Chrome Manifest 使用同一版本号
- 增加发布准备脚本和扩展打包脚本，生成 `release/LeetCopilot-<version>.zip`
- 增加 GitHub Actions Release 工作流，在推送稳定版本 tag 后自动校验、构建并创建 Release
- 补充中文 README、预览素材、贡献指南、行为准则和安全说明

## 初始提交 - 2026-09-02

### 新增

- 建立 Manifest V3 Chrome 扩展项目骨架，包含内容脚本、后台服务和设置弹窗入口
- 建立 Vite、TypeScript、Vitest 和基础 ESLint 配置
- 增加题目 URL、编程语言和代码片段的基础解析模块
- 增加提示词构建、Chrome Storage 设置读写和浏览器 Smoke Test 入口
- 增加 CI 工作流、Issue / Pull Request 模板、贡献指南、行为准则、许可证和安全说明

[未发布]: https://github.com/Suvern/LeetCopilot/compare/v0.1.0...develop/v0.2.0
[0.1.0]: https://github.com/Suvern/LeetCopilot/releases/tag/v0.1.0
