import type { PortfolioNextAction } from "../../contracts/portfolio.ts";

/** design-handoff.md § The Project Row: the row of filled marks stops at four. */
export const PROGRESS_MARK_CAP = 4;

const TERMINAL_PUNCTUATION = /[.…?!]$/;
const LETTER = /\p{L}/u;

export function countProgressMarks(recentEntryCount: number): number {
  return Math.min(Math.max(recentEntryCount, 0), PROGRESS_MARK_CAP);
}

/**
 * The next action read as one sentence. `trigger` already carries its own opener
 * ("Cuando…", "Si…", "El sábado…"), so the two halves join on a comma.
 */
export function readAsSentence({ trigger, act }: PortfolioNextAction): string {
  const opener = trigger.trim().replace(/[,;:.]+$/, "");
  const rest = act.trim();
  if (rest === "") return `${opener}.`;
  const body = asContinuation(rest);
  return TERMINAL_PUNCTUATION.test(body) ? `${opener}, ${body}` : `${opener}, ${body}.`;
}

/**
 * Lowercases the opening letter so the act reads on from the comma. Leading punctuation
 * ("¿", "«") is stepped over rather than defeating the check, and a word that carries its
 * own capitals ("RSVP") keeps them.
 */
function asContinuation(act: string): string {
  const at = [...act].findIndex((character) => LETTER.test(character));
  if (at === -1) return act;
  const word = act.slice(at).split(/\s/)[0] ?? "";
  if (word.slice(1) !== word.slice(1).toLowerCase()) return act;
  return act.slice(0, at) + act.charAt(at).toLowerCase() + act.slice(at + 1);
}
