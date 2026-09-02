# LeetLens Product Decisions

Last updated: 2026-09-02

## Confirmed

- Product name: LeetLens
- Product type: Chrome Manifest V3 extension
- Primary experience: an AI conversation panel injected beside the LeetCode code editor
- Initial site scope: `leetcode.cn` problem pages only
- Default UI language: Simplified Chinese
- Supported coding languages: C, C++, Java, JavaScript, Python
- AI provider: official DeepSeek API only
- Default model: `deepseek-v4-flash`
- User may request complete, submit-ready solutions
- API key is entered and stored from the extension popup/settings surface
- The existing local `.env` value is for development testing only and must never be committed

## Product principles

- Conversation is the primary interaction. Presets are shortcuts that create normal user messages.
- The assistant should use the current problem, selected language, and editor code as context.
- The UI should remain useful when page scraping or editor extraction is unavailable.
- The extension should explain failures clearly and allow retry without losing the conversation.
- User code and API keys remain local to the browser unless sent as part of an explicit AI request.

## Initial preset actions

- Analyze approach
- Give a hint
- Check my code
- Explain my code
- Optimize complexity
- Generate a complete solution

## Explicit non-goals for the first release

- Contest pages and contest-specific workflows
- LeetCode account authentication or submission automation
- Providers other than DeepSeek
- Server-side proxy, account system, telemetry, or cloud conversation sync
- Automatic code execution or judging
- Automatic scraping of unrelated LeetCode pages

## UX defaults

- The panel opens on a supported problem page and can be collapsed.
- A new problem navigation resets problem context and starts a fresh conversation.
- Conversation history is kept for the active tab/session; persistent history is optional and not required for v1.
- API key setup is surfaced in the popup and when a request is attempted without a key.
- AI responses support Markdown and fenced code blocks with copy actions.
- The panel opens automatically on supported `leetcode.cn` problem pages.
- Conversations are persisted locally per problem, capped at the latest 30 messages.
- The user can edit the DeepSeek model name; `deepseek-v4-flash` is the default.
- The temporary local development build pre-fills the API key from the ignored `.env` file and uses `deepseek-v4-flash`; this build must not be published.
- The panel follows the detected LeetCode light/dark theme.
