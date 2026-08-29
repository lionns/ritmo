#!/usr/bin/env node
/**
 * Stop-hook gate: runs `harness-lint` when the agent finishes a turn (D-017).
 *
 * Exit 2 blocks the stop and hands stderr back to the session, so a broken record is reported by
 * the harness itself instead of depending on the agent having read the rules this session. Silent
 * (exit 0) whenever it has nothing to say — a repo without the harness, or a clean one.
 *
 * Zero dependencies, Node built-ins only (D-021).
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const stdin = await new Promise((resolve) => {
  let data = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { data += chunk; });
  process.stdin.on("end", () => resolve(data));
  process.stdin.on("error", () => resolve(""));
});

let input = {};
try { input = JSON.parse(stdin || "{}"); } catch { input = {}; }

// Already blocked once this turn. Blocking again would loop the session on a record the agent may
// not be able to fix, so the second pass is always silent.
if (input.stop_hook_active) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();
const lint = join(root, "scripts", "harness-lint.mjs");
if (!existsSync(lint)) process.exit(0);

const result = spawnSync(process.execPath, [lint], { cwd: root, encoding: "utf8" });
if (result.status === 0) process.exit(0);

const report = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
process.stderr.write(`${report}\n\nThe harness records are not valid. Fix them before finishing, or move the task out of \`done\`.\n`);
process.exit(2);
