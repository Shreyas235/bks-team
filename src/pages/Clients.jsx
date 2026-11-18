import { useState } from "react";
import { collection, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { Modal } from "../components/Modal";
import { Status } from "../components/State";
import { buildClients, clientPayments, clientTasks } from "../utils/clients";
import { addDays, iso, pretty, rolesOf } from "../utils/helpers";
import { matches } from "../utils/search";
import { money, r1 } from "../utils/reports";
import { useCollection, useQueryRows } from "../utils/useCol";

const sum = (list, f) => list.reduce((s, x) => s + (Number(f(x)) || 0), 0);

function ClientDetail({ c, payments, updates, head, onClose }) {
  const pays = clientPayments(c, payments), tasks = clientTasks(c, updates);
  const paid = sum(pays.filter((p) => p.payStatus === "Paid"), (p) => p.rate), pending = sum(pays.filter((p) => p.payStatus !== "Paid"), (p) => p.rate);
  return (
    <Modal title={c.name} onClose={onClose}>
      <div className="stats clientstats">
        {[[money(c.value), "Deal value"], [money(paid), "Paid"], [money(pending), "Pending"], [`${r1(sum(tasks, (t) => t.hours))} h`, "Hours logged"]].map(([n, l]) => <div key={l} className="stat"><b>{n}</b><span>{l}</span></div>)}
      </div>
      <h3>Deals ({c.deals.length})</h3>
      {c.deals.map((d) => <p key={d.id}><strong>{d.projectName}</strong> <span className="muted">{d.stage}, {money(d.value)}, owner {d.ownerName}</span></p>)}
      <h3>Payments ({pays.length})</h3>
      {pays.length ? pays.map((p) => <p key={p.id}><strong>{p.project}</strong> <span className="muted">{pretty(p.date)}, {money(p.rate)}, {p.payStatus}{head ? ` (${p.name})` : ""}</span></p>) : <p className="muted">No payments linked yet.</p>}
      <h3>Daily-update tasks ({tasks.length})</h3>
      {tasks.length ? tasks.slice(0, 15).map((t, i) => <p key={i}><span className="muted">{pretty(t.date)}, {t.name}, {t.hours} h:</span> {t.what}</p>) : <p className="muted">No tasks logged against this client in the last year.</p>}
      <p className="muted small">Linked by name: a payment or task counts when the client or one of its project names appears in it.{head ? "" : " You only see your own payments."}</p>
    </Modal>
  );
}

export default function Clients({ me }) {
  const head = rolesOf(me).includes("head");
  const since = addDays(iso(new Date()), -365);
  const dealsS = useCollection("deals");
  const paysS = useQueryRows(() => (head ? collection(db, "payments") : query(collection(db, "payments"), where("uid", "==", me.uid))), [head, me.uid]);
  const upsS = useQueryRows(() => query(collection(db, "updates"), where("date", ">=", since)), [since]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const states = [dealsS, paysS, upsS];
  const clients = buildClients(dealsS.rows).filter((c) => matches(q, c.name, c.deals.map((d) => d.projectName)));
  const current = open && buildClients(dealsS.rows).find((c) => c.key === open);

  return (
    <>
      <header className="top"><div><h1>Clients</h1><p className="muted">Every client's deals, payments and logged work in one place.</p></div></header>
      <div className="searchbar"><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients or projects…" aria-label="Search clients" /></div>
      <Status loading={states.some((s) => s.loading)} error={states.find((s) => s.error)?.error}>
        <div className="feed">
          {clients.map((c) => {
            const pays = clientPayments(c, paysS.rows), tasks = clientTasks(c, upsS.rows);
            return (
              <article key={c.key} className="panel click clientcard" onClick={() => setOpen(c.key)}>
                <h2>{c.name}</h2>
                <p className="muted">{c.deals.length} deal{c.deals.length > 1 ? "s" : ""}, {money(c.value)}</p>
                <p className="muted small">{pays.length} payment{pays.length === 1 ? "" : "s"}, {r1(sum(tasks, (t) => t.hours))} h logged</p>
              </article>);
          })}
          {!clients.length && <p className="empty">{q ? "No clients match." : "No clients yet. They appear when you add deals."}</p>}
        </div>
      </Status>
      {current && <ClientDetail c={current} payments={paysS.rows} updates={upsS.rows} head={head} onClose={() => setOpen(null)} />}
    </>
  );
}
