import type { PortfolioNextAction } from "../../contracts/portfolio.ts";

/** design-handoff.md § The Project Row: the row of filled marks stops at four. */
export const PROGRESS_MARK_CAP = 4;

export function countProgressMarks(recentEntryCount: number): number {
  return Math.min(Math.max(recentEntryCount, 0), PROGRESS_MARK_CAP);
}

/**
 * The next action read as one sentence. `trigger` already carries its own opener
 * ("Cuando…", "Si…", "El sábado…"), so the two halves join on a comma.
 */
export function readAsSentence({ trigger, act }: PortfolioNextAction): string {
  const opener = trigger.trim().replace(/[,.;:]+$/, "");
  const rest = act.trim().replace(/\.+$/, "");
  const [firstWord = ""] = rest.split(/\s/);
  // "RSVP" keeps its capitals; "Verificar" does not.
  const carriesOwnCapitals = firstWord.slice(1) !== firstWord.slice(1).toLowerCase();
  const body = carriesOwnCapitals ? rest : rest.charAt(0).toLowerCase() + rest.slice(1);
  return `${opener}, ${body}.`;
}
