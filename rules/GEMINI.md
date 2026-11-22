# Scroll Craft (Gemini Extension Context)

When the user asks to build a scroll-driven landing page, dimensional hero, scrollytelling experience, or Squarespace scroll page, read `skills/scroll-craft/SKILL.md` first and follow its complete workflow (Step 0 brief through Step 5 visual verification, plus Step 6 Squarespace packaging when requested).

## Windows & Gemini Runtime Rules

- Resolve `<skill>` to `skills/scroll-craft/` inside this extension/plugin directory.
- Run all helper scripts directly with Node (no Bash required):
  - `node skills/scroll-craft/scripts/doctor.mjs` (preflight; supports `--json`)
  - `node skills/scroll-craft/scripts/workspace.mjs --ensure`
  - `node skills/scroll-craft/scripts/encode.mjs <in> <out> [desktop|mobile|portrait] [crf] [--poster <out.webp>]`
  - `node skills/scroll-craft/scripts/serve.mjs --root <buildDir> --port 4500`
  - `node skills/scroll-craft/scripts/shoot.mjs --url http://localhost:4500 --out lab/shots`
  - `node skills/scroll-craft/scripts/squarespace-pack.mjs --in <buildDir> --site <url>`
- On Windows agent shells, start `serve.mjs` as a background/daemon process rather than using trailing `&`, verify the served `<title>` and asset HTTP 200 before running `shoot.mjs`, and inspect `sheet.png` directly.
- For Squarespace-only `/s/` hosting, read `skills/scroll-craft/references/squarespace.md`. `scrollcraft.js` supports `data-sc-load="direct"` and automatic non-HTTP CORS fallback so `/s/` redirects to `static1.squarespace.com` stream cleanly via byte-range requests.
