import { useState } from "react";
import { Bars } from "../components/Bars";
import { Status } from "../components/State";
import { downloadCsv } from "../utils/csv";
import { activeOnly, addDays, iso, pretty } from "../utils/helpers";
import { hoursBy, inRange, money, r1, useRangeState, weekOf, wonAt } from "../utils/reports";
import { useCollection } from "../utils/useCol";

export default function WeeklySummary() {
  const today = iso(new Date());
  const [ws, setWs] = useState(weekOf(today)[0]);
  const we = addDays(ws, 6);
  const upsS = useRangeState(ws, we);
  const peopleS = useCollection("users"), dealsS = useCollection("deals");
  const ups = upsS.rows, people = activeOnly(peopleS.rows), deals = dealsS.rows;
  const states = [upsS, peopleS, dealsS];
  const h = hoursBy(ups);
  const won = deals.filter((d) => inRange(wonAt(d), ws, we));
  const tasks = ups.reduce((s, u) => s + (u.tasks?.length || 0), 0);
  const hours = r1(h.person.reduce((s, r) => s + r.value, 0));
  const blockers = ups.filter((u) => u.blockers?.trim()).sort((a, b) => a.date.localeCompare(b.date));
  const rows = people.map((p) => { const mine = ups.filter((u) => u.uid === p.id); return { name: p.name, days: mine.length, tasks: mine.reduce((s, u) => s + (u.tasks?.length || 0), 0), hours: r1(hoursBy(mine).person.reduce((s, r) => s + r.value, 0)) }; });
  const exportCsv = () => downloadCsv(`weekly-tasks-${ws}.csv`, [
    ["Date", "Person", "Fields", "Client / project", "What was done", "Hours", "Status"],
    ...[...ups].sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name)).flatMap((u) => (u.tasks || []).map((t) => [u.date, u.name, (t.fields || []).join("; "), t.client, t.what, t.hours, t.status])),
  ]);
  return (
    <>
      <header className="top"><div><h1>Weekly summary</h1><p className="muted">{pretty(ws)} to {pretty(we)}</p></div>
        <div className="actions noprint">
          <div className="datenav"><button className="btn ghost" onClick={() => setWs(addDays(ws, -7))} aria-label="Previous week">‹</button>
            <button className="btn ghost" disabled={we >= today} onClick={() => setWs(addDays(ws, 7))} aria-label="Next week">›</button></div>
          <button className="btn ghost" onClick={exportCsv}>Export CSV</button>
          <button className="btn" onClick={() => window.print()}>Print / PDF</button></div></header>
      <Status loading={states.some((x) => x.loading)} error={states.find((x) => x.error)?.error}>
      <div className="stats">
        {[[hours, "Hours logged"], [tasks, "Tasks done"], [ups.length, "Daily updates posted"], [won.length, "Deals won"]].map(([n, l], i) => <div key={l} className="stat" style={{ animationDelay: `${i * 60}ms` }}><b>{n}</b><span>{l}</span></div>)}
      </div>
      <section className="panel" style={{ marginBottom: "1rem" }}><h2>By person</h2>
        <div className="tblwrap"><table className="tbl"><thead><tr><th>Person</th><th>Days posted</th><th>Tasks</th><th>Hours</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.name}><td><strong>{r.name}</strong></td><td>{r.days}</td><td>{r.tasks}</td><td>{r.hours}</td></tr>)}</tbody></table></div></section>
      <div className="cards2">
        <section className="panel"><h2>Hours by service</h2><Bars unit=" h" rows={h.service} empty="No hours logged this week." /></section>
        <section className="panel"><h2>Deals won</h2>
          {won.length ? won.map((d) => <p key={d.id}><strong>{d.projectName}</strong> <span className="muted">{d.clientName}, {money(d.value)}</span></p>) : <p className="muted">No deals closed this week.</p>}</section>
      </div>
      <section className="panel" style={{ marginTop: "1rem" }}><h2>Blockers raised</h2>
        {blockers.length ? blockers.map((u) => <p key={u.uid + u.date}><strong>{u.name}</strong> <span className="muted">{pretty(u.date)}:</span> {u.blockers}</p>) : <p className="muted">No blockers this week.</p>}</section>
      </Status>
    </>
  );
}
