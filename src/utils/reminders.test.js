import { describe, expect, it } from "vitest";
import { beforesOf, daysBetween, dueReminders, nextOccurrence, occursOn, remindSummary, whenText } from "./reminders";

describe("occursOn", () => {
  it("one-off only on its day", () => { const r = { date: "2026-12-05" }; expect(occursOn(r, "2026-12-05")).toBe(true); expect(occursOn(r, "2026-12-06")).toBe(false); expect(occursOn(r, "2026-12-04")).toBe(false); });
  it("yearly repeats on the same day, never before the start", () => {
    const r = { date: "2026-03-14", repeat: "yearly" };
    expect(occursOn(r, "2027-03-14")).toBe(true); expect(occursOn(r, "2027-03-15")).toBe(false); expect(occursOn(r, "2025-03-14")).toBe(false);
  });
  it("yearly 29 Feb falls on 28 Feb in normal years", () => { const r = { date: "2028-02-29", repeat: "yearly" }; expect(occursOn(r, "2029-02-28")).toBe(true); expect(occursOn(r, "2032-02-29")).toBe(true); });
  it("monthly day 31 clamps to the month end", () => { const r = { date: "2026-01-31", repeat: "monthly" }; expect(occursOn(r, "2026-02-28")).toBe(true); expect(occursOn(r, "2026-04-30")).toBe(true); expect(occursOn(r, "2026-03-30")).toBe(false); });
});
describe("nextOccurrence", () => {
  it("finds the next yearly date across the year end", () => expect(nextOccurrence({ date: "2026-01-10", repeat: "yearly" }, "2026-12-20")).toBe("2027-01-10"));
  it("returns today when it is today", () => expect(nextOccurrence({ date: "2026-11-18" }, "2026-11-18")).toBe("2026-11-18"));
  it("is null for a one-off in the past", () => expect(nextOccurrence({ date: "2026-01-01" }, "2026-11-18")).toBeNull());
});
describe("dueReminders", () => {
  const domain = { id: "d1", uid: "u1", date: "2027-01-15", repeat: "yearly", befores: [30], notifyAll: true, title: "Renew domain: bks.com" };
  it("domain renewal shows 30 days ahead, for everyone", () => {
    const due = dueReminders([domain], "2026-12-20", "u2");
    expect(due).toHaveLength(1); expect(due[0].days).toBe(26); expect(due[0].key).toBe("r:d1:2027-01-15:30");
  });
  it("not yet due outside the window", () => expect(dueReminders([domain], "2026-11-18", "u2")).toHaveLength(0));
  it("private reminders only for their creator", () => {
    const mine = { id: "m", uid: "u1", date: "2026-11-18", before: 0, notifyAll: false };
    expect(dueReminders([mine], "2026-11-18", "u1")).toHaveLength(1); expect(dueReminders([mine], "2026-11-18", "u2")).toHaveLength(0);
  });
  it("renews again next year", () => expect(dueReminders([domain], "2027-12-25", "u1")[0].date).toBe("2028-01-15"));
});
describe("several remind times", () => {
  const r = { id: "x", uid: "u1", date: "2026-12-25", befores: [7, 1], notifyAll: true };
  it("not due before the first time", () => expect(dueReminders([r], "2026-12-17", "u2")).toHaveLength(0));
  it("first alert 7 days before", () => { const d = dueReminders([r], "2026-12-18", "u2"); expect(d).toHaveLength(1); expect(d[0].key).toBe("r:x:2026-12-25:7"); });
  it("stays on in between with the same key (so dismiss sticks)", () => expect(dueReminders([r], "2026-12-21", "u2")[0].key).toBe("r:x:2026-12-25:7"));
  it("alerts again 1 day before with a new key", () => expect(dueReminders([r], "2026-12-24", "u2")[0].key).toBe("r:x:2026-12-25:1"));
  it("still shows on the day itself", () => { const d = dueReminders([r], "2026-12-25", "u2")[0]; expect(d.days).toBe(0); expect(d.key).toBe("r:x:2026-12-25:1"); });
  it("old reminders with a single before number still work", () => { expect(beforesOf({ before: 3 })).toEqual([3]); expect(dueReminders([{ id: "o", uid: "u", date: "2026-11-20", before: 3, notifyAll: true }], "2026-11-18", "z")).toHaveLength(1); });
  it("summary reads naturally", () => { expect(remindSummary({ befores: [1, 30, 7] })).toBe("1 month, 1 week, 1 day before"); expect(remindSummary({ befores: [0] })).toBe("on the day"); expect(remindSummary({ befores: [3, 0] })).toBe("3 days before and on the day"); });
});
describe("text", () => {
  it("days and wording", () => { expect(daysBetween("2026-12-31", "2027-01-02")).toBe(2); expect([0, 1, 5].map(whenText)).toEqual(["today", "tomorrow", "in 5 days"]); });
});
