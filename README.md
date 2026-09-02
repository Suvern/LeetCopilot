# LeetLens

LeetLens is an open-source Chrome extension that adds a Chinese AI programming workspace to `leetcode.cn` problem pages. It uses the official DeepSeek API to discuss approaches, review the current code, explain solutions, optimize complexity, and generate complete solutions in C, C++, Java, JavaScript, or Python.

## Features

- In-page conversation panel beside the LeetCode editor
- Automatic problem context and selected-language context
- Streaming DeepSeek responses with Markdown and code-copy support
- Presets for hints, approach analysis, code review, explanation, optimization, and full solutions
- Per-problem local history, capped at the latest 30 messages
- Resizable, collapsible panel with light/dark theme support
- No LeetCode login, submission automation, telemetry, or server-side proxy

## Install locally

1. Install Node.js 20 or newer.
2. Run `npm install` and `npm run build`.
3. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the `dist` directory.
4. Open the extension popup on a `leetcode.cn` problem page and enter your DeepSeek API key and model name.

The default model is `deepseek-chat`. The extension also accepts other DeepSeek model names supported by your account.

## Development

```bash
npm install
npm run typecheck
npm test
npm run lint
npm run build
```

The local `.env` file is ignored by Git. For this temporary development build, the `DEEPSEEK_API_KEY` value in `.env` is embedded into the generated local `dist` defaults so the unpacked extension can be tested immediately. Do not publish this `dist` directory or use this mode for distribution: anyone who can read the extension bundle can recover the key. Remove or rotate the key before sharing the project. Copy `.env.example` when setting up local tooling.

## Privacy and security

Your API key is stored in Chrome local extension storage and sent directly to `api.deepseek.com` when you send a request. In the temporary local development build, the ignored `.env` key is also embedded as an initial default. Problem text, editor code, and conversation messages are sent to DeepSeek as request context. LeetLens has no backend and does not collect analytics. Review DeepSeek's current terms and privacy policy before using sensitive code. Do not share your key or commit it to source control.

## Limitations

The first release targets public `leetcode.cn` problem pages. It does not support `leetcode.com`, contests, automatic execution, judging, submissions, or account data. LeetCode DOM changes may affect automatic context extraction; the conversation remains available when some context cannot be read.

## License

MIT. See [LICENSE](LICENSE).
