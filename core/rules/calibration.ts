import type { Step } from "../model/entities.ts";
import type { Store } from "../ports/store.ts";

/**
 * How many done steps the ratio is read across. `data-model.md` § Derived values fixed twenty as
 * a starting value, for two reasons that still hold: the render budget of `D-001`, and how you
 * estimated two years ago saying nothing about how you estimate now.
 */
export const CALIBRATION_WINDOW = 20;

/**
 * How few samples is too few to say anything. A ratio over two steps is noise, and a number said
 * with confidence it has not earned is worse than silence. **Five is a starting value with no
 * evidence behind it**, recorded as plainly as the twenty above, and revisable on use.
 */
export const CALIBRATION_MINIMUM = 5;

export interface Calibration {
  /** Summed actual ÷ summed estimate. Above one means the work takes longer than expected. */
  ratio: number;
  /** How many done steps it stands on, so the owner can judge whether to believe it. */
  samples: number;
}

/**
 * A step can answer only when it carries both halves: an estimate, and effort attributed to it
 * while it alone was marked (`D-027`). A step closed without attribution is not a zero — the
 * product does not know what it took — and counting it as one would drag the ratio down.
 */
export function isSample(step: Step, effortMinutes: number): boolean {
  return step.estimateMinutes !== null && step.estimateMinutes > 0 && effortMinutes > 0;
}

/**
 * The ratio of sums rather than the mean of per-step ratios: a five-minute step estimated at one
 * would otherwise count as heavily as a four-hour one, and dominate. Summing weighs each sample
 * by its size, which is what "how you estimate" means at the scale you actually work.
 */
export async function readCalibration(
  store: Store,
  ownerId: string,
): Promise<Calibration | null> {
  const samples = await store.readCalibrationSamples(ownerId, CALIBRATION_WINDOW);
  if (samples.length < CALIBRATION_MINIMUM) return null;

  const estimate = samples.reduce((total, sample) => total + sample.estimateMinutes, 0);
  const actual = samples.reduce((total, sample) => total + sample.effortMinutes, 0);
  if (estimate === 0) return null;
  return { ratio: actual / estimate, samples: samples.length };
}
