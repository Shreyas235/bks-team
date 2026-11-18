export const rolesOf = (u) => (u?.roles?.length ? u.roles : u?.role ? [u.role] : ["member"]);
export const iso = (d) => { const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return x.toISOString().slice(0, 10); };
export const addDays = (s, n) => { const d = new Date(s + "T00:00:00"); d.setDate(d.getDate() + n); return iso(d); };
export const pretty = (s) => new Date(s + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
export const prettyLong = (s) => new Date(s + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
export const time12 = (t) => t ? new Date("2000-01-01T" + t).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "";
export const initials = (n = "?") => n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
export const onLeaveOn = (leaves, date) => leaves.filter((l) => l.from <= date && date <= l.to);
export const activeOnly = (list) => list.filter((p) => p.active !== false);
// Daily-update reminder: from 6 pm, Monday to Saturday.
export const isReminderTime = (now, hour = 18) => now.getDay() !== 0 && now.getHours() >= hour;
export const monthShort = (k) => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+k.slice(5, 7) - 1];
