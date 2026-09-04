# LeetCopilot

LeetCopilot is an open-source Chrome Manifest V3 extension that adds a Chinese AI coding workspace beside the editor on `leetcode.cn` problem pages.

## Features

- Ask questions with the current problem, language, and editor code as context.
- Choose DeepSeek or Qwen-compatible providers and stream Markdown answers.
- Copy answers or apply complete solutions and line-scoped unified diffs to Monaco.
- Keep recent conversations and diagnostics locally per problem.
- Resize, collapse, theme, and hide the native LeetCode assistant panel.

LeetCopilot has no backend, telemetry, LeetCode login, submission automation, or code execution. API keys are entered in the popup, stored in Chrome local extension storage, and sent directly to the selected provider.

## Install From Source

Requirements: Node.js 20 or newer.

```bash
npm ci
npm run build
```

Then open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the generated `dist/` directory. Open the LeetCopilot popup on a supported problem page and configure a provider API key.

## Development

```bash
npm run typecheck
npm test
npm run lint
npm run build
npm run package
```

`npm run package` creates `release/LeetCopilot-<version>.zip`. Release archives contain no API keys or local environment files.

## Scope

The first release supports public `leetcode.cn` problem pages and the C, C++, Java, JavaScript, and Python editor languages. LeetCode DOM changes may require updates to context extraction.

## TODO

- Support more coding platforms, including additional LeetCode surfaces.
- Add editor right-click context-menu actions for common LeetCopilot requests.
- Expand editor and language compatibility as platform integrations mature.

## Security

Please do not include API keys, cookies, private code, or authorization headers in issues. See [SECURITY.md](SECURITY.md) for reporting guidance.

## License

[MIT](LICENSE)
