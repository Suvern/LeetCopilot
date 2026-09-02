# LeetLens Development and Test Plan

Last updated: 2026-09-02

## Delivery sequence

1. Scaffold the SolidJS, TypeScript, and Vite extension project.
2. Define Chrome message contracts, persisted settings, conversation limits, and prompt construction.
3. Implement the DeepSeek streaming client in the background service worker.
4. Implement the popup/settings flow before the in-page panel so configuration can be tested independently.
5. Implement `leetcode.cn` problem context extraction and editor-code extraction.
6. Build the injected panel, including conversation, shortcuts, cancellation, retry, copy, and theme behavior.
7. Add documentation, publishing metadata, CI checks, and a development-only test harness.
8. Run automated verification and real-browser smoke tests. Fix failures before final delivery.

## Test layers

### Unit tests

- Settings normalization and validation
- Conversation storage: per-problem keys, 30-message limit, clear behavior
- Prompt construction: language and action context
- SSE parser: normal deltas, completion, malformed input, API errors
- LeetCode URL/page identity parsing and bounded context helpers

### Build and static checks

- TypeScript type checking
- ESLint
- Production extension build
- Manifest shape and required generated assets validation
- Secret scan over tracked/source/build output to ensure the local DeepSeek key is absent

### Browser smoke tests

- Launch local Chrome with an isolated `--user-data-dir` and `--load-extension=<dist>`.
- Use Playwright's Chromium CDP support against that Chrome instance.
- Open a representative `https://leetcode.cn/problems/.../` problem page.
- Assert that LeetLens injects only one panel, auto-opens, can collapse/reopen, and renders its empty state.
- Exercise an injected fixture page as a deterministic fallback for DOM extraction and interaction coverage.
- Validate popup behavior against the unpacked extension where browser APIs are available.

### API smoke test

- Run only locally and only when the development `.env` has a usable key.
- Send a minimal harmless prompt to DeepSeek and assert streaming completion.
- Redact request headers and do not save response artifacts containing secrets.
- Treat unavailable network, exhausted balance, or provider-side rate limiting as environmental findings, not code success.

## Browser control capability

Verified locally before implementation:

- Node.js and npm are available.
- Google Chrome is installed at `C:\Program Files\Google\Chrome\Application\chrome.exe`.
- Playwright can be invoked through `npx playwright`.
- An isolated Chrome process was started with DevTools on port 9222. Its CDP endpoint successfully created and navigated a tab to `https://leetcode.cn/problems/two-sum/description/`, then returned the tab URL, title, and debugger WebSocket endpoint.

The automation will control a new, isolated Chrome process. It cannot attach to the user's personal browser session or assume the user is logged into LeetCode. Public problem pages can still be tested. If `leetcode.cn` changes its DOM or blocks automation, fixture tests remain deterministic and the live-page limitation will be recorded.

## Definition of done

- Every automated test described above is executed where its dependency is available.
- The extension builds into a Chrome-loadable directory.
- A live `leetcode.cn` smoke test demonstrates injection or documents the exact external blocker.
- A DeepSeek integration smoke test succeeds or reports a precise provider/network reason it could not run.
- Release files contain no actual key and explain how users configure their own key.
