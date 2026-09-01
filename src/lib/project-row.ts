import type { PortfolioNextAction } from "../../contracts/portfolio.ts";

/** design-handoff.md § The Project Row: the row of filled marks stops at four. */
export const PROGRESS_MARK_CAP = 4;

const TERMINAL_PUNCTUATION = /[.…?!]$/;

export function countProgressMarks(progressSincePlan: number): number {
  return Math.min(Math.max(progressSincePlan, 0), PROGRESS_MARK_CAP);
}

/**
 * The next action read as one sentence. `trigger` already carries its own opener
 * ("Cuando…", "Si…", "El sábado…"), so the two halves join on a comma. The act is joined
 * verbatim: no heuristic separates a proper noun from a verb, and lowercasing "Notion" is a
 * worse failure than a capital after a comma. Owner settled 2026-09-01.
 */
export function readAsSentence({ trigger, act }: PortfolioNextAction): string {
  const opener = trigger.trim().replace(/[,;:.]+$/, "");
  const body = act.trim();
  if (body === "") return `${opener}.`;
  return TERMINAL_PUNCTUATION.test(body) ? `${opener}, ${body}` : `${opener}, ${body}.`;
}
