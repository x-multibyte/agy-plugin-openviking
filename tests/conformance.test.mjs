import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");

describe("Antigravity Plugin Conformance", () => {
  it("plugin.json has valid name and metadata", () => {
    const manifest = JSON.parse(readFileSync(join(REPO_ROOT, "plugin.json"), "utf8"));
    assert.match(manifest.name, /^[a-zA-Z0-9-_]+$/);
    assert.ok(manifest.description && manifest.description.length > 10);
  });

  it("mcp_config.json declares stdio openviking server", () => {
    const mcpConfig = JSON.parse(readFileSync(join(REPO_ROOT, "mcp_config.json"), "utf8"));
    assert.ok(mcpConfig.mcpServers?.openviking);
    assert.equal(mcpConfig.mcpServers.openviking.command, "node");
  });

  it("hooks.json declares all 4 lifecycle events", () => {
    const hooks = JSON.parse(readFileSync(join(REPO_ROOT, "hooks.json"), "utf8"));
    const entry = hooks["openviking-memory"];
    assert.ok(entry, "Missing openviking-memory hook namespace");
    assert.ok(entry.PreInvocation, "Missing PreInvocation hook");
    assert.ok(entry.PreToolUse, "Missing PreToolUse hook");
    assert.ok(entry.PostInvocation, "Missing PostInvocation hook");
    assert.ok(entry.Stop, "Missing Stop hook");
  });

  it("all skills have SKILL.md with frontmatter", () => {
    const skillsDir = join(REPO_ROOT, "skills");
    const subdirs = readdirSync(skillsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    assert.ok(subdirs.length >= 4);
    for (const name of subdirs) {
      const skillFile = join(skillsDir, name, "SKILL.md");
      assert.ok(existsSync(skillFile), `Missing SKILL.md in ${name}`);
      const content = readFileSync(skillFile, "utf8");
      assert.ok(content.startsWith("---"), `${skillFile} missing frontmatter`);
      assert.ok(content.includes("name:"), `${skillFile} missing name`);
      assert.ok(content.includes("description:"), `${skillFile} missing description`);
    }
  });

  it("all .mjs scripts pass node syntax check", () => {
    const files = [
      join(REPO_ROOT, "servers/mcp-proxy.mjs"),
      join(REPO_ROOT, "servers/agy-hook.mjs"),
      join(REPO_ROOT, "servers/agy-transcript.mjs")
    ];
    for (const f of files) {
      assert.doesNotThrow(() => {
        execSync(`node --check "${f}"`, { stdio: "ignore" });
      }, `Syntax check failed for ${f}`);
    }
  });
});
