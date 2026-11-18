import { useState } from "react";
import { addDoc, collection, deleteDoc, doc, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase";
import { DatePicker } from "../components/DatePicker";
import { Modal } from "../components/Modal";
import { Status } from "../components/State";
import { downloadCsv } from "../utils/csv";
import { matches } from "../utils/search";
import { iso, rolesOf } from "../utils/helpers";
import { useCol, useQueryRows } from "../utils/useCol";

const STATUS = ["In progress", "Delivered"];
const PAY = ["Pending", "Paid"];
const DESC = ["Website", "WebApp", "Mobile App", "Branding and Design", "Digital Marketing", "Custom Software", "Business Consulting", "Automation Training", "Maintenance"];
const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const mk = (d) => d.slice(0, 7);
const mdate = (k) => new Date(k + "-01T00:00:00");
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const mshort = (k) => MON[+k.slice(5, 7) - 1];
const mlong = (k) => mdate(k).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
const tabName = (k) => mdate(k).toLocaleDateString("en-IN", { month: "long" });
const dmy = (d) => d.split("-").reverse().join("-");
const cls = (v) => (v === "Delivered" || v === "Paid" ? "good" : v === "Pending" ? "bad" : "warn");
const rangeMonths = (a, b) => { const out = []; let [y, m] = a.split("-").map(Number); const [y2, m2] = b.split("-").map(Number);
  while (y < y2 || (y === y2 && m <= m2)) { out.push(`${y}-${String(m).padStart(2, "0")}`); if (++m > 12) { m = 1; y++; } } return out; };

function totals(rows) {
  const t = { billed: 0, paid: 0, pending: 0, unpaid: 0, delivered: 0 };
  rows.forEach((r) => {
    const v = Number(r.rate) || 0; t.billed += v;
    if (r.payStatus === "Paid") t.paid += v; else t.pending += v;
    if (r.status === "Delivered") { t.delivered++; if (r.payStatus !== "Paid") t.unpaid += v; }
  });
  return t;
}

function Entry({ row, me, defDate, onClose }) {
  const [f, setF] = useState({ date: defDate, project: "", description: "", status: "In progress", rate: "", payStatus: "Pending", ...row });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save(e) {
    e.preventDefault();
    const data = { date: f.date, project: f.project.trim(), description: f.description.trim(), status: f.status, rate: Number(f.rate) || 0, payStatus: f.payStatus };
    if (row) await updateDoc(doc(db, "payments", row.id), data);
    else await addDoc(collection(db, "payments"), { ...data, uid: me.uid, name: me.name, createdAt: serverTimestamp() });
    onClose();
  }
  return (
    <Modal title={row ? "Edit payment" : "Add payment"} onClose={onClose}>
      <form onSubmit={save}>
        <div className="field req">Date<DatePicker required value={f.date} onChange={(v) => v && setF({ ...f, date: v })} /></div>
        <label>Project name<input required value={f.project} onChange={set("project")} /></label>
        <label>Description<input required list="pdesc" value={f.description} onChange={set("description")} placeholder="Website, WebApp…" /></label>
        <datalist id="pdesc">{DESC.map((d) => <option key={d} value={d} />)}</datalist>
        <div className="two">
          <label>Status<select required value={f.status} onChange={set("status")}>{STATUS.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label>Rate (INR)<input type="number" min="0" required value={f.rate} onChange={set("rate")} /></label>
        </div>
        <label>Payment status<select required value={f.payStatus} onChange={set("payStatus")}>{PAY.map((s) => <option key={s}>{s}</option>)}</select></label>
        <div className="row between"><button className="btn">{row ? "Save changes" : "Add payment"}</button>
          {row && <button type="button" className="link" onClick={() => confirm("Delete this entry?") && deleteDoc(doc(db, "payments", row.id)).then(onClose)}>Delete</button>}</div>
      </form>
    </Modal>
  );
}

function Donut({ t, title }) {
  const pct = t.billed ? (t.paid / t.billed) * 100 : 0;
  return (
    <section className="panel"><h2>{title}</h2>
      <div className="donutwrap"><div className="donut" style={{ background: t.billed ? `conic-gradient(#8fa51f 0 ${pct}%, var(--crimson) 0)` : "var(--bg)" }}><div><b>{Math.round(pct)}%</b><span>paid</span></div></div>
        <div><p><i className="dot g" />Paid {inr(t.paid)}</p><p><i className="dot r" />Pending {inr(t.pending)}</p></div></div></section>
  );
}

export default function Payments({ me }) {
  const head = rolesOf(me).includes("head");
  const today = iso(new Date());
  const people = useCol("users");
  const [q, setQ] = useState("");
  const [who, setWho] = useState(me.uid);
  const [tab, setTab] = useState("summary");
  const [yearSel, setYearSel] = useState(String(new Date().getFullYear()));
  const [edit, setEdit] = useState(null);
  const paysS = useQueryRows(() => (head ? collection(db, "payments") : query(collection(db, "payments"), where("uid", "==", me.uid))), [head, me.uid]);
  const all = paysS.rows;

  const mine = who === me.uid;
  const ofWho = who === "all" ? all : all.filter((r) => r.uid === who);
  const thisYear = String(new Date().getFullYear());
  const years = [...new Set([thisYear, ...ofWho.map((r) => r.date.slice(0, 4))])].sort();
  const year = years.includes(yearSel) ? yearSel : thisYear;
  const scope = ofWho.filter((r) => r.date.startsWith(year));
  const dm = scope.map((r) => mk(r.date)).sort();
  const months = rangeMonths([`${year}-${year === "2026" ? "06" : "01"}`, dm[0]].filter(Boolean).sort()[0], `${year}-12`);
  const summary = tab === "summary" || !months.includes(tab);
  const rows = (summary ? scope : scope.filter((r) => mk(r.date) === tab)).sort((a, b) => b.date.localeCompare(a.date));
  const t = totals(rows);
  const byMonth = months.map((k) => ({ k, ...totals(scope.filter((r) => mk(r.date) === k)) }));
  const maxB = Math.max(1, ...byMonth.map((r) => r.billed));
  const maxD = Math.max(1, ...byMonth.map((r) => r.delivered));
  const ownerName = who === "all" ? "Everyone" : people.find((p) => p.id === who)?.name || "";
  const defDate = summary ? (year === thisYear ? today : `${year}-01-01`) : mk(today) === tab ? today : tab + "-01";
  const upd = (r, patch) => updateDoc(doc(db, "payments", r.id), patch);
  const Pill = ({ r, field, opts }) => mine
    ? <select className={"sel " + cls(r[field])} value={r[field]} onClick={(e) => e.stopPropagation()} onChange={(e) => upd(r, { [field]: e.target.value })}>{opts.map((o) => <option key={o}>{o}</option>)}</select>
    : <b className={"badge " + cls(r[field])}>{r[field]}</b>;
  const sub = summary ? year : mlong(tab);
  const searching = q.trim() !== "";
  const found = scope.filter((r) => matches(q, r.project, r.description, r.name, r.status, r.payStatus)).sort((a, b) => b.date.localeCompare(a.date));
  const exportCsv = () => downloadCsv(`payments-${year}${summary ? "" : "-" + tab.slice(5)}.csv`,
    [["Date", "Person", "Project", "Description", "Status", "Rate (INR)", "Payment"], ...(searching ? found : rows).map((r) => [dmy(r.date), r.name, r.project, r.description, r.status, r.rate, r.payStatus])]);

  return (
    <>
      <header className="top"><div><h1>Payments</h1><p className="muted">{mine ? "Your payment sheet" : `${ownerName}'s payment sheet`}</p></div>
        <div className="actions">
          <input type="search" className="searchinline" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search payments…" aria-label="Search payments" />
          <button className="btn ghost" onClick={exportCsv}>Export CSV</button>
          {mine && <button className="btn" onClick={() => setEdit("new")}>Add payment</button>}</div></header>
      {head && <div className="filters">{[...people.map((p) => ({ id: p.id, name: p.id === me.uid ? "My sheet" : p.name })), { id: "all", name: "Everyone" }].map((p) =>
        <button key={p.id} className={"pill" + (who === p.id ? " on" : "")} onClick={() => setWho(p.id)}>{p.name}</button>)}</div>}
      {!mine && <div className="banner"><strong>View only.</strong>&nbsp;{who === "all" ? "Combined payments of the whole team." : `Only ${ownerName} can change these entries.`}</div>}
      <div className="tabsrow"><div className="sheettabs">{[["summary", "Summary"], ...months.map((k) => [k, mshort(k)])].map(([k, l]) =>
        <button key={k} className={"stab" + ((summary ? "summary" : tab) === k ? " on" : "")} onClick={() => setTab(k)}>{l}</button>)}</div>
        <label className="yearsel">Year<select value={year} onChange={(e) => setYearSel(e.target.value)}>{years.map((y) => <option key={y}>{y}</option>)}</select></label></div>

      <Status loading={paysS.loading} error={paysS.error}>
      {searching && (
        <section className="panel" style={{ marginBottom: "1rem" }}>
          <h2>{found.length} result{found.length === 1 ? "" : "s"} in {year}</h2>
          <div className="scrollbox">
            <div className="prow headrow"><span>Date</span><span>Project</span><span>Description</span><span>Status</span><span>Rate (INR)</span><span>Payment</span></div>
            {found.map((r) => (
              <div key={r.id} className={"prow" + (r.uid === me.uid ? " click" : "")} onClick={() => r.uid === me.uid && setEdit(r)}>
                <span>{dmy(r.date)}</span><span><strong>{r.project}</strong>{who === "all" && <small className="muted"> {r.name}</small>}</span><span>{r.description}</span>
                <span><b className={"badge " + cls(r.status)}>{r.status}</b></span><span className="num">{inr(r.rate)}</span><span><b className={"badge " + cls(r.payStatus)}>{r.payStatus}</b></span>
              </div>))}
            {!found.length && <p className="empty">No payments match.</p>}
          </div>
        </section>)}
      {!searching && <>
      <div className="stats">{[[inr(t.billed), "Total billed"], [inr(t.paid), summary ? "Total earned (paid)" : "Paid"], [inr(t.pending), summary ? "Total pending" : "Pending"], [inr(t.unpaid), summary ? "Unpaid (delivered, not paid)" : "Unpaid (delivered)"], [t.delivered, summary ? "Total delivered count" : "Delivered count"]].map(([n, l], i) =>
        <div key={l} className="stat" style={{ animationDelay: `${i * 60}ms` }}><b>{n}</b><span>{l}</span><small>{sub}</small></div>)}</div>

      {summary ? (
        <>
          <section className="panel" style={{ marginBottom: "1rem" }}><h2>Month-wise summary ({year})</h2>
            <div className="tblwrap"><table className="tbl"><thead><tr><th>Month</th><th>Total billed</th><th>Paid</th><th>Pending</th><th>Unpaid (delivered)</th><th>Delivered</th></tr></thead>
              <tbody>{byMonth.map((r) => <tr key={r.k} className="mrow" onClick={() => setTab(r.k)}><td>{tabName(r.k)}</td><td>{inr(r.billed)}</td><td>{inr(r.paid)}</td><td>{inr(r.pending)}</td><td>{inr(r.unpaid)}</td><td>{r.delivered}</td></tr>)}
                <tr className="grand"><td>Grand total</td><td>{inr(t.billed)}</td><td>{inr(t.paid)}</td><td>{inr(t.pending)}</td><td>{inr(t.unpaid)}</td><td>{t.delivered}</td></tr></tbody></table></div></section>
          <section className="panel" style={{ marginBottom: "1rem" }}><h2>Month-wise: billed vs paid vs pending</h2>
            <div className="cols">{byMonth.map((r) => <div key={r.k} className="colgrp"><div className="colbars" title={`${mlong(r.k)}: billed ${inr(r.billed)}, paid ${inr(r.paid)}, pending ${inr(r.pending)}`}>
              {[["cb", r.billed], ["cp", r.paid], ["cr", r.pending]].map(([c, v]) => <i key={c} className={c} style={{ height: `${(v / maxB) * 100}%` }} />)}</div><span>{mshort(r.k)}</span></div>)}</div>
            <p className="muted small"><i className="dot o" />Billed &nbsp;<i className="dot g" />Paid &nbsp;<i className="dot r" />Pending</p></section>
          <div className="cards2">
            <Donut t={t} title="Grand total: paid vs pending" />
            <section className="panel"><h2>Month-wise delivered count</h2>
              <div className="bars">{byMonth.map((r) => <div key={r.k} className="bar"><span className="bl">{tabName(r.k)}</span><div className="bt"><i style={{ width: `${(r.delivered / maxD) * 100}%` }} /></div><b>{r.delivered}</b></div>)}</div></section>
          </div>
        </>
      ) : (
        <div className="paylayout">
          <section className="panel">
            <div className="scrollbox">
              <div className="prow headrow"><span>Date</span><span>Project</span><span>Description</span><span>Status</span><span>Rate (INR)</span><span>Payment</span></div>
              {rows.map((r) => (
                <div key={r.id} className={"prow" + (mine ? " click" : "")} onClick={() => mine && setEdit(r)}>
                  <span>{dmy(r.date)}</span>
                  <span><strong>{r.project}</strong>{who === "all" && <small className="muted"> {r.name}</small>}</span>
                  <span>{r.description}</span>
                  <span><Pill r={r} field="status" opts={STATUS} /></span>
                  <span className="num">{inr(r.rate)}</span>
                  <span><Pill r={r} field="payStatus" opts={PAY} /></span>
                </div>))}
              {!rows.length && <p className="empty">{mine ? "No payments this month. Tap Add payment to start." : "No payments this month."}</p>}
            </div>
          </section>
          <Donut t={t} title={`${mlong(tab)}: paid vs pending`} />
        </div>
      )}
      </>}
      </Status>
      {edit && <Entry row={edit === "new" ? null : edit} me={me} defDate={defDate} onClose={() => setEdit(null)} />}
    </>
  );
}
