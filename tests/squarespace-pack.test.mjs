// Squarespace-only (/s/ + Code Injection + Fluid Engine Code Block + Iframe) packager tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENGINE = path.join(REPO, "skills", "scroll-craft", "engine");
const PACK_SCRIPT = path.join(REPO, "skills", "scroll-craft", "scripts", "squarespace-pack.mjs");

const { packSquarespace, scopeCssForEmbed } = await import(
  new URL("../skills/scroll-craft/scripts/squarespace-pack.mjs", import.meta.url)
);

function makeFixtureBuild(dir) {
  fs.mkdirSync(path.join(dir, "assets", "frames"), { recursive: true });
  fs.copyFileSync(path.join(ENGINE, "scrollcraft.css"), path.join(dir, "scrollcraft.css"));
  fs.copyFileSync(path.join(ENGINE, "scrollcraft.js"), path.join(dir, "scrollcraft.js"));
  fs.writeFileSync(path.join(dir, "assets", "01.mp4"), Buffer.from("fake-mp4-desktop"));
  fs.writeFileSync(path.join(dir, "assets", "01-m.mp4"), Buffer.from("fake-mp4-mobile"));
  fs.writeFileSync(path.join(dir, "assets", "01-poster.webp"), Buffer.from("fake-webp"));
  fs.writeFileSync(path.join(dir, "assets", "frames", "01.webp"), Buffer.from("f1"));
  fs.writeFileSync(path.join(dir, "assets", "frames", "02.webp"), Buffer.from("f2"));

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Eloquent Demo</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="scrollcraft.css">
  <style>
    :root { --sc-accent: #ff5a3d; }
    .hero-bg { background-image: url("assets/01-poster.webp"); }
  </style>
</head>
<body>
  <main>
    <section data-sc-act="scrub" data-sc-span="2.4" data-sc-drift="#111318">
      <div data-sc-stage>
        <img class="sc-stage__poster" src="assets/01-poster.webp" alt="">
        <video data-sc-scrub data-sc-src="assets/01.mp4" data-sc-src-mobile="assets/01-m.mp4" muted playsinline></video>
      </div>
    </section>
    <section data-sc-act="pin" data-sc-span="1.5">
      <div data-sc-stage>
        <canvas data-sc-sequence="assets/frames/{ii}.webp:2:1"></canvas>
      </div>
    </section>
  </main>
  <script src="scrollcraft.js"></script>
  <script>ScrollCraft.mount(document.body);</script>
</body>
</html>`;
  fs.writeFileSync(path.join(dir, "index.html"), html, "utf8");
}

test("scopeCssForEmbed scopes global resets under [data-sc-embed] and adds Fluid Engine sticky guard", () => {
  const raw = fs.readFileSync(path.join(ENGINE, "scrollcraft.css"), "utf8");
  const scoped = scopeCssForEmbed(raw);
  assert.doesNotMatch(scoped, /(^|\n)body\s*\{/, "Scoped CSS must not reset global body");
  assert.doesNotMatch(scoped, /(^|\n)html\s*\{/, "Scoped CSS must not target global html");
  assert.doesNotMatch(scoped, /(^|\n):root\s*\{/, "Scoped CSS must scope :root tokens to [data-sc-embed]");
  assert.match(scoped, /\[data-sc-embed\]\s*\{/);
  assert.match(scoped, /\.page-section:has\(\[data-sc-embed\]\)/);
  assert.match(scoped, /overflow:\s*visible\s*!important/);
});

test("squarespace-pack.mjs stages flat /s/ uploads, rewrites URLs, and emits all three integration modes", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sc-sqs-"));
  const buildDir = path.join(tmp, "eloquent-hero");
  try {
    makeFixtureBuild(buildDir);
    const { outDir, uploadDir, manifest } = packSquarespace({
      inDir: buildDir,
      site: "https://example.com",
      editorUrl: "https://your-site.squarespace.com/config/pages",
    });

    assert.equal(manifest.warnings.length, 0, `Unexpected warnings: ${manifest.warnings.join("; ")}`);
    assert.equal(manifest.target.loadMode, "direct");
    assert.equal(manifest.target.assetBase, "/s/");

    // Verify all flat uploads exist on disk and match manifest byte sizes
    assert.ok(manifest.uploads.length >= 8, `Expected >=8 staged files, got ${manifest.uploads.length}`);
    for (const u of manifest.uploads) {
      const staged = path.join(uploadDir, u.uploadFile);
      assert.ok(fs.existsSync(staged), `Missing staged upload: ${u.uploadFile}`);
      assert.equal(fs.statSync(staged).size, u.bytes);
      assert.match(u.sha256, /^[0-9a-f]{64}$/);
      assert.equal(u.over20MB, false);
      assert.ok(!u.uploadFile.includes("/"), "Squarespace /s/ filenames must be flat");
    }

    const blankHead = fs.readFileSync(path.join(outDir, "blank-page-head.html"), "utf8");
    const blankBody = fs.readFileSync(path.join(outDir, "blank-page-body.html"), "utf8");
    const codeBlock = fs.readFileSync(path.join(outDir, "code-block-embed.html"), "utf8");
    const iframe = fs.readFileSync(path.join(outDir, "iframe-embed.html"), "utf8");

    assert.match(blankHead, /body:not\(\.sqs-edit-mode-active\)/, "Blank Page takeover must protect Squarespace editor chrome");
    assert.match(blankHead, /href="\/s\/eloquent-hero-scrollcraft-[0-9a-f]{8}\.css"/);
    assert.match(blankHead, /url\("\/s\/eloquent-hero-01-poster-[0-9a-f]{8}\.webp"\)/);

    assert.match(blankBody, /data-sc-load="direct"/);
    assert.match(blankBody, /data-sc-src="\/s\/eloquent-hero-01-[0-9a-f]{8}\.mp4"/);
    assert.match(blankBody, /data-sc-src-mobile="\/s\/eloquent-hero-01-m-[0-9a-f]{8}\.mp4"/);
    assert.match(blankBody, /data-sc-sequence="\/s\/eloquent-hero-frames-\{ii\}\.webp:2:1"/);
    assert.match(blankBody, /sqs-edit-mode-active[\s\S]*ScrollCraft\.mount\(document\.body,\{load:"direct"\}\)/);

    assert.match(codeBlock, /id="sc-embed-eloquent-hero" data-sc-embed data-sc-load="direct"/);
    assert.match(codeBlock, /href="\/s\/eloquent-hero-scrollcraft-embed-[0-9a-f]{8}\.css"/);
    assert.match(codeBlock, /\[data-sc-embed\] \{ --sc-accent: #ff5a3d; \}/);
    assert.match(codeBlock, /ScrollCraft\.mount\(r,\{load:"direct"\}\)/);

    assert.match(iframe, /<iframe src="https:\/\/example\.com\/"/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("squarespace-pack.mjs supports --inline-engine and reports missing referenced assets", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sc-sqs-inline-"));
  const buildDir = path.join(tmp, "missing-check");
  try {
    makeFixtureBuild(buildDir);
    fs.unlinkSync(path.join(buildDir, "assets", "01-m.mp4"));

    const { outDir, manifest } = packSquarespace({ inDir: buildDir, inlineEngine: true });
    assert.ok(manifest.warnings.some((w) => w.includes("assets/01-m.mp4")), "Missing asset must produce a manifest warning");

    const cliFail = spawnSync(process.execPath, [PACK_SCRIPT, "--in", buildDir, "--inline-engine"], { encoding: "utf8" });
    assert.equal(cliFail.status, 1, "CLI must exit 1 when manifest has missing or oversized asset warnings");

    const codeBlock = fs.readFileSync(path.join(outDir, "code-block-embed.html"), "utf8");
    assert.match(codeBlock, /<style data-sc-engine-embed>/);
    assert.match(codeBlock, /<script data-sc-engine>/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("squarespace-pack.mjs preserves bespoke body scripts after mount, preserves head scripts, SVG fragments, and strips trailing slash on iframe", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sc-sqs-pres-"));
  const buildDir = path.join(tmp, "pres-check");
  try {
    fs.mkdirSync(path.join(buildDir, "assets"), { recursive: true });
    fs.copyFileSync(path.join(ENGINE, "scrollcraft.css"), path.join(buildDir, "scrollcraft.css"));
    fs.copyFileSync(path.join(ENGINE, "scrollcraft.js"), path.join(buildDir, "scrollcraft.js"));
    fs.writeFileSync(path.join(buildDir, "assets", "icons.svg"), '<svg xmlns="http://www.w3.org/2000/svg"><symbol id="arrow"></symbol></svg>');
    fs.writeFileSync(path.join(buildDir, "assets", "theme.css"), "body{margin:0}");
    fs.writeFileSync(path.join(buildDir, "index.html"), `<!doctype html>
<html>
<head>
  <link rel="stylesheet" href="assets/theme.css">
  <script>window.__HEAD_CFG = { ok: true };</script>
  <style>html, body { background: #08090C; }</style>
</head>
<body>
  <svg><use href="assets/icons.svg#arrow"></use></svg>
  <script src="scrollcraft.js"></script>
  <script>
    ScrollCraft.mount(document.body);
    window.__SIGNATURE_MOVE_RAN = true;
  </script>
</body>
</html>`, "utf8");

    const { outDir, manifest } = packSquarespace({ inDir: buildDir, site: "https://example.com/" });
    assert.equal(manifest.warnings.length, 0);

    const blankHead = fs.readFileSync(path.join(outDir, "blank-page-head.html"), "utf8");
    const blankBody = fs.readFileSync(path.join(outDir, "blank-page-body.html"), "utf8");
    const codeBlock = fs.readFileSync(path.join(outDir, "code-block-embed.html"), "utf8");
    const iframe = fs.readFileSync(path.join(outDir, "iframe-embed.html"), "utf8");

    assert.match(blankHead, /href="\/s\/pres-check-theme-[0-9a-f]{8}\.css"/);
    assert.match(blankHead, /window\.__HEAD_CFG = \{ ok: true \}/);
    assert.match(blankBody, /href="\/s\/pres-check-icons-[0-9a-f]{8}\.svg#arrow"/);

    const mountIdx = blankBody.indexOf("ScrollCraft.mount(document.body");
    const sigIdx = blankBody.indexOf("window.__SIGNATURE_MOVE_RAN = true");
    assert.ok(mountIdx > -1 && sigIdx > mountIdx, "Bespoke body JS must be preserved AFTER ScrollCraft.mount");

    assert.match(codeBlock, /\[data-sc-embed\] \{ background: #08090C; \}/);
    assert.doesNotMatch(codeBlock, /(^|\n)html,\s*body\s*\{/);
    assert.match(iframe, /<iframe src="https:\/\/example\.com\/"/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
