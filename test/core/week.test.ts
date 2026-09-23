import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Commitment, Entry, Week } from "../../core/model/entities.ts";
import type { Store } from "../../core/ports/store.ts";
import { closeWeek, openWeek, readCurrentWeek, weekBounds, weekStartsOn } from "../../core/rules/week.ts";
import { spendReserve, writeCommitment } from "../../core/rules/commitment.ts";

function fixture() {
  let moment = new Date(2026, 8, 23, 12);
  let sequence = 0;
  const clock = { now: () => new Date(moment.getTime()) };
  const ids = { next: () => `id-${++sequence}` };
  const weeks: Week[] = [];
  const commitments: Commitment[] = [];
  const entries: Entry[] = [];
  const store = {
    getOwner: async (id: string) => id === "owner" ? { id, activeCap: 2, capRaises: [] } : null,
    getProject: async (id: string) => id === "project" ? { id, ownerId: "owner" } : null,
    openWeek: async (week: Week, closedAt: string) => {
      for (const older of weeks) if (older.startsOn < week.startsOn && older.closedAt === null) older.closedAt = closedAt;
      const existing = weeks.find(w => w.ownerId === week.ownerId && w.startsOn === week.startsOn);
      if (existing) return existing;
      weeks.push(week); return week;
    },
    getWeek: async (id: string, ownerId: string) => weeks.find(w => w.id === id && w.ownerId === ownerId) ?? null,
    getWeekStartingOn: async (ownerId: string, startsOn: string) => weeks.find(w => w.ownerId === ownerId && w.startsOn === startsOn) ?? null,
    closeWeek: async (week: Week) => {
      const index = weeks.findIndex(w => w.id === week.id && w.closedAt === null);
      if (index < 0) return false;
      weeks[index] = week; return true;
    },
    listCommitments: async (weekId: string, ownerId: string) => commitments.filter(c => c.weekId === weekId && c.ownerId === ownerId),
    writeCommitment: async (c: Commitment) => {
      const index = commitments.findIndex(old => old.weekId === c.weekId && old.projectId === c.projectId);
      if (index < 0) commitments.push(c); else commitments[index] = c;
      return true;
    },
    spendReserve: async (entry: Entry, weekId: string) => {
      if (!commitments.some(c => c.weekId === weekId && c.projectId === entry.projectId)) return false;
      entries.push(entry); return true;
    },
  } as unknown as Store;
  return { store, clock, ids, weeks, commitments, entries, advance: () => { moment = new Date(2026, 8, 28, 0, 30); } };
}

describe("the week", () => {
  it("uses local Monday through Sunday, across month and year boundaries", () => {
    assert.equal(weekStartsOn(new Date(2026, 8, 27, 23, 59)), "2026-09-21");
    assert.equal(weekStartsOn(new Date(2026, 8, 28, 0, 30)), "2026-09-28");
    assert.equal(weekStartsOn(new Date(2027, 0, 1, 12)), "2026-12-28");
    assert.equal(weekStartsOn(new Date(2024, 1, 29, 12)), "2024-02-26");
    // These weeks cross DST changes when this suite runs in America/New_York.
    for (const monday of ["2026-03-02", "2026-10-26"]) {
      const dst = weekBounds(monday);
      const start = new Date(dst.startsAt);
      const end = new Date(dst.endsAt);
      assert.equal(start.getHours(), 0);
      assert.equal(end.getHours(), 0);
      assert.equal(end.getDay(), 1);
      const expected = new Date(start.getTime());
      expected.setDate(expected.getDate() + 7);
      assert.equal(end.getTime(), expected.getTime());
    }
    const bounds = weekBounds("2026-09-21");
    assert.equal(new Date(bounds.startsAt).getHours(), 0);
    assert.equal(new Date(bounds.endsAt).getDate(), 28);
  });

  it("reads without creating and opens idempotently", async () => {
    const f = fixture();
    assert.equal(await readCurrentWeek(f.store, f.clock, "owner"), null);
    const week = await openWeek(f.store, f.clock, f.ids, "owner");
    assert.deepEqual(await openWeek(f.store, f.clock, f.ids, "owner"), week);
    assert.equal(f.weeks.length, 1);
    await assert.rejects(openWeek(f.store, f.clock, f.ids, "other"), /does not exist/);
  });

  it("accepts every owner capacity correction without inference and freezes the close", async () => {
    for (const capacityLabel of ["light", "normal", "heavy", null] as const) {
      const f = fixture();
      const week = await openWeek(f.store, f.clock, f.ids, "owner");
      const input = { ownerId: "owner", weekId: week.id, capacityLabel, tagId: null, reflection: "Una semana" };
      const closed = await closeWeek(f.store, f.clock, input);
      assert.equal(closed.capacityLabel, capacityLabel);
      assert.ok(closed.closedAt);
      assert.deepEqual(await closeWeek(f.store, f.clock, { ...input, capacityLabel: "heavy" }), closed);
      await assert.rejects(closeWeek(f.store, f.clock, { ...input, ownerId: "other" }), /does not exist/);
    }
  });

  it("closes missing work without carrying any target, shortfall or reserve into Monday", async () => {
    const f = fixture();
    const week = await openWeek(f.store, f.clock, f.ids, "owner");
    await writeCommitment(f.store, f.clock, f.ids, { ownerId: "owner", projectId: "project", weekId: week.id, target: 10, unit: "times", proposedTarget: null });
    await closeWeek(f.store, f.clock, { ownerId: "owner", weekId: week.id, capacityLabel: "light", tagId: null, reflection: null });
    f.advance();
    const next = await openWeek(f.store, f.clock, f.ids, "owner");
    assert.equal(next.startsOn, "2026-09-28");
    assert.deepEqual(await f.store.listCommitments(next.id, "owner"), []);
    assert.equal(next.capacityLabel, null);
    assert.equal(f.entries.length, 0);
  });

  it("self-closes an unattended week once, leaving it unlabelled", async () => {
    const f = fixture();
    const week = await openWeek(f.store, f.clock, f.ids, "owner");
    f.advance();
    await openWeek(f.store, f.clock, f.ids, "owner");
    const closed = await f.store.getWeek(week.id, "owner");
    assert.ok(closed?.closedAt);
    assert.equal(closed.capacityLabel, null);
    assert.equal(closed.tagId, null);
    assert.equal(closed.reflection, null);
    await openWeek(f.store, f.clock, f.ids, "owner");
    assert.deepEqual(await f.store.getWeek(week.id, "owner"), closed);
  });
});

