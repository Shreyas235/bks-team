import { describe, expect, it } from "vitest";
import { activeOnly, addDays, initials, iso, isReminderTime, onLeaveOn, rolesOf, time12 } from "./helpers";

describe("dates", () => {
  it("iso uses the local calendar day", () => expect(iso(new Date(2026, 10, 17, 23, 30))).toBe("2026-11-17"));
  it("addDays crosses month and year ends", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-03-01", -1)).toBe("2027-02-28");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
  it("time12 formats 24h time", () => { expect(time12("")).toBe(""); expect(time12("13:05").toLowerCase()).toContain("1:05"); });
});
describe("roles", () => {
  it("falls back to member", () => expect(rolesOf(undefined)).toEqual(["member"]));
  it("reads the old single role", () => expect(rolesOf({ role: "head" })).toEqual(["head"]));
  it("prefers the roles list", () => expect(rolesOf({ role: "head", roles: ["sales", "head"] })).toEqual(["sales", "head"]));
});
describe("people and leave", () => {
  it("activeOnly hides disabled members", () => expect(activeOnly([{ id: 1 }, { id: 2, active: false }, { id: 3, active: true }]).map((p) => p.id)).toEqual([1, 3]));
  it("onLeaveOn is inclusive", () => {
    const l = [{ from: "2026-11-10", to: "2026-11-12" }];
    expect(onLeaveOn(l, "2026-11-10")).toHaveLength(1); expect(onLeaveOn(l, "2026-11-12")).toHaveLength(1); expect(onLeaveOn(l, "2026-11-13")).toHaveLength(0);
  });
  it("initials takes two letters", () => expect(initials("Ravi Kiran Iyengar")).toBe("RK"));
});
describe("reminder time", () => {
  it("is after 6 pm, not on Sunday", () => {
    expect(isReminderTime(new Date(2026, 10, 17, 17, 59))).toBe(false);
    expect(isReminderTime(new Date(2026, 10, 17, 18, 0))).toBe(true);
    expect(isReminderTime(new Date(2026, 10, 15, 19, 0))).toBe(false);
  });
});
