import { useState } from "react";
import { addDoc, arrayUnion, collection, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Comments } from "../components/Comments";
import { DatePicker } from "../components/DatePicker";
import { Status } from "../components/State";
import { CLOSED, STAGES } from "../utils/constants";
import { activeOnly, initials, iso, pretty, rolesOf } from "../utils/helpers";
import { notify } from "../utils/notify";
import { matches } from "../utils/search";
import { useCollection } from "../utils/useCol";

const canPipe = (u) => rolesOf(u).some((r) => ["head", "sales"].includes(r));

const COLORS = ["#e0693a", "#e0693a", "#d9822b", "#c9a227", "#c9a227", "#8fa51f", "#6b9a2a", "#4f8a3a", "#9a8f8f"];
const SERVICES = ["Branding and Design", "Business Consulting", "Digital Marketing", "Custom Software Solution", "Custom Web and App Development", "Business Automation Training", "Other"];
const SOURCES = ["Referral", "Instagram", "Website", "Cold call", "LinkedIn", "Other"];
const PROJ = ["Deal closed", "Project started", "Project ended"];
const PAYMENTS = ["Not paid", "Advance received", "Fully paid"];
const money = (n) => (n ? "₹" + Number(n).toLocaleString("en-IN") : "No value");
const when = (t) => new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function DealForm({ deal, me, people, onClose }) {
  const canEdit = canPipe(me);
  const [f, setF] = useState({ clientName: "", phone: "", email: "", projectName: "", service: SERVICES[4], value: "", source: SOURCES[0], ownerUid: me.uid, stage: STAGES[0], followUp: "", notes: "", deadline: "", progress: 0, payment: "Not paid", ...deal });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save(e) {
    e.preventDefault();
    const data = { ...f, value: Number(f.value) || 0, progress: Number(f.progress) || 0, ownerName: people.find((p) => p.id === f.ownerUid)?.name || me.name };
    delete data.id; delete data.history;
    if (!deal) await addDoc(collection(db, "deals"), { ...data, createdBy: me.uid, createdAt: serverTimestamp(), history: [{ stage: f.stage, by: me.name, at: Date.now() }] });
    else await updateDoc(doc(db, "deals", deal.id), { ...data, ...(f.stage !== deal.stage && { history: arrayUnion({ stage: f.stage, by: me.name, at: Date.now() }) }) });
    if (!deal ? f.ownerUid !== me.uid : f.ownerUid !== deal.ownerUid) notify([f.ownerUid], `${deal ? "Deal assigned to you" : "New deal assigned to you"}: ${f.projectName}`, "pipe", me.uid);
    onClose();
  }
  const dis = !canEdit;
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={save}>
        <div className="row between"><h2>{deal ? deal.projectName || deal.clientName : "New deal"}</h2><button type="button" className="link" onClick={onClose}>Close</button></div>
        {dis && <p className="muted">Only the sales team and heads can change deals.</p>}
        <fieldset disabled={dis} className="bare">
          <div className="two"><label>Client name<input value={f.clientName} onChange={set("clientName")} required /></label>
            <label>Project name<input value={f.projectName} onChange={set("projectName")} required /></label></div>
          <div className="two"><label>Phone<input required value={f.phone} onChange={set("phone")} /></label>
            <label>Email<input type="email" required value={f.email} onChange={set("email")} /></label></div>
          <div className="two"><label>Service<select value={f.service} onChange={set("service")}>{SERVICES.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label>Deal value (₹)<input type="number" min="0" required value={f.value} onChange={set("value")} /></label></div>
          <div className="two"><label>Stage<select value={f.stage} onChange={set("stage")}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label>Source<select value={f.source} onChange={set("source")}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select></label></div>
          <div className="two"><label>Owner<select value={f.ownerUid} onChange={set("ownerUid")}>{people.filter(canPipe).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <div className="field req">Next follow-up<DatePicker required value={f.followUp} onChange={(v) => setF({ ...f, followUp: v })} /></div></div>
          {PROJ.includes(f.stage) && <>
            <div className="two"><div className="field req">Project deadline<DatePicker required value={f.deadline} onChange={(v) => setF({ ...f, deadline: v })} /></div>
              <label>Payment<select value={f.payment} onChange={set("payment")}>{PAYMENTS.map((s) => <option key={s}>{s}</option>)}</select></label></div>
            <label>Progress: {f.progress}%<input type="range" min="0" max="100" step="5" value={f.progress} onChange={set("progress")} /></label></>}
          <label>Notes<textarea rows={3} required value={f.notes} onChange={set("notes")} /></label>
        </fieldset>
        {deal?.history?.length > 0 && <div className="hist"><h3>History</h3>{[...deal.history].reverse().map((h, i) => <p key={i}><strong>{h.stage}</strong> <span className="muted">by {h.by}, {when(h.at)}</span></p>)}</div>}
        {deal && <Comments me={me} parentType="deal" parentId={deal.id} ownerUid={deal.ownerUid} label={`the deal ${deal.projectName}`} />}
        {canEdit && <div className="row between"><button className="btn">{deal ? "Save changes" : "Add deal"}</button>
          {deal && <button type="button" className="link" onClick={() => confirm("Delete this deal?") && deleteDoc(doc(db, "deals", deal.id)).then(onClose)}>Delete</button>}</div>}
      </form>
    </div>
  );
}

export default function Pipeline({ me }) {
  const today = iso(new Date());
  const dealsS = useCollection("deals"), usersS = useCollection("users");
  const deals = dealsS.rows;
  const people = activeOnly(usersS.rows);
  const [search, setSearch] = useState("");
  const [dragId, setDragId] = useState(null);
  const [over, setOver] = useState(null);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(null);
  const [stage, setStage] = useState(STAGES[0]);
  const shown = deals.filter((d) => (filter === "all" || d.ownerUid === filter) && matches(search, d.clientName, d.projectName, d.service, d.notes, d.ownerName));
  const overdue = deals.filter((d) => d.ownerUid === me.uid && d.followUp && d.followUp < today && !CLOSED.includes(d.stage));
  const canWork = canPipe(me);
  const move = (d, stage) => {
    if (d.ownerUid !== me.uid) notify([d.ownerUid], `${me.name} moved ${d.projectName} to ${stage}`, "pipe", me.uid);
    return updateDoc(doc(db, "deals", d.id), { stage, history: arrayUnion({ stage, by: me.name, at: Date.now() }) });
  };
  return (
    <>
      <header className="top"><div><h1>Pipeline</h1><p className="muted">{shown.length} deals · {money(shown.filter((d) => d.stage !== "Lost").reduce((s, d) => s + (d.value || 0), 0))} in play</p></div>
        {canWork && <button className="btn" onClick={() => setOpen("new")}>New deal</button>}</header>
      {overdue.length > 0 && <div className="banner"><strong>{overdue.length} follow-up{overdue.length > 1 ? "s" : ""} overdue on your deals: {overdue.map((d) => d.clientName).join(", ")}</strong></div>}
      <div className="searchbar"><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search deals by client, project or notes…" aria-label="Search deals" /></div>
      <div className="filters">
        {[{ id: "all", name: "Everyone" }, ...people].map((p) => <button key={p.id} className={"pill" + (filter === p.id ? " on" : "")} onClick={() => setFilter(p.id)}>{p.name}</button>)}
      </div>
      <Status loading={dealsS.loading || usersS.loading} error={dealsS.error || usersS.error}>
      <div className="stagetabs">{STAGES.map((st) => <button key={st} className={st === stage ? "on" : ""} onClick={() => setStage(st)}>{st}<b>{shown.filter((d) => d.stage === st).length}</b></button>)}</div>
      <div className="board">
        {STAGES.map((st, i) => {
          const list = shown.filter((d) => d.stage === st);
          return (
            <section key={st} className={"col" + (st === stage ? " active" : "") + (over === st ? " drop" : "")} style={{ borderTopColor: COLORS[i] }}
              onDragOver={(e) => { if (canWork && dragId) { e.preventDefault(); if (over !== st) setOver(st); } }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(null); }}
              onDrop={(e) => { e.preventDefault(); const d = deals.find((x) => x.id === dragId); setOver(null); setDragId(null); if (d && d.stage !== st) move(d, st); }}>
              {(() => { const sum = list.reduce((s, d) => s + (d.value || 0), 0); return <div className="colhead"><strong>{st}</strong><span className="count">{list.length}</span>{sum > 0 && <span className="colval">{money(sum)}</span>}</div>; })()}
              <div className="cards">
              {list.map((d) => (
                <article key={d.id} className={"deal" + (dragId === d.id ? " dragging" : "")} onClick={() => setOpen(d)} draggable={canWork}
                  onDragStart={(e) => { setDragId(d.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", d.id); }}
                  onDragEnd={() => { setDragId(null); setOver(null); }}>
                  <h4>{d.projectName}</h4>
                  <p className="muted">{d.clientName}</p>
                  <span className="tag">{d.service}</span>
                  <div className="row between meta"><strong>{money(d.value)}</strong>
                    <span className="avatar sm" title={d.ownerName}>{initials(d.ownerName)}</span></div>
                  {d.followUp && <p className={"fu" + (d.followUp < today && !CLOSED.includes(d.stage) ? " late" : "")}>Follow-up {pretty(d.followUp)}</p>}
                  {PROJ.includes(d.stage) && <><div className="prog"><i style={{ width: `${d.progress || 0}%` }} /></div>
                    <p className="fu">{d.progress || 0}% done, {d.payment || "Not paid"}{d.deadline ? `, due ${pretty(d.deadline)}` : ""}</p></>}
                  <select value={d.stage} disabled={!canWork} onClick={(e) => e.stopPropagation()} onChange={(e) => move(d, e.target.value)} aria-label="Move to stage">
                    {STAGES.map((s) => <option key={s}>{s}</option>)}</select>
                </article>
              ))}
              {!list.length && <p className="emptycol">No deals</p>}
              </div>
            </section>
          );
        })}
      </div>
      </Status>
      {open && <DealForm deal={open === "new" ? null : deals.find((d) => d.id === open.id) || open} me={me} people={people} onClose={() => setOpen(null)} />}
    </>
  );
}