describe("commitments and reserve events", () => {
  it("stores either unit with the rounded reserve and edits the same commitment", async () => {
    const f = fixture();
    const week = await openWeek(f.store, f.clock, f.ids, "owner");
    const input = { ownerId: "owner", projectId: "project", weekId: week.id, proposedTarget: null };
    let id: string | undefined;
    for (const [target, reserve] of [[1, 1], [3, 1], [4, 2], [10, 3], [11, 4]]) {
      const c = await writeCommitment(f.store, f.clock, f.ids, { ...input, target, unit: "minutes" });
      assert.equal(c.reserve, reserve);
      assert.equal(c.unit, "minutes");
      if (id) assert.equal(c.id, id);
      id = c.id;
    }
    assert.equal(f.commitments.length, 1);
  });

  it("rejects clock slots, invalid numbers and units, and foreign ownership", async () => {
    const f = fixture();
    const week = await openWeek(f.store, f.clock, f.ids, "owner");
    const input = { ownerId: "owner", projectId: "project", weekId: week.id, target: 3, unit: "times" as const, proposedTarget: null };
    for (const target of ["09:00", "3", 0, -1, 1.5, NaN, Infinity]) {
      await assert.rejects(writeCommitment(f.store, f.clock, f.ids, { ...input, target: target as number }), /positive integer/);
    }
    await assert.rejects(writeCommitment(f.store, f.clock, f.ids, { ...input, unit: "hours" as "times" }), /unit/);
    await assert.rejects(writeCommitment(f.store, f.clock, f.ids, { ...input, proposedTarget: -1 }), /Proposed/);
    await assert.rejects(writeCommitment(f.store, f.clock, f.ids, { ...input, ownerId: "other" }), /does not exist/);
    await assert.rejects(writeCommitment(f.store, f.clock, f.ids, { ...input, projectId: "other" }), /does not exist/);
  });

  it("records spending as entries, never decrements reserve, and rejects closed or stale weeks", async () => {
    const f = fixture();
    const week = await openWeek(f.store, f.clock, f.ids, "owner");
    const input = { ownerId: "owner", projectId: "project", weekId: week.id, target: 3, unit: "times" as const, proposedTarget: null };
    const event = { ...input, what: " Usé la reserva ", note: null };
    await assert.rejects(spendReserve(f.store, f.clock, f.ids, event), /commitment is required/);
    const c = await writeCommitment(f.store, f.clock, f.ids, input);
    const spent = await spendReserve(f.store, f.clock, f.ids, event);
    assert.equal(spent.kind, "reserve_spend");
    assert.equal(spent.what, "Usé la reserva");
    assert.equal(spent.effortMinutes, null);
    assert.equal(spent.stepId, null);
    assert.deepEqual(f.commitments, [c]);
    assert.deepEqual(f.entries, [spent]);
    f.advance();
    await assert.rejects(spendReserve(f.store, f.clock, f.ids, event), /current open week/);
    await assert.rejects(writeCommitment(f.store, f.clock, f.ids, input), /current open week/);
    await openWeek(f.store, f.clock, f.ids, "owner");
    await assert.rejects(spendReserve(f.store, f.clock, f.ids, event), /current open week/);
  });
});
