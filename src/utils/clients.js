// Client records are derived from deal client names (no separate client table yet).
const norm = (s) => String(s || "").trim().toLowerCase();

export function buildClients(deals) {
  const map = new Map();
  deals.forEach((d) => {
    const key = norm(d.clientName); if (!key) return;
    const c = map.get(key) || { key, name: d.clientName.trim(), deals: [], value: 0 };
    c.deals.push(d); c.value += Number(d.value) || 0; map.set(key, c);
  });
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
// Names a payment/task text may use for this client: the client and its project names.
const names = (c) => [c.key, ...c.deals.map((d) => norm(d.projectName))].filter((n) => n.length >= 3);
const hit = (text, c) => { const t = norm(text); return names(c).some((n) => t.includes(n)); };

export const clientPayments = (c, payments) => payments.filter((p) => hit(p.project, c) || hit(p.description, c));
export function clientTasks(c, updates) {
  const out = [];
  updates.forEach((u) => (u.tasks || []).forEach((t) => { if (hit(t.client, c)) out.push({ ...t, date: u.date, name: u.name }); }));
  return out.sort((a, b) => b.date.localeCompare(a.date));
}
