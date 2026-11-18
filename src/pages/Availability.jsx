import { useState } from "react";
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { DatePicker } from "../components/DatePicker";
import { Modal } from "../components/Modal";
import { ReminderModal } from "../components/ReminderModal";
import { Status } from "../components/State";
import { activeOnly, iso, pretty, rolesOf } from "../utils/helpers";
import { REPEAT_OPTIONS, nextOccurrence, remindSummary } from "../utils/reminders";
import { useCollection } from "../utils/useCol";

export default function Availability({ me }) {
  const today = iso(new Date());
  const leavesS = useCollection("leaves");
  const leaves = leavesS.rows;
  const remS = useCollection("reminders"), usersS = useCollection("users");
  const [rem, setRem] = useState(null); // null | "new" | a reminder to edit
  const isHead = rolesOf(me).includes("head");
  const upcoming = remS.rows.map((r) => ({ r, next: nextOccurrence(r, today) })).filter((x) => x.next).sort((x, y) => x.next.localeCompare(y.next));
  const [f, setF] = useState({ from: today, to: today, reason: "" });
  const [open, setOpen] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const list = leaves.filter((l) => l.to >= today).sort((a, b) => a.from.localeCompare(b.from));
  async function save(e) {
    e.preventDefault();
    if (f.to < f.from) return alert("End date can't be before the start date.");
    await addDoc(collection(db, "leaves"), { uid: me.uid, name: me.name, ...f, createdAt: serverTimestamp() });
    setF({ from: today, to: today, reason: "" });
    setOpen(false);
  }
  return (
    <>
      <header className="top"><div><h1>Leave &amp; reminders</h1><p className="muted">Tell the team when you're not available, or add a reminder to the calendar.</p></div>
        <div className="actions"><button className="btn ghost" onClick={() => setRem("new")}>Add reminder</button>
          <button className="btn" onClick={() => setOpen(true)}>Mark unavailable</button></div></header>
      {open && <Modal title="Mark unavailable" onClose={() => setOpen(false)}><form onSubmit={save}>
        <div className="two">
          <div className="field req">From<DatePicker min={today} value={f.from} onChange={(v) => setF({ ...f, from: v, to: v > f.to ? v : f.to })} /></div>
          <div className="field req">To<DatePicker min={f.from} value={f.to} onChange={(v) => setF({ ...f, to: v })} /></div>
        </div>
        <label>Reason<input required value={f.reason} onChange={set("reason")} placeholder="Leave, client visit, travel…" /></label>
        <button className="btn">Save</button>
      </form></Modal>}
      {rem && <ReminderModal me={me} row={rem === "new" ? null : rem} everyone={activeOnly(usersS.rows).map((p) => p.id)} onClose={() => setRem(null)} />}
      <Status loading={leavesS.loading || remS.loading} error={leavesS.error || remS.error}>
      <h2 className="sectionh">Away</h2>
      <div className="feed">
        {list.map((l) => (
          <div key={l.id} className="panel row between">
            <div><strong>{l.name}</strong> <span className="muted">{l.from === l.to ? pretty(l.from) : `${pretty(l.from)} to ${pretty(l.to)}`}</span>
              {l.reason && <div>{l.reason}</div>}</div>
            {l.uid === me.uid && <button className="link" onClick={() => deleteDoc(doc(db, "leaves", l.id))}>Remove</button>}
          </div>
        ))}
        {!list.length && <p className="empty">Everyone is available.</p>}
      </div>
      <h2 className="sectionh">Reminders</h2>
      <div className="feed">
        {upcoming.map(({ r, next }) => (
          <div key={r.id} className="panel row between">
            <div><strong>{r.title}</strong> <span className="tag">{r.type}</span>{r.repeat && r.repeat !== "none" && <span className="tag">{REPEAT_OPTIONS.find(([v]) => v === r.repeat)?.[1]}</span>}
              <div className="muted">{pretty(next)}{r.notifyAll ? ", tells everyone" : ", only you"}</div>
              <div className="muted small">Reminds: {remindSummary(r)}</div>
              {r.description && <div>{r.description}</div>}</div>
            {(r.uid === me.uid || isHead) && <button className="link" onClick={() => setRem(r)}>Edit</button>}
          </div>))}
        {!upcoming.length && <p className="empty">No reminders yet. Add one for domain renewals, payments or anything you must not forget.</p>}
      </div>
      </Status>
    </>
  );
}
