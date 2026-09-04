# LeetLens Ark UI Refactor Process

## 1. Research Summary

### Current baseline

- LeetLens is a Manifest V3 Chrome extension written with SolidJS and Vite.
- It has two UI surfaces: the toolbar popup and an injected conversation panel on `leetcode.cn`.
- The existing project already uses ESLint 9 flat configuration, but its rules and project scripts need to be made explicit and release-ready.
- The existing build reads `DEEPSEEK_API_KEY` from `.env` and embeds it in the extension default settings. That is acceptable only for an unshared local build, but unsafe for a distributable ZIP or GitHub Release. The release pipeline must remove this behavior.

### Ark UI findings

The Ark UI Solid package is `@ark-ui/solid` (current researched version: 5.39.1, compatible with SolidJS >= 1.6). It is headless and uses accessible Zag state machines, so visual language remains fully owned by LeetLens.

The implementation will use these documented Ark primitives:

| Surface | Ark primitive | Responsibility |
| --- | --- | --- |
| Settings popup | `Select` + `createListCollection` | Keyboard-accessible provider and theme selectors with controlled values. |
| Settings popup | `PasswordInput` | Secure API-key input with built-in visible/hidden state and labelled visibility trigger. |
| Settings popup | `Switch` | Accessible native-Leet panel preference. |
| Content panel | `Collapsible` | Error-log disclosure that removes hidden logs from tab order. |
| Shared UI | `Tooltip` | Named affordances for compact icon controls. |

Reference: [Ark UI Solid LLMs documentation](https://ark-ui.com/llms-solid.txt), consulted on 2026-09-03.

## 2. Target Architecture

```text
src/
  background/       provider request and editor bridge
  content/          injected assistant application and styles
  popup/            settings application and styles
  shared/           extension data, parsing, prompts, and domain types
  ui/               reusable Ark UI based controls and icon wrappers
scripts/            maintained distribution packaging scripts
.github/workflows/  verification and version-tag release automation
```

`shared/` remains framework-neutral. `ui/` may depend on Solid and Ark UI, but never on Chrome storage or provider logic. This keeps UI primitives reusable by popup and content without mixing them into the extension domain layer.

## 3. Implementation Plan

### Phase A: Dependency and quality baseline

1. Add `@ark-ui/solid` and `lucide-solid`.
2. Retain ESLint 9's flat-config model, add browser/Node globals by file scope, and promote TypeScript safety rules that catch accidental `any`, forgotten promises, and unused imports without blocking Chrome ambient types.
3. Update lockfile using npm so CI's `npm ci` is deterministic.
4. Remove `.env` API-key injection from Vite configuration and set shipped API-key defaults to empty. Keys remain in extension-local storage only after a user saves them in the popup.

### Phase B: UI composition and visual system

1. Add shared Ark UI tooltip/icon-button primitives, with Lucide icons used for icon-only controls.
2. Rebuild the popup as a compact operational settings surface:
   - provider and theme are Ark `Select` controls;
   - API key uses Ark `PasswordInput`;
   - native panel preference uses Ark `Switch`;
   - status, external key link, focus states, and error states retain visible text labels.
3. Refine the content panel with a coherent token palette, denser header controls, resilient long-text wrapping, and deliberate hover/focus states.
4. Use Ark `Collapsible` for error logs. Logs remain unavailable until an error exists; when collapsed, its content is inert and removed from keyboard traversal.
5. Keep the first-token conic-gradient boundary animation, constrain it to the waiting state, and respect `prefers-reduced-motion`.

### Phase C: Product behavior preservation

1. Preserve DeepSeek and Qwen selection, per-provider keys/models, streaming, first-token retry, cancellation, and key redaction.
2. Preserve per-problem histories and make topic changes atomically cancel an old stream before loading the new problem history.
3. Keep existing code-application safeguards and markdown sanitization unchanged.
4. Add targeted tests for release metadata and settings migration defaults where they are pure and stable; retain current shared parsing tests.

### Phase D: Distribution and release

1. Add `scripts/pack-extension.mjs` to verify `dist/manifest.json` and create `release/LeetLens-<version>.zip` with the extension files at archive root.
2. Add `npm run package`, which builds then invokes the packager; never commit `dist/` or `release/` artifacts.
3. Keep CI for push/PR validation and add a tag-triggered GitHub Actions workflow for `v*` tags:
   - clean install;
   - typecheck, tests, lint, build, and package;
   - validate tag version equals `package.json` version;
   - create/publish GitHub Release and attach ZIP with `contents: write` permission.

### Phase E: Public project documentation

1. Rewrite `README.md` around install, provider configuration, development, package output, release tags, privacy, and support boundaries.
2. Keep the existing MIT text in `LICENSE`, reference it from README, and make documentation explicitly state that releases never include API keys.
3. Record the verification matrix in this document after the implementation is built and tested.

## 4. Acceptance Criteria

- Both Solid entrypoints compile with Ark UI components in actual production use.
- Popup controls work with keyboard and have accessible names; icon-only controls have tooltips/labels.
- The content panel remains visually stable during stream start, response, cancellation, error, theme, and narrow-width states.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run package`, and `git diff --check` pass.
- ZIP contains a valid unpacked extension layout with `manifest.json` at archive root.
- CI verifies every push/PR; a `v<package-version>` tag publishes the matching ZIP release.

## 5. Verification Record

- `npm run typecheck`: passed after enabling `skipLibCheck` for Ark UI's current declaration-file compatibility issue.
- `npm run lint`: passed.
- `npm test`: passed (17 tests).
- `npm run build`: passed with Ark UI bundled into popup and content outputs.
- `npm run package`: passed; generated `release/LeetLens-0.1.0.zip`.
- `git diff --check`: passed.
- Extension popup smoke check: not completed in this environment. The bounded check starts Chromium, but Chromium does not expose the extension Service Worker in headless mode, including `--headless=new`; the existing end-to-end scripts require a headed browser. This is an environment limitation rather than a build or typecheck failure.
