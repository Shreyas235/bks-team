import { addDays } from "./helpers";

export const REMIND_OPTIONS = [[0, "On the day"], [1, "1 day before"], [3, "3 days before"], [7, "1 week before"], [14, "2 weeks before"], [30, "1 month before"]];
export const REPEAT_OPTIONS = [["none", "Does not repeat"], ["monthly", "Every month"], ["yearly", "Every year"]];
// Choosing a type fills sensible defaults (renewals repeat every year and tell everyone early).
export const TYPES = {
  "Reminder": { repeat: "none", befores: [0], notifyAll: false, title: "" },
  "Domain renewal": { repeat: "yearly", befores: [30, 7, 1], notifyAll: true, title: "Renew domain: " },
  "Subscription renewal": { repeat: "yearly", befores: [14, 3], notifyAll: true, title: "Renew: " },
  "Payment due": { repeat: "none", befores: [3, 1], notifyAll: false, title: "Payment due: " },
  "Other": { repeat: "none", befores: [0], notifyAll: false, title: "" },
};

// Days-before list for a reminder (older reminders only have a single `before` number).
export const beforesOf = (r) => (r.befores?.length ? [...r.befores].map(Number) : [Number(r.before) || 0]);
const LABEL = { 0: "on the day", 1: "1 day", 3: "3 days", 7: "1 week", 14: "2 weeks", 30: "1 month" };
export const remindSummary = (r) => {
  const bs = [...beforesOf(r)].sort((a, b) => b - a);
  const parts = bs.filter((b) => b > 0).map((b) => LABEL[b] || `${b} days`);
  const text = parts.length ? `${parts.join(", ")} before` : "";
  return bs.includes(0) ? (text ? `${text} and on the day` : "on the day") : text;
};

const utc = (s) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
export const daysBetween = (a, b) => Math.round((utc(b) - utc(a)) / 864e5);

// Does reminder r fall on calendar day d ("YYYY-MM-DD")? Day 29-31 clamps to the month's last day.
export function occursOn(r, d) {
  if (!r.date || d < r.date) return false;
  if (!r.repeat || r.repeat === "none") return d === r.date;
  const [, m0, day0] = r.date.split("-").map(Number);
  const [y, m, day] = d.split("-").map(Number);
  const want = Math.min(day0, new Date(y, m, 0).getDate());
  if (r.repeat === "monthly") return day === want;
  if (r.repeat === "yearly") return m === m0 && day === want;
  return false;
}
// First date on or after `from` when r happens, or null (past one-off reminders).
export function nextOccurrence(r, from) {
  for (let i = 0; i <= 400; i++) { const d = addDays(from, i); if (occursOn(r, d)) return d; }
  return null;
}
// Reminders that should show up as a notification today for this person.
// With several times (say 1 week and 1 day before) it shows from the first one, and alerts again
// when the next one is reached: the key changes with the stage, so a dismissed alert comes back.
export function dueReminders(reminders, today, uid) {
  return reminders
    .filter((r) => r.notifyAll || r.uid === uid)
    .map((r) => {
      const date = nextOccurrence(r, today); if (!date) return null;
      const days = daysBetween(today, date);
      const stages = beforesOf(r).filter((b) => b >= days);
      if (!stages.length) return null;
      return { r, date, days, key: `r:${r.id}:${date}:${Math.min(...stages)}` };
    })
    .filter(Boolean)
    .sort((a, b) => a.days - b.days);
}
export const whenText = (days) => (days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`);
