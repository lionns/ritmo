import { readFileSync, readdirSync, existsSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath, not URL.pathname: the latter leaves percent-encoding in place, so a repo under a
// path containing a space resolves to `.../has%20space/harness.json` and every read fails (T-002).
export const ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const TASK_STATES = ["ready", "doing", "review", "blocked", "done", "superseded"];
export const DECISION_STATES = ["proposed", "accepted", "superseded"];
export const OPEN_STATES = ["ready", "doing", "review", "blocked"];

// The one-way doors: choices a project pays dearly to reverse, so they are settled before task one
// and recorded as decisions rather than deduced per session (D-020). Everything else is decided per
// task, on evidence. A project trims this list in `harness.json`; a headless one drops `interface`.
export const FOUNDATION_TOPICS = ["runtime", "data", "boundaries", "identity", "deploy", "tests", "interface"];

/**
 * True when `moduleUrl` is the script Node was asked to run.
 *
 * Compares canonical paths. Node resolves symlinks when it loads a module, while `process.argv[1]`
 * keeps whatever spelling the caller used, so the two disagree through a symlinked path and a naive
 * equality check makes the script exit 0 having done nothing (T-002).
 */
export function isEntrypoint(moduleUrl) {
  if (!process.argv[1]) return false;
  try {
    return fileURLToPath(moduleUrl) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
}

/** Lines in a record, ignoring a trailing newline. The one definition every budget check uses. */
export function lineCount(text) {
  return text === "" ? 0 : text.replace(/\n$/, "").split(/\r?\n/).length;
}

/** Splits a task into its agreed plan and execution record at the first Outcome heading. */
export function taskBudgetSections(text) {
  const outcome = /^## Outcome[ \t]*\r?$/m.exec(text);
  if (!outcome) return { plan: text, record: "" };
  return { plan: text.slice(0, outcome.index), record: text.slice(outcome.index) };
}

const ENFORCED_BUDGETS = [
  "taskPlanLines",
  "taskRecordLines",
  "traceBlockLines",
  "decisionFileLines",
  "sddDocsTotalLines",
];

/** Reports drift between configured budget keys and the checks harness-lint implements. */
export function budgetContractProblems(budgets) {
  const declared = Object.keys(budgets);
  return [
    ...ENFORCED_BUDGETS.filter((key) => !declared.includes(key))
      .map((key) => `missing \`${key}\`, which harness-lint enforces`),
    ...declared.filter((key) => !ENFORCED_BUDGETS.includes(key))
      .map((key) => `declares \`${key}\`, which harness-lint does not enforce`),
  ];
}

export function config(root = ROOT) {
  return JSON.parse(readFileSync(join(root, "harness.json"), "utf8"));
}

function listMarkdown(dir, filter = () => true) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md") && filter(f))
    .sort()
    .map((f) => ({ name: f, path: join(dir, f), text: readFileSync(join(dir, f), "utf8") }));
}

/** Parses the YAML subset we allow in task front-matter: scalars and flat [a, b] lists. */
export function frontMatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const out = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const [, key, raw] = kv;
    const value = raw.trim().replace(/^["']|["']$/g, "");
    out[key] = value.startsWith("[")
      ? value.slice(1, -1).split(",").map((s) => s.trim()).filter(Boolean)
      : value;
  }
  return out;
}

/** Returns the lines of a `## <name>` section, excluding its heading. */
export function section(text, name) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim().toLowerCase() === `## ${name.toLowerCase()}`);
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^## /.test(l));
  return end === -1 ? rest : rest.slice(0, end);
}

export function tasks(root = ROOT) {
  return listMarkdown(join(root, "docs/tasks")).map((f) => ({ ...f, meta: frontMatter(f.text) }));
}

export function decisions(root = ROOT) {
  // Collect every non-index file so a malformed name is reported, not silently skipped.
  return listMarkdown(join(root, "docs/decisions"), (f) => f !== "README.md").map((f) => {
    const title = f.text.match(/^#\s*(.+)$/m)?.[1]?.trim() ?? f.name;
    const status = f.text.match(/^-\s*Status:\s*(\S+)/m)?.[1]?.trim().toLowerCase() ?? "";
    const date = f.text.match(/^-\s*Date:\s*(\S+)/m)?.[1]?.trim() ?? "-";
    const supersedes = f.text.match(/^-\s*Supersedes:\s*(.+)$/m)?.[1]?.trim() ?? "none";
    const foundation = f.text.match(/^-\s*Foundation:\s*(\S+)/m)?.[1]?.trim().toLowerCase() ?? null;
    return { ...f, id: f.name.slice(0, 5), title, status, date, supersedes, foundation };
  });
}

export function journal(root = ROOT) {
  const path = join(root, "JOURNAL.md");
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .map((line, i) => ({ line: line.trim(), number: i + 1 }))
    .filter((e) => e.line && !/^(#|>|<!--)/.test(e.line));
}

export function traces(root = ROOT) {
  return listMarkdown(join(root, "docs/traces"));
}

/**
 * The versions `docs/sdd/VERSION.md` declares, read from its `### x.y.z` changelog headings.
 *
 * Empty when the file is missing or declares none — a repo that has dropped the changelog cannot be
 * held to it, so the caller skips the check rather than failing every task (T-004).
 */
export function knownVersions(root = ROOT) {
  const path = join(root, "docs/sdd/VERSION.md");
  if (!existsSync(path)) return [];
  return [...readFileSync(path, "utf8").matchAll(/^###\s+(\d+\.\d+\.\d+)/gm)].map((m) => m[1]);
}

/**
 * Every `id` declared by the project's JSON specifications, so a task's `implements:` list can be
 * checked against something real (T-010). Walks arbitrary shapes because `requirements.json` nests
 * its ids under `functional`/`nonFunctional` while `user-stories.json` is a flat array. Empty when
 * a project has no JSON specs, which disables the check rather than failing every task.
 */
export function specIds(root = ROOT) {
  const ids = new Set();
  const dir = join(root, "docs/project");
  if (!existsSync(dir)) return ids;
  for (const name of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(join(dir, name), "utf8"));
    } catch {
      continue; // A malformed spec is the project's problem to report, not this reader's to crash on.
    }
    const walk = (node) => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (node && typeof node === "object") {
        if (typeof node.id === "string") ids.add(node.id);
        Object.values(node).forEach(walk);
      }
    };
    walk(parsed);
  }
  return ids;
}

export function sddDocLines(root = ROOT) {
  return listMarkdown(join(root, "docs/sdd")).reduce((total, f) => total + lineCount(f.text), 0);
}
