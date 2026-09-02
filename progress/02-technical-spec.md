# LeetLens Technical Specification

Last updated: 2026-09-02

## Runtime shape

```text
LeetCode problem tab
  content script -> injected SolidJS panel
  content script <-> background service worker
                         -> DeepSeek Chat Completions API (SSE)
popup/settings -> chrome.storage.local
```

## Planned modules

- `src/content`: page detection, problem/editor context extraction, panel mount, tab lifecycle
- `src/background`: message handling and DeepSeek request/stream forwarding
- `src/popup`: API key and model settings
- `src/shared`: message contracts, storage, prompt construction, parsing helpers
- `src/ui`: reusable SolidJS components and styles

## Permissions and hosts

- `storage`: persist user settings locally
- `activeTab`: read the active LeetCode tab when the extension is invoked
- `scripting`: support content-script injection where needed by the popup action
- Host permission: `https://leetcode.cn/*` for the problem-page content script and API workflow
- DeepSeek host permission: `https://api.deepseek.com/*`

The implementation should avoid broad host permissions and should not request LeetCode account data.

## API flow

1. The content script builds a request containing the user message and current page context.
2. The background worker loads the API key from `chrome.storage.local`.
3. The worker calls DeepSeek's OpenAI-compatible `/chat/completions` endpoint with streaming enabled.
4. SSE chunks are parsed incrementally and forwarded to the originating tab.
5. The content panel appends deltas, handles completion, cancellation, and structured errors.

The API key is never placed in page DOM, URL parameters, source control, or public documentation. Since this is a client-side extension, users must understand that their own key is used from the browser and should be scoped/rotated according to their provider account's capabilities.

## Context extraction

- Extract title, difficulty, description, examples, constraints, and tags from visible problem-page data where possible.
- Support the Chinese LeetCode SPA URL and DOM conventions first; do not claim `.com` compatibility in v1.
- Detect the selected editor language from LeetCode controls.
- Read Monaco editor text through the page context bridge when available.
- Send bounded context to avoid oversized requests.
- If extraction fails, preserve the conversation and tell the user which context is missing.

## Error states

- Missing API key: actionable settings prompt
- Invalid key / unauthorized: explain key failure without exposing the key
- Rate limit: explain and offer retry
- Network/API failure: preserve typed message and conversation
- Stream interrupted: preserve partial response and offer retry
- Unsupported page: do not inject the full assistant workflow

## Acceptance checklist

- `npm run typecheck` passes
- `npm run build` produces a loadable extension directory
- No API key appears in tracked files or production source output
- Popup can save, update, clear, and validate the local key presence
- Problem panel injects once, survives normal SPA navigation, and can collapse/reopen
- All five languages appear in context when selected on LeetCode
- Preset actions produce ordinary conversation messages
- Streaming output, Markdown, code copy, cancel, retry, and empty/error states work
- README explains local development, Chrome loading, API key setup, privacy, and limitations
- Conversation persistence is keyed by problem identity and capped at 30 messages per problem.

## Test implementation constraint

Browser smoke tests will launch a separate Chrome profile through Playwright/CDP. They cannot access the user's existing Chrome profile, existing login state, extensions, or personal browsing data.
