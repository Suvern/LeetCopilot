# LeetLens

LeetLens is an open-source Chrome extension that adds a focused Chinese AI programming workspace beside the editor on `leetcode.cn` problem pages.

## Features

- DeepSeek and Qwen provider selection
- Streaming answers with Markdown and code-copy support
- Problem context, current language, and editor code included in requests
- Per-problem conversation history stored locally
- Error details and retry diagnostics available in the conversation panel
- First-token timeout retry and cancellation
- Resizable, collapsible panel with light/dark themes and reduced-motion support
- Accessible Ark UI controls in the settings popup and error-log disclosure
- No backend, telemetry, LeetCode login, submission automation, or server-side proxy

## Install a release

1. Download `LeetLens-<version>.zip` from the [GitHub Releases](https://github.com/Suvern/LeetLens/releases) page.
2. Unzip it into a local directory.
3. Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the unzipped directory.
4. Open the LeetLens toolbar popup on a `leetcode.cn` problem page, select a provider, enter its API key, and save.

Releases are built without API keys. Keys are stored only in Chrome's local extension storage after you enter them.

## Local development

Requirements: Node.js 20 or newer.

```bash
npm install
npm run typecheck
npm test
npm run lint
npm run build
npm run package
```

`npm run build` writes the unpacked extension to `dist/`. `npm run package` builds first and writes `release/LeetLens-<version>.zip` with `manifest.json` at the archive root. Generated `dist/` and `release/` directories are ignored by Git.

The extension does not read `.env` or embed development credentials. Use the popup to configure a local API key. The `.env.example` file is retained only as a reminder of the old setup and does not need to be copied for normal development.

## Providers

The default models are `deepseek-v4-flash` for DeepSeek and `qwen-plus` for Qwen. You can enter another model supported by the selected account. The **获取 API Key** link opens the selected provider's official key-management page.

## Release workflow

Every push and pull request runs typecheck, tests, lint, build, and package verification. To publish a release, update the version in `package.json`, commit the change, and push a matching tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions checks that the tag matches `package.json`, then creates a GitHub Release and uploads the ZIP artifact. The repository requires `contents: write` for this workflow.

## Privacy and security

When you send a message, the selected provider receives the problem description, editor code, and conversation messages. API keys are sent directly to that provider and are redacted from locally stored error logs. Do not use the extension with sensitive code unless the selected provider's terms and privacy policy are acceptable to you.

## Scope and limitations

The first release targets public `leetcode.cn` problem pages. It does not support `leetcode.com`, contests, automatic execution, judging, submissions, or account data. LeetCode DOM changes can affect context extraction.

## License

LeetLens is released under the [MIT License](LICENSE).
