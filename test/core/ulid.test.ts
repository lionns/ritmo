import assert from "node:assert/strict";
import { test } from "node:test";

import { UlidGenerator } from "../../adapters/ulid.ts";
import type { Clock } from "../../core/ports/clock.ts";

test("ULIDs are Crockford base32 and sort by generation time", () => {
  const times = [new Date("2026-08-31T12:00:00.000Z"), new Date("2026-08-31T12:00:00.001Z")];
  const clock: Clock = { now: () => times.shift()! };
  const generator = new UlidGenerator(clock);

  const first = generator.next();
  const second = generator.next();

  assert.match(first, /^[0-9A-HJKMNP-TV-Z]{26}$/);
  assert.match(second, /^[0-9A-HJKMNP-TV-Z]{26}$/);
  assert.ok(first < second);
});
