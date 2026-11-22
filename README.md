# scroll-craft

[![MIT](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.3.1-0A0B0E.svg)](skills/scroll-craft/CHANGELOG.md)
[![Antigravity](https://img.shields.io/badge/Google%20Antigravity-plugin-4285F4.svg)](docs/antigravity.md)
[![Gemini CLI](https://img.shields.io/badge/Gemini%20CLI-extension-8E75B2.svg)](gemini-extension.json)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-d97757.svg)](.claude-plugin/plugin.json)

**A multi-agent skill and plugin for building, visually verifying, and deploying
premium scroll-driven landing pages on Windows, macOS, and Linux.**

Adapted from upstream [`nateherkai/scroll-craft`](https://github.com/nateherkai/scroll-craft)
(`v0.3.0`) by **Eloquent** (`@mjeanhudson-dev`) for native **Google Antigravity**,
**Gemini CLI**, **Claude Code**, **Codex**, Windows PowerShell execution, and
**Squarespace 7.1** (`/s/` + Code Injection / Fluid Engine Code Block) deployment.

## What changed in 0.3.1

- **Native multi-agent plugin manifests:** `.antigravity-plugin/plugin.json`,
  `gemini-extension.json` + `rules/GEMINI.md`, `.claude-plugin/`, and `.codex-plugin/` +
  `.agents/plugins/marketplace.json`, backed by one canonical skill at
  `skills/scroll-craft/SKILL.md` (trimmed cleanly under Antigravity's 24,000-byte cap).
- **Zero-Bash Windows parity:** Added `scripts/encode.mjs` (native Node dense-GOP
  encoder with `desktop`, `mobile`, `portrait`, `--crop-portrait`, and `--poster`)
  and `scripts/ffmpeg.mjs` (fixes `process.env.HOME` WinGet lookup in `shoot.mjs`,
  shared full-ffmpeg >200 filter check, Chrome lookup, and agent detection).
- **Squarespace 7.1 engine & packager:** Added `data-sc-load="direct"` and automatic
  non-HTTP CORS fallback in `engine/scrollcraft.js`, container-scoped `data-sc-drift`,
  HTTP `206 Partial Content` byte-range support in `scripts/serve.mjs`, and
  `scripts/squarespace-pack.mjs` (flat `upload-to-s/` staging + 20 MB cap check +
  Full-Bleed Blank Page Takeover + Scoped Fluid Engine Code Block + Iframe + `manifest.json`).
- **Automated verification suite:** `npm test` runs manifest validation, real
  `encode.mjs` encoding, `squarespace-pack.mjs` bundling, and live headless Chrome
  Playwright checks (Blob scrub, cross-origin non-CORS `/s/` direct fallback,
  Squarespace Fluid Engine `overflow: hidden` sticky preservation, and `shoot.mjs`
  contact sheet generation).

## Quick Start

### Install as a Plugin

- **Antigravity:**
  ```bash
  agy plugin validate . --strict --json
  agy plugin install .
  ```
- **Gemini CLI:** Load the repo root via `gemini-extension.json` (`rules/GEMINI.md`).
- **Claude Code:**
  ```bash
  /plugin install scroll-craft --marketplace mjeanhudson-dev/scroll-craft
  claude plugin validate . --strict
  ```
- **Codex:** Copy `skills/scroll-craft/` into `.agents/skills/scroll-craft/` or register `.agents/plugins/marketplace.json`.

### Preflight & Tests

```bash
node skills/scroll-craft/scripts/doctor.mjs
node skills/scroll-craft/scripts/workspace.mjs --ensure
npm test
```

## Documentation

- [Antigravity, Gemini CLI & Windows Guide](docs/antigravity.md)
- [Squarespace 7.1 Deployment Guide](docs/squarespace.md)
- [Core Skill Procedure (`SKILL.md`)](skills/scroll-craft/SKILL.md)
- [Upstream README (`v0.3.0`)](SOURCE-README.md)
- [Changelog](skills/scroll-craft/CHANGELOG.md)

## Licence

MIT. See [LICENSE](LICENSE). Upstream `scroll-craft` by Nate Herk / AI Automation Society.
