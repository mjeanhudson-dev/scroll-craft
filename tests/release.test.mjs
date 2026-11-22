// Release hygiene & multi-agent manifest integrity checks.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILL = path.join(REPO, "skills", "scroll-craft");
const read = (rel) => fs.readFileSync(path.join(REPO, rel), "utf8");
const readJson = (rel) => JSON.parse(read(rel));

const agy = readJson(".antigravity-plugin/plugin.json");
const claude = readJson(".claude-plugin/plugin.json");
const claudeMarket = readJson(".claude-plugin/marketplace.json");
const codex = readJson(".codex-plugin/plugin.json");
const codexMarket = readJson(".agents/plugins/marketplace.json");
const geminiExt = readJson("gemini-extension.json");
const pkg = readJson("package.json");

test("all plugin manifests share one semantic version and name", () => {
  assert.match(agy.version, /^\d+\.\d+\.\d+$/);
  for (const [label, m] of [
    [".claude-plugin/plugin.json", claude],
    [".codex-plugin/plugin.json", codex],
    ["gemini-extension.json", geminiExt],
    ["package.json", pkg],
  ]) {
    assert.equal(m.name, agy.name, `${label} name`);
    assert.equal(m.version, agy.version, `${label} version`);
  }
});

test("marketplaces list scroll-craft from this repo root", () => {
  const cEntry = claudeMarket.plugins.find((p) => p.name === agy.name);
  assert.ok(cEntry, ".claude-plugin/marketplace.json lists scroll-craft");
  assert.equal(cEntry.source, "./");

  const xEntry = codexMarket.plugins.find((p) => p.name === agy.name);
  assert.ok(xEntry, ".agents/plugins/marketplace.json lists scroll-craft");
  assert.deepEqual(xEntry.source, { source: "local", path: "./" });
});

test("Antigravity, Codex, and Gemini CLI extension paths resolve to real files", () => {
  assert.ok(fs.existsSync(path.join(REPO, agy.logo)), `Antigravity logo: ${agy.logo}`);
  assert.equal(codex.skills, "./skills/");
  for (const k of ["composerIcon", "logo"]) {
    assert.ok(fs.existsSync(path.join(REPO, codex.interface[k])), `Codex ${k}: ${codex.interface[k]}`);
  }
  assert.ok(fs.existsSync(path.join(REPO, geminiExt.contextFileName)), `Gemini contextFileName: ${geminiExt.contextFileName}`);
});

test("assets/icon.png is a valid 512x512 PNG for plugin directories", () => {
  const buf = fs.readFileSync(path.join(REPO, "assets", "icon.png"));
  assert.deepEqual(buf.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  assert.equal(buf.subarray(12, 16).toString("ascii"), "IHDR");
  assert.equal(buf.readUInt32BE(16), 512);
  assert.equal(buf.readUInt32BE(20), 512);
});

test("README badge and CHANGELOG match the manifest version", () => {
  const v = agy.version.replaceAll(".", "\\.");
  assert.match(read("README.md"), new RegExp(`badge/version-${v}-`));
  assert.match(fs.readFileSync(path.join(SKILL, "CHANGELOG.md"), "utf8"), new RegExp(`\\(${v}\\)`));
});

test("SKILL.md is strictly under Antigravity's 24,000-byte cap, cross-agent, and all links exist", () => {
  const skillPath = path.join(SKILL, "SKILL.md");
  const bytes = fs.statSync(skillPath).size;
  assert.ok(bytes < 24000, `SKILL.md is ${bytes} bytes; must stay strictly below 24,000 bytes`);

  const text = fs.readFileSync(skillPath, "utf8");
  assert.match(text, /^---\r?\nname: scroll-craft\r?\ndescription:/);
  assert.doesNotMatch(text, /^allowed-tools:/m, "SKILL.md must not hardcode Claude-only allowed-tools");
  assert.doesNotMatch(text, /bash\s+<skill>\/scripts\/encode\.sh/, "SKILL.md must use cross-platform node encode.mjs");

  for (const [, ref] of text.matchAll(/\]\((references\/[\w.-]+\.(?:md|html))/g)) {
    assert.ok(fs.existsSync(path.join(SKILL, ref)), `Missing reference linked by SKILL.md: ${ref}`);
  }
  for (const [, script] of text.matchAll(/scripts\/([\w.-]+\.mjs)/g)) {
    assert.ok(fs.existsSync(path.join(SKILL, "scripts", script)), `Missing script linked by SKILL.md: ${script}`);
  }
});

test("repository contains zero unredacted local Windows user paths", () => {
  const textExts = new Set([".md", ".txt", ".json", ".mjs", ".js", ".css", ".html", ".sh", ".example"]);
  const violations = [];
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === ".git" || ent.name === "node_modules" || ent.name === "lab") continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (textExts.has(path.extname(ent.name).toLowerCase())) {
        const content = fs.readFileSync(full, "utf8");
        if (/[A-Za-z]:\\Users\\[^\\<%\s"']+/i.test(content) || /\/Users\/[^/<%\s"']+/i.test(content)) {
          violations.push(path.relative(REPO, full));
        }
        if (/@gmail\.com\b/i.test(content)) {
          violations.push(`${path.relative(REPO, full)} (gmail)`);
        }
        // Keep public plugin files free of live Squarespace preview subdomains
        const sqsMatches = content.matchAll(/\b([a-z0-9-]+)\.squarespace\.com\b/gi);
        const allowedSqs = new Set(["static1", "login", "your-site", "example"]);
        for (const [, sub] of sqsMatches) {
          if (!allowedSqs.has(sub.toLowerCase())) {
            violations.push(`${path.relative(REPO, full)} (${sub}.squarespace.com)`);
          }
        }
      }
    }
  }
  walk(REPO);
  assert.deepEqual(violations, [], `Found unredacted user paths in: ${violations.join(", ")}`);
});
