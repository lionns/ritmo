import type { PortfolioStep } from "../../contracts/portfolio.ts";

/** design-handoff.md § The Project Row: the row of filled marks stops at four. */
export const PROGRESS_MARK_CAP = 4;

const TERMINAL_PUNCTUATION = /[.…?!]$/;

export function countProgressMarks(progressSincePlan: number): number {
  return Math.min(Math.max(progressSincePlan, 0), PROGRESS_MARK_CAP);
}

/**
 * Only what the owner marked for today reaches the row. A mark for any other day is not history
 * and is never rendered, counted or summed (`FR-22`, `data-model.md` § Data lifecycle).
 */
export function markedForToday(
  openSteps: PortfolioStep[],
  today: string,
): PortfolioStep[] {
  return openSteps.filter(({ markedFor }) => markedFor === today);
}

/**
 * A step read as language. `D-024` removed the trigger, so there is no second clause to join and
 * no punctuation to reconcile — only the closing period the owner did not type. The title is used
 * verbatim otherwise: no heuristic separates a proper noun from a verb, and lowercasing "Notion"
 * is a worse failure than an odd capital. Owner settled 2026-09-01, kept through `D-024`.
 */
export function readAsSentence({ title }: PortfolioStep): string {
  const body = title.trim();
  if (body === "") return "";
  return TERMINAL_PUNCTUATION.test(body) ? body : `${body}.`;
}
