# Scroll Craft in Antigravity & Gemini CLI

Scroll Craft ships with native manifests for **Google Antigravity**
(`.antigravity-plugin/plugin.json`), **Gemini CLI** (`gemini-extension.json` +
`rules/GEMINI.md`), **Claude Code** (`.claude-plugin/`), and **Codex**
(`.codex-plugin/` + `.agents/plugins/marketplace.json`), all pointing at one
canonical skill folder (`skills/scroll-craft/`).

## Requirements

- [Node.js](https://nodejs.org) 18 or newer
- A full `ffmpeg` build (>200 filters; on Windows: `winget install Gyan.FFmpeg` or set `SCROLLCRAFT_FFMPEG`)
- Installed Google Chrome or Microsoft Edge (real H.264 decoder; override with `SCROLLCRAFT_CHROME`)
- `playwright-core` installed in the build project (`npm i playwright-core`) for Step 5 verification
- Optional `KIE_AI_API_KEY` (only if generating assets; supplied photography/footage works with zero key)

## Install & Validate

### Antigravity

```bash
agy plugin validate /path/to/scroll-craft --strict --json
agy plugin install /path/to/scroll-craft
agy plugin list --json
```

Installed plugins live under `~/.gemini/config/plugins/scroll-craft`
(`%USERPROFILE%\.gemini\config\plugins\scroll-craft` on Windows).

### Gemini CLI

Install or link the repository root containing `gemini-extension.json` and
`rules/GEMINI.md` into your Gemini CLI extensions directory, or point Gemini CLI at
`skills/scroll-craft/SKILL.md`.

### Claude Code

```bash
claude plugin validate /path/to/scroll-craft --strict
```

## Windows Execution Notes

- **No Bash required:** `skills/scroll-craft/scripts/encode.mjs` replaces
  `encode.sh` natively in Node across Windows PowerShell, cmd, macOS, and Linux,
  and supports `desktop`, `mobile`, `portrait`, `--crop-portrait`, and `--poster`.
- **Shared full-ffmpeg & Chrome resolver (`scripts/ffmpeg.mjs`):** Checks
  `SCROLLCRAFT_FFMPEG`, `PATH`, and `%USERPROFILE%\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_*`
  (fixing Windows shells where `HOME` is unset), and verifies >200 filters before use.
- **Background preview server (`serve.mjs`):** Do not use Unix trailing `&` in
  PowerShell or agent shells that terminate detached child processes on exit.
  Launch `serve.mjs` as a background daemon (`IsDaemon: true`) or in a separate
  terminal:

  ```powershell
  node skills/scroll-craft/scripts/serve.mjs --root <buildDir> --port 4500
  ```

- **HTTP Range support:** `serve.mjs` serves `206 Partial Content` byte ranges so
  direct-stream clips (`data-sc-load="direct"`) verify identically to Squarespace CDN
  hosting.

## Preflight & Verification

```powershell
node skills/scroll-craft/scripts/doctor.mjs
node skills/scroll-craft/scripts/workspace.mjs --ensure
npm test
```
