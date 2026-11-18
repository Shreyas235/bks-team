import { useState } from "react";
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { iso, pretty } from "../utils/helpers";
import { notify } from "../utils/notify";
import { REMIND_OPTIONS, REPEAT_OPTIONS, TYPES, beforesOf } from "../utils/reminders";
import { DatePicker } from "./DatePicker";
import { Modal } from "./Modal";

const PREFILLS = Object.values(TYPES).map((t) => t.title);

// Add or edit a reminder. `everyone` = ids of the people to tell when notifyAll is on.
export function ReminderModal({ me, row, everyone, onClose }) {
  const [f, setF] = useState({ type: "Reminder", title: "", description: "", date: iso(new Date()), repeat: "none", befores: [0], notifyAll: false, ...row, ...(row ? { befores: beforesOf(row) } : {}) });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const toggle = (v) => { setErr(""); setF({ ...f, befores: f.befores.includes(v) ? f.befores.filter((x) => x !== v) : [...f.befores, v] }); };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const pickType = (type) => {
    const p = TYPES[type];
    setF({ ...f, type, ...(row ? {} : { repeat: p.repeat, befores: p.befores, notifyAll: p.notifyAll }), title: !f.title || PREFILLS.includes(f.title) ? p.title : f.title });
  };
  async function save(e) {
    e.preventDefault();
    if (!f.befores.length) return setErr("Pick at least one time to be reminded.");
    setBusy(true);
    const befores = [...f.befores].sort((a, b) => b - a);
    const data = { type: f.type, title: f.title.trim(), description: f.description.trim(), date: f.date, repeat: f.repeat, befores, before: Math.max(...befores), notifyAll: !!f.notifyAll };
    if (row) await updateDoc(doc(db, "reminders", row.id), data);
    else {
      await addDoc(collection(db, "reminders"), { ...data, uid: me.uid, name: me.name, createdAt: serverTimestamp() });
      if (data.notifyAll) notify(everyone, `${me.name} added a reminder: ${data.title} (${pretty(data.date)})`, "cal", me.uid);
    }
    onClose();
  }
  return (
    <Modal title={row ? "Edit reminder" : "Add reminder"} onClose={onClose}>
      <form onSubmit={save}>
        <label>Type<select value={f.type} onChange={(e) => pickType(e.target.value)}>{Object.keys(TYPES).map((t) => <option key={t}>{t}</option>)}</select></label>
        <label>Title<input required value={f.title} onChange={set("title")} placeholder="e.g. Renew domain: bks.com" /></label>
        <div className="two">
          <div className="field req">Date<DatePicker required value={f.date} onChange={(v) => v && setF({ ...f, date: v })} /></div>
          <label>Repeat<select value={f.repeat} onChange={set("repeat")}>{REPEAT_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        </div>
        <label>Description (optional)<textarea rows={3} value={f.description} onChange={set("description")} placeholder="Registrar, cost, login owner, anything useful…" /></label>
        <div className="field req">Remind me (pick one or more)
          <div className="chips">{REMIND_OPTIONS.map(([v, l]) => <button type="button" key={v} className={"pill" + (f.befores.includes(v) ? " on" : "")} onClick={() => toggle(v)}>{l}</button>)}</div></div>
        <label>Notify<select value={f.notifyAll ? "all" : "me"} onChange={(e) => setF({ ...f, notifyAll: e.target.value === "all" })}><option value="me">Only me</option><option value="all">Everyone</option></select></label>
        <p className="muted small">It shows on the Calendar for the whole team and appears in the bell when it is due.</p>
        {err && <p className="error">{err}</p>}
        <div className="row between"><button className="btn" disabled={busy}>{row ? "Save changes" : "Add reminder"}</button>
          {row && <button type="button" className="link" onClick={() => confirm("Delete this reminder?") && deleteDoc(doc(db, "reminders", row.id)).then(onClose)}>Delete</button>}</div>
      </form>
    </Modal>
  );
}
