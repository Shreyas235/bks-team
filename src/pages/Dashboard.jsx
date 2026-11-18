import { useState } from "react";
import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Bars } from "../components/Bars";
import { Modal } from "../components/Modal";
import { MonthChart, Trend } from "../components/MonthChart";
import { Status } from "../components/State";
import { STAGES } from "../utils/constants";
import { activeOnly, addDays, iso, monthShort, onLeaveOn, pretty, rolesOf, time12 } from "../utils/helpers";
import { OPEN, hoursBy, hoursByWeek, lastMonths, money, monthOf, r1, revenueByMonth, targetProgress, useRangeState, weekOf, weekStarts, wonAt, wonByMonth } from "../utils/reports";
import { useCollection, useDoc, useQueryRows } from "../utils/useCol";

const sum = (list, f) => list.reduce((s, x) => s + (f(x) || 0), 0);
const taskHours = (u) => sum(u.tasks || [], (t) => Number(t.hours));
const failed = (list) => list.find((s) => s.error)?.error;
const waiting = (list) => list.some((s) => s.loading);

function Stats({ stats }) {
  return <div className="stats">{stats.map((s, i) => <div key={i} className="stat" style={{ animationDelay: `${i * 60}ms` }}><b>{s.n}</b><span>{s.l}</span><small>{s.s}</small></div>)}</div>;
}

function TargetCard({ monthly, won, canEdit }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(monthly || "");
  const pct = targetProgress(won, monthly);
  const save = async (e) => { e.preventDefault(); await setDoc(doc(db, "settings", "targets"), { monthly: Number(val) || 0 }, { merge: true }); setOpen(false); };
  return (
    <section className="panel" style={{ marginBottom: "1rem" }}>
      <div className="row between"><h2>Monthly sales target</h2>{canEdit && <button className="btn ghost" onClick={() => setOpen(true)}>{monthly ? "Change target" : "Set target"}</button>}</div>
      {monthly ? <><div className="targetbar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
        <p><strong>{money(won)}</strong> won of {money(monthly)} <span className="muted">({pct}%)</span></p></> : <p className="muted">No target set yet.{canEdit ? " Tap Set target to add one." : ""}</p>}
      {open && <Modal title="Monthly sales target" onClose={() => setOpen(false)}><form onSubmit={save}>
        <label>Target for each month (₹)<input type="number" min="0" required value={val} onChange={(e) => setVal(e.target.value)} /></label>
        <button className="btn">Save target</button></form></Modal>}
    </section>
  );
}

