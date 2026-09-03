import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync, realpathSync } from "node:fs";
import { extname, join } from "node:path";
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

const FENCE = /^\s{0,3}(`{3,}|~{3,})/;
const OUTCOME = /^## Outcome[ \t]*$/;

/**
 * Splits a task into its agreed plan and execution record at the first Outcome heading.
 *
 * Fenced regions are skipped: a task quoting `TEMPLATES.md` carries the whole template, heading
 * included, and splitting there would measure the quote as a record (D-030, T-019). An indented
 * code block still mis-splits — it fails loudly on the record budget rather than passing wrongly.
 */
export function taskBudgetSections(text) {
  let offset = 0;
  let fence = null;
  for (const line of text.split(/(?<=\n)/)) {
    const bare = line.replace(/\r?\n$/, "");
    const marker = FENCE.exec(bare)?.[1];
    if (fence) {
      if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = null;
    } else if (marker) {
      fence = marker;
    } else if (OUTCOME.test(bare)) {
      return { plan: text.slice(0, offset), record: text.slice(offset) };
    }
    offset += line.length;
  }
  return { plan: text, record: "" };
}

const SCRIPT_EXTENSIONS = new Set([".cjs", ".js", ".mjs", ".ts", ".tsx"]);

/**
 * Finds every configured budget property read by source under scripts/, including nested readers.
 *
 * The match is textual, not parsed: writing `budgets.<name>` in a comment or string under
 * `scripts/` makes that key required in `harness.json`. Deliberate — it errs toward more
 * enforcement, never less — but it means prose here must not spell the pattern out (D-031).
 */
export function enforcedBudgetKeys(root = ROOT) {
  const keys = new Set();
  const scan = (directory) => {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        scan(path);
      } else if (entry.isFile() && SCRIPT_EXTENSIONS.has(extname(entry.name))) {
        const source = readFileSync(path, "utf8");
        for (const match of source.matchAll(/\bbudgets\.([A-Za-z_$][\w$]*)/g)) keys.add(match[1]);
      }
    }
  };
  scan(join(root, "scripts"));
  return [...keys].sort();
}

/** Reports drift between configured budget keys and the checks harness-lint implements. */
export function budgetContractProblems(budgets, enforced = enforcedBudgetKeys()) {
  const declared = Object.keys(budgets);
  return [
    ...enforced.filter((key) => !declared.includes(key))
      .map((key) => `missing \`${key}\`, which harness-lint enforces`),
    ...declared.filter((key) => !enforced.includes(key))
      .map((key) => `declares \`${key}\`, which harness-lint does not enforce`),
  ];
}

/**
 * The hash a manifest records for one file. Newlines are normalised first: a CRLF checkout of the
 * same bytes is the same file, and hashing it as different would break Windows on arrival (D-033).
 */
export function fileHash(path) {
  return createHash("sha256").update(readFileSync(path, "utf8").replace(/\r\n/g, "\n")).digest("hex");
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

/** Where the release history lives: the root changelog, or `VERSION.md` before 0.9.0 moved it. */
export function changelogPath(root = ROOT) {
  const moved = join(root, "CHANGELOG.md");
  return existsSync(moved) ? moved : join(root, "docs/sdd/VERSION.md");
}

/** That file's path relative to the repository, so a failure can name the file it actually read. */
export function changelogName(root = ROOT) {
  return changelogPath(root) === join(root, "CHANGELOG.md") ? "CHANGELOG.md" : "docs/sdd/VERSION.md";
}

/**
 * The versions the changelog declares, read from its `### x.y.z` headings. A repository that has
 * not moved its history yet keeps working: the fallback reads the old location (D-032).
 */
export function knownVersions(root = ROOT) {
  const path = changelogPath(root);
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
