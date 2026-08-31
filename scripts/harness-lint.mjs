#!/usr/bin/env node
/**
 * Enforces the record budgets and shape rules the harness used to only ask for in prose (D-009).
 * Exit 1 on any violation. Wire this into the project's final check gate.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  ROOT, config, tasks, decisions, journal, traces, knownVersions, specIds, section, sddDocLines, lineCount,
  taskBudgetSections,
  TASK_STATES, DECISION_STATES,
} from "./lib/harness.mjs";
import { renderStatus, renderDecisionIndex } from "./harness-status.mjs";

const problems = [];
const fail = (where, message) => problems.push({ where, message });

const cfg = config();
const budgets = cfg.budgets ?? {};
const PROFILES = ["solo", "team"];
const REQUIRED_META = ["id", "title", "status", "profile", "harness", "goal"];

if (!PROFILES.includes(cfg.profile)) {
  fail("harness.json", `profile must be one of ${PROFILES.join(" | ")}, got "${cfg.profile}"`);
}

const decisionIds = new Set(decisions().map((d) => d.id));
const journalIds = new Set(journal().map((e) => e.line.split("|")[1]?.trim()));
const versions = knownVersions();
const traceFiles = traces();
const TRACE_NAME = /^\d{4}-\d{2}-\d{2}_([A-Z]+-\d+)_[a-z-]+\.md$/;
const declaredIds = specIds();

for (const task of tasks()) {
  const where = `docs/tasks/${task.name}`;
  if (!task.meta) {
    fail(where, "missing YAML front-matter");
    continue;
  }
  for (const key of REQUIRED_META) {
    if (!task.meta[key]) fail(where, `front-matter is missing \`${key}\``);
  }
  if (task.meta.status && !TASK_STATES.includes(task.meta.status)) {
    fail(where, `status "${task.meta.status}" is not one of ${TASK_STATES.join(" | ")}`);
  }
  if (task.meta.profile && !PROFILES.includes(task.meta.profile)) {
    fail(where, `profile "${task.meta.profile}" is not one of ${PROFILES.join(" | ")}`);
  }
  if (task.meta.id && !task.name.startsWith(`${task.meta.id}-`)) {
    fail(where, `filename must start with the task id "${task.meta.id}-"`);
  }
  for (const id of task.meta.decisions ?? []) {
    if (!decisionIds.has(id)) fail(where, `references decision ${id}, which has no file`);
  }
  // Forward traceability (D-019): a link to a requirement that does not exist is worse than none.
  for (const id of task.meta.implements ?? []) {
    if (declaredIds.size && !declaredIds.has(id)) {
      fail(where, `implements ${id}, which no file in docs/project/ declares`);
    }
  }

  const taskSections = taskBudgetSections(task.text);
  const planLines = lineCount(taskSections.plan);
  if (planLines > budgets.taskPlanLines) {
    fail(where, `plan is ${planLines} lines, plan budget is ${budgets.taskPlanLines} — split the task`);
  }
  const recordLines = lineCount(taskSections.record);
  if (recordLines > budgets.taskRecordLines) {
    fail(where, `record is ${recordLines} lines, record budget is ${budgets.taskRecordLines} — compress the record`);
  }
  const trace = section(task.text, "Trace");
  if (cfg.profile === "solo" && trace === null && task.meta.status !== "ready") {
    fail(where, "solo profile requires an inline `## Trace` block once work has started");
  }
  if (trace && trace.length > budgets.traceBlockLines) {
    fail(where, `trace block is ${trace.length} lines, budget is ${budgets.traceBlockLines} — compress older rounds`);
  }

  // A version the changelog never declared makes the front-matter unverifiable, so tasks could claim
  // rules that never existed. Skipped entirely when VERSION.md declares nothing (D-013).
  if (task.meta.harness && versions.length && !versions.includes(task.meta.harness)) {
    fail(where, `harness "${task.meta.harness}" is not a version in docs/sdd/VERSION.md (${versions.join(", ")})`);
  }

  // Closure integrity: `done` is a claim the Definition of Done makes checkable (D-013).
  if (task.meta.status === "done") {
    if (task.meta.id && !journalIds.has(task.meta.id)) {
      fail(where, `status is done but JOURNAL.md has no line for ${task.meta.id}`);
    }
    const unchecked = (section(task.text, "Acceptance Criteria") ?? []).filter((l) => /^\s*-\s*\[ \]/.test(l));
    if (unchecked.length) {
      fail(where, `status is done but ${unchecked.length} acceptance criteria are still unchecked`);
    }
    if (!(section(task.text, "Sources") ?? []).some((l) => l.trim())) {
      fail(where, "status is done but `## Sources` is empty — a closed task must record what defined it");
    }
    // The configured gate is the same for every task, so on its own it verifies nothing specific to
    // this change. Something had to be checked that only this task could break (D-015).
    const verification = (section(task.text, "Verification") ?? []).join("\n");
    if (!/^-\s*Task-specific:\s*\S/im.test(verification)) {
      fail(where, "status is done but `## Verification` names no task-specific check");
    }
  }

  if (cfg.profile === "team") {
    const own = traceFiles.filter((t) => TRACE_NAME.exec(t.name)?.[1] === task.meta.id);
    if (task.meta.status !== "ready" && own.length === 0) {
      fail(where, `team profile requires a trace file at docs/traces/<YYYY-MM-DD>_${task.meta.id}_<role>.md`);
    }
    const validation = section(task.text, "Validation") ?? [];
    if (task.meta.status === "done" && !/^-\s*Validated by:\s*\S/m.test(validation.join("\n"))) {
      fail(where, "team profile requires a `## Validation` section with a `- Validated by:` line");
    }
  }
}

for (const t of traceFiles) {
  const where = `docs/traces/${t.name}`;
  if (!TRACE_NAME.test(t.name)) {
    fail(where, "filename must match <YYYY-MM-DD>_<T-###>_<role>.md");
  }
  const lines = lineCount(t.text);
  if (lines > budgets.traceBlockLines) {
    fail(where, `${lines} lines, budget is ${budgets.traceBlockLines} — compress older rounds`);
  }
}

for (const decision of decisions()) {
  const where = `docs/decisions/${decision.name}`;
  if (!/^D-\d{3}-[a-z0-9-]+\.md$/.test(decision.name)) {
    fail(where, "filename must match D-###-kebab-slug.md");
  }
  if (!DECISION_STATES.includes(decision.status)) {
    fail(where, `status "${decision.status}" is not one of ${DECISION_STATES.join(" | ")}`);
  }
  if (!decision.title.startsWith(decision.id)) {
    fail(where, `heading must start with "${decision.id} — "`);
  }
  const lines = lineCount(decision.text);
  if (lines > budgets.decisionFileLines) {
    fail(where, `${lines} lines exceeds the ${budgets.decisionFileLines}-line budget`);
  }
}

// Inception gate (D-020). The foundation topics a project declares must each be settled by one
// accepted decision before any task leaves `ready`. An absent or empty list disables the gate, so a
// project that predates 0.4.0 keeps working and a brownfield adopter can record before declaring.
const foundation = Array.isArray(cfg.foundation) ? cfg.foundation : [];
const settled = new Map();
for (const decision of decisions()) {
  if (!decision.foundation) continue;
  const where = `docs/decisions/${decision.name}`;
  if (foundation.length && !foundation.includes(decision.foundation)) {
    fail(where, `foundation topic "${decision.foundation}" is not one of ${foundation.join(" | ")} in harness.json`);
    continue;
  }
  if (decision.status !== "accepted") continue;
  settled.set(decision.foundation, [...(settled.get(decision.foundation) ?? []), decision.name]);
}
for (const [topic, files] of settled) {
  if (files.length > 1) {
    fail("docs/decisions/", `foundation topic "${topic}" is settled by ${files.length} accepted decisions (${files.join(", ")}) — supersede one`);
  }
}
const started = tasks().filter((t) => t.meta?.status && t.meta.status !== "ready");
const missing = foundation.filter((topic) => !settled.has(topic));
if (started.length && missing.length) {
  fail("harness.json", `${started.length} task(s) past ready while the foundation is unsettled: ${missing.join(", ")} — record each as an accepted decision carrying \`- Foundation: <topic>\` before implementing (D-020)`);
}

const JOURNAL_FIELDS = 7;
for (const entry of journal()) {
  const where = `JOURNAL.md:${entry.number}`;
  const fields = entry.line.split("|").map((f) => f.trim());
  if (fields.length !== JOURNAL_FIELDS) {
    fail(where, `expected ${JOURNAL_FIELDS} pipe-separated fields, found ${fields.length}`);
    continue;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fields[0])) fail(where, `"${fields[0]}" is not a YYYY-MM-DD date`);
  if (!/^[A-Z]+-\d+$/.test(fields[1])) fail(where, `"${fields[1]}" is not a task id`);
  if (!TASK_STATES.includes(fields[2])) fail(where, `"${fields[2]}" is not a task state`);
}

const sdd = sddDocLines();
if (sdd > budgets.sddDocsTotalLines) {
  fail("docs/sdd/", `${sdd} lines exceeds the ${budgets.sddDocsTotalLines}-line budget for harness docs`);
}

for (const [path, render] of [["STATUS.md", renderStatus], ["docs/decisions/README.md", renderDecisionIndex]]) {
  const full = join(ROOT, path);
  const current = existsSync(full) ? readFileSync(full, "utf8") : null;
  if (current !== render()) fail(path, "stale — run `node scripts/harness-status.mjs`");
}

// A backlog is not a defect, so this never changes the exit code — it only makes the gap between
// what was specified and what was built visible at zero cost per session (D-019).
const implemented = new Set(tasks().flatMap((t) => t.meta?.implements ?? []));
const unimplemented = [...declaredIds].filter((id) => !implemented.has(id));

if (problems.length === 0) {
  console.log(`harness-lint: clean (${tasks().length} tasks, ${decisionIds.size} decisions, docs/sdd ${sdd}/${budgets.sddDocsTotalLines} lines)`);
  if (unimplemented.length) {
    const shown = unimplemented.slice(0, 5).join(", ");
    const rest = unimplemented.length > 5 ? `, +${unimplemented.length - 5} more` : "";
    console.log(`harness-lint: ${unimplemented.length} spec id(s) no task implements — ${shown}${rest}`);
  }
  process.exit(0);
}
console.error(`harness-lint: ${problems.length} problem(s)\n`);
for (const p of problems) console.error(`  ${p.where}\n    ${p.message}`);
process.exit(1);