function HeadDashboard() {
  const today = iso(new Date());
  const [ws, we] = weekOf(today);
  const starts = weekStarts(6, today);
  const months = lastMonths(6, today);
  const deals = useCollection("deals"), users = useCollection("users"), leaves = useCollection("leaves"), meetings = useCollection("meetings");
  const ups = useRangeState(starts[0], we);
  const pays = useQueryRows(() => collection(db, "payments"), []);
  const target = useDoc("settings", "targets");
  const all = [deals, users, leaves, meetings, ups]; // payments + target are optional: a failure there must not blank the page
  const missing = [["payments", pays], ["the sales target", target]].filter(([, s]) => s.error).map(([n]) => n);

  const people = activeOnly(users.rows);
  const weekUps = ups.rows.filter((u) => u.date >= ws && u.date <= we);
  const open = deals.rows.filter((d) => OPEN.includes(d.stage));
  const won = deals.rows.filter((d) => { const t = wonAt(d); return t && monthOf(t) === today.slice(0, 7); });
  const wonValue = sum(won, (d) => d.value);
  const late = open.filter((d) => d.followUp && d.followUp < today).length;
  const dueToday = open.filter((d) => d.followUp === today).length;
  const away = [...new Set(onLeaveOn(leaves.rows, today).map((l) => l.name))];
  const next = meetings.rows.filter((m) => m.date >= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
  const h = hoursBy(weekUps);
  const stats = [
    { n: won.length, l: "Deals won this month", s: money(wonValue) },
    { n: money(sum(open, (d) => d.value)), l: "Open pipeline", s: `${open.length} deals in progress` },
    { n: late, l: "Overdue follow-ups", s: `${dueToday} due today` },
    { n: `${weekUps.filter((u) => u.date === today).length} of ${people.length}`, l: "Updates posted today", s: away.length ? `Away: ${away.join(", ")}` : "Everyone available" },
    { n: next ? pretty(next.date) : "None", l: "Next meeting", s: next ? `${next.title} at ${time12(next.time)}` : "No meetings scheduled" },
  ];
  const revenue = revenueByMonth(pays.rows, months).map((r) => ({ label: monthShort(r.k), paid: r.paid, pending: r.pending }));
  const wins = wonByMonth(deals.rows, months).map((r) => ({ label: monthShort(r.k), count: r.count }));
  const trend = hoursByWeek(ups.rows.filter((u) => people.some((p) => p.id === u.uid)), starts);
  const weekLabels = starts.map((s) => new Date(s + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }));

  return (
    <Status loading={waiting(all)} error={failed(all)}>
      {missing.length > 0 && <div className="banner" role="alert"><div><strong>Some numbers are missing.</strong><div className="muted small">Couldn't load {missing.join(" and ")}. Publish the latest firestore.rules in Firebase, then retry.</div></div><button className="btn ghost" onClick={() => window.location.reload()}>Retry</button></div>}
      <Stats stats={stats} />
      <TargetCard monthly={target.data?.monthly || 0} won={wonValue} canEdit />
      <div className="cards2">
        <section className="panel"><h2>Deals by stage</h2><Bars rows={STAGES.map((s) => ({ label: s, value: deals.rows.filter((d) => d.stage === s).length })).filter((r) => r.value)} empty="No deals yet." /></section>
        <section className="panel"><h2>Hours this week by person</h2><Bars unit=" h" rows={h.person} empty="No hours logged this week." /></section>
        <section className="panel"><h2>Hours this week by service</h2><Bars unit=" h" rows={h.service} empty="No hours logged this week." /></section>
        <section className="panel"><h2>Revenue vs pending (6 months)</h2><MonthChart rows={revenue} format={money} series={[{ key: "paid", cls: "cp", dot: "g", name: "Paid" }, { key: "pending", cls: "cr", dot: "r", name: "Pending" }]} /></section>
        <section className="panel"><h2>Deals won per month</h2><MonthChart rows={wins} series={[{ key: "count", cls: "cb", dot: "o", name: "Deals won" }]} /></section>
      </div>
      <section className="panel" style={{ marginTop: "1rem" }}><h2>Hours per person, last 6 weeks</h2><Trend rows={trend} labels={weekLabels} /></section>
    </Status>
  );
}

function MemberDashboard({ me, onGo }) {
  const today = iso(new Date());
  const [ws, we] = weekOf(today);
  const deals = useCollection("deals"), meetings = useCollection("meetings");
  const ups = useRangeState(ws, we);
  const all = [deals, meetings, ups];

  const mine = ups.rows.filter((u) => u.uid === me.uid);
  const posted = mine.some((u) => u.date === today);
  const hours = r1(sum(mine, taskHours));
  const tasks = sum(mine, (u) => (u.tasks || []).length);
  const follow = deals.rows.filter((d) => d.ownerUid === me.uid && OPEN.includes(d.stage) && d.followUp && d.followUp <= addDays(today, 7)).sort((a, b) => a.followUp.localeCompare(b.followUp));
  const late = follow.filter((d) => d.followUp < today).length;
  const next = meetings.rows.filter((m) => m.date >= today && m.attendees?.includes(me.uid)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
  const recent = mine.flatMap((u) => (u.tasks || []).map((t) => ({ ...t, date: u.date }))).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const stats = [
    { n: posted ? "Posted" : "Not yet", l: "Today's update", s: posted ? "Nice work" : "Tap Daily updates to post it" },
    { n: `${hours} h`, l: "My hours this week", s: `${tasks} tasks logged` },
    { n: follow.length, l: "My follow-ups (next 7 days)", s: `${late} overdue` },
    { n: next ? pretty(next.date) : "None", l: "My next meeting", s: next ? `${next.title} at ${time12(next.time)}` : "Nothing scheduled" },
  ];
  return (
    <Status loading={waiting(all)} error={failed(all)}>
      <Stats stats={stats} />
      <div className="cards2">
        <section className="panel"><h2>My follow-ups</h2>
          {follow.length ? follow.slice(0, 8).map((d) => (
            <p key={d.id}><button className="link" onClick={() => onGo("pipe")}><strong>{d.clientName}</strong></button> <span className="muted">{d.projectName}</span><br />
              <span className={d.followUp < today ? "late" : "muted"}>{d.followUp < today ? "Overdue since " : "Due "}{pretty(d.followUp)}</span></p>))
            : <p className="muted">No follow-ups due in the next 7 days.</p>}</section>
        <section className="panel"><h2>My hours by service</h2><Bars unit=" h" rows={hoursBy(mine).service} empty="No hours logged this week." /></section>
        <section className="panel"><h2>My recent tasks</h2>
          {recent.length ? recent.map((t, i) => <p key={i}><strong>{t.client}</strong> <span className="muted">{pretty(t.date)}, {t.hours} h</span><br />{t.what}</p>) : <p className="muted">No tasks logged this week.</p>}</section>
      </div>
    </Status>
  );
}

export default function Dashboard({ me, onGo }) {
  const head = rolesOf(me).includes("head");
  return (
    <>
      <header className="top"><div><h1>Dashboard</h1><p className="muted">{head ? "Team overview" : "Your week"}, {pretty(iso(new Date()))}</p></div></header>
      {head ? <HeadDashboard /> : <MemberDashboard me={me} onGo={onGo} />}
    </>
  );
}
