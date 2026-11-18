import { describe, expect, it } from "vitest";
import { hoursBy, hoursByWeek, inRange, lastMonths, money, revenueByMonth, targetProgress, weekOf, weekStarts, wonAt, wonByMonth } from "./stats";

describe("weekOf", () => {
  it("runs Monday to Sunday", () => {
    expect(weekOf("2026-11-17")).toEqual(["2026-11-16", "2026-11-22"]);
    expect(weekOf("2026-11-15")).toEqual(["2026-11-09", "2026-11-15"]);
    expect(weekOf("2026-11-16")).toEqual(["2026-11-16", "2026-11-22"]);
  });
});
describe("months", () => {
  it("lastMonths wraps over the year end", () => expect(lastMonths(4, "2027-02-10")).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]));
  it("weekStarts are Mondays, oldest first", () => expect(weekStarts(3, "2026-11-17")).toEqual(["2026-11-02", "2026-11-09", "2026-11-16"]));
});
describe("deals", () => {
  const d = { value: 5000, history: [{ stage: "Lead", at: 1 }, { stage: "Deal closed", at: new Date(2026, 10, 5, 12).getTime() }] };
  it("wonAt finds the first won stage", () => expect(wonAt(d)).toBe(d.history[1].at));
  it("wonAt is null for open deals", () => expect(wonAt({ history: [{ stage: "Lead", at: 1 }] })).toBeNull());
  it("inRange is inclusive", () => { expect(inRange(d.history[1].at, "2026-11-05", "2026-11-05")).toBe(true); expect(inRange(d.history[1].at, "2026-11-06", "2026-11-30")).toBe(false); });
  it("wonByMonth counts and sums", () => expect(wonByMonth([d, { history: [] }], ["2026-10", "2026-11"])).toEqual([{ k: "2026-10", count: 0, value: 0 }, { k: "2026-11", count: 1, value: 5000 }]));
});
describe("money and hours", () => {
  it("formats rupees in Indian grouping", () => expect(money(1234567)).toBe("₹12,34,567"));
  it("splits task hours across fields", () => {
    const r = hoursBy([{ name: "A", tasks: [{ hours: 2, fields: ["Sales", "Other"] }, { hours: 1, fields: [] }] }]);
    expect(r.person).toEqual([{ label: "A", value: 3 }]);
    expect(r.service).toEqual([{ label: "Other", value: 2 }, { label: "Sales", value: 1 }]);
  });
  it("hoursByWeek buckets by week", () => {
    const starts = ["2026-11-09", "2026-11-16"];
    const r = hoursByWeek([{ name: "A", date: "2026-11-15", tasks: [{ hours: 2 }] }, { name: "A", date: "2026-11-16", tasks: [{ hours: 1.5 }] }, { name: "A", date: "2026-10-01", tasks: [{ hours: 9 }] }], starts);
    expect(r).toEqual([{ name: "A", weeks: [2, 1.5] }]);
  });
});
describe("payments", () => {
  it("revenueByMonth splits paid and pending", () => expect(revenueByMonth([
    { date: "2026-07-27", rate: 8000, payStatus: "Pending" }, { date: "2026-07-25", rate: 25000, payStatus: "Paid" }, { date: "2026-08-01", rate: 1000, payStatus: "Pending" },
  ], ["2026-07", "2026-08"])).toEqual([{ k: "2026-07", paid: 25000, pending: 8000 }, { k: "2026-08", paid: 0, pending: 1000 }]));
});
describe("target", () => {
  it("caps at 100 and handles no target", () => { expect(targetProgress(50, 200)).toBe(25); expect(targetProgress(500, 200)).toBe(100); expect(targetProgress(5, 0)).toBe(0); });
});
