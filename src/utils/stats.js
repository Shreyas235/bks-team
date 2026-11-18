// Pure report helpers (no Firebase) so they can be unit tested.
import { STAGES } from "./constants";
import { addDays, iso } from "./helpers";

export const OPEN = STAGES.slice(0, 5);
export const WON = STAGES.slice(5, 8);
export const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
export const r1 = (n) => Math.round(n * 10) / 10;
export const wonAt = (d) => (d.history || []).find((h) => WON.includes(h.stage))?.at || null;
export const weekOf = (s) => { const d = new Date(s + "T00:00:00"); const mon = addDays(s, -((d.getDay() + 6) % 7)); return [mon, addDays(mon, 6)]; };
export const inRange = (ms, a, b) => ms && iso(new Date(ms)) >= a && iso(new Date(ms)) <= b;
export const monthOf = (ms) => iso(new Date(ms)).slice(0, 7);

export function hoursBy(ups) {
  const person = {}, service = {};
  ups.forEach((u) => (u.tasks || []).forEach((t) => {
    const h = Number(t.hours) || 0; const fs = t.fields?.length ? t.fields : ["Other"];
    person[u.name] = (person[u.name] || 0) + h;
    fs.forEach((f) => { service[f] = (service[f] || 0) + h / fs.length; });
  }));
  const rows = (o) => Object.entries(o).map(([label, v]) => ({ label, value: r1(v) })).filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  return { person: rows(person), service: rows(service) };
}

// ["2026-06", ..., "2026-11"] ending at the month of `today`.
export function lastMonths(n, today) {
  let [y, m] = today.slice(0, 7).split("-").map(Number);
  const out = [];
  for (let i = 0; i < n; i++) { out.unshift(`${y}-${String(m).padStart(2, "0")}`); if (--m < 1) { m = 12; y--; } }
  return out;
}
export const wonByMonth = (deals, months) => months.map((k) => {
  const hit = deals.filter((d) => { const t = wonAt(d); return t && monthOf(t) === k; });
  return { k, count: hit.length, value: hit.reduce((s, d) => s + (Number(d.value) || 0), 0) };
});
export const revenueByMonth = (payments, months) => months.map((k) => {
  const rows = payments.filter((p) => p.date?.startsWith(k));
  const sum = (f) => rows.filter(f).reduce((s, p) => s + (Number(p.rate) || 0), 0);
  return { k, paid: sum((p) => p.payStatus === "Paid"), pending: sum((p) => p.payStatus !== "Paid") };
});
// Monday dates of the last n weeks, oldest first.
export const weekStarts = (n, today) => Array.from({ length: n }, (_, i) => addDays(weekOf(today)[0], -7 * (n - 1 - i)));
export function hoursByWeek(ups, starts) {
  const people = {};
  ups.forEach((u) => {
    const i = starts.findIndex((s) => u.date >= s && u.date <= addDays(s, 6));
    if (i < 0) return;
    const row = (people[u.name] = people[u.name] || starts.map(() => 0));
    row[i] += (u.tasks || []).reduce((s, t) => s + (Number(t.hours) || 0), 0);
  });
  return Object.entries(people).map(([name, weeks]) => ({ name, weeks: weeks.map(r1) })).sort((a, b) => a.name.localeCompare(b.name));
}
export const targetProgress = (won, target) => (target > 0 ? Math.min(100, Math.round((won / target) * 100)) : 0);
