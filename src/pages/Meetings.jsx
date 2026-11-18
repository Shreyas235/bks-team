import { useState } from "react";
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { DatePicker } from "../components/DatePicker";
import { Modal } from "../components/Modal";
import { Place } from "../components/Place";
import { Status } from "../components/State";
import { activeOnly, iso, pretty, rolesOf, time12 } from "../utils/helpers";
import { notify } from "../utils/notify";
import { useCollection } from "../utils/useCol";

export default function Meetings({ me }) {
  const today = iso(new Date());
  const meetS = useCollection("meetings"), usersS = useCollection("users");
  const meetings = meetS.rows, allPeople = usersS.rows, people = activeOnly(allPeople);
  const blank = { title: "", date: today, time: "10:00", place: "" };
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(blank);
  const [who, setWho] = useState(null);
  const chosen = who ?? people.map((p) => p.id);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (id) => setWho(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id]);
  const list = meetings.filter((m) => m.date >= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const name = (id) => allPeople.find((p) => p.id === id)?.name || "?";

  async function save(e) {
    e.preventDefault();
    if (!chosen.length) return alert("Pick at least one person to attend.");
    await addDoc(collection(db, "meetings"), { ...f, attendees: chosen, seenBy: [me.uid], createdBy: me.uid, createdByName: me.name, createdAt: serverTimestamp() });
    notify(chosen, `${me.name} called a meeting: ${f.title}`, "meet", me.uid);
    setF(blank); setWho(null); setOpen(false);
  }
  return (
    <>
      <header className="top"><div><h1>Meetings</h1><p className="muted">Upcoming meetings called by the heads.</p></div>
        {rolesOf(me).includes("head") && <button className="btn" onClick={() => setOpen(true)}>Call meeting</button>}</header>
      {open && (
        <Modal title="Call a meeting" onClose={() => setOpen(false)}><form onSubmit={save}>
          <label>Title<input value={f.title} onChange={set("title")} required /></label>
          <div className="two">
            <div className="field req">Date<DatePicker min={today} value={f.date} onChange={(v) => setF({ ...f, date: v })} /></div>
            <label>Time<input type="time" value={f.time} onChange={set("time")} required /></label>
          </div>
          <label>Place or meeting link<input required value={f.place} onChange={set("place")} placeholder="Office, or paste a Google Meet link" /></label>
          <fieldset><legend>Who should attend</legend>
            {people.map((p) => <label key={p.id} className="check"><input type="checkbox" checked={chosen.includes(p.id)} onChange={() => toggle(p.id)} />{p.name}</label>)}
          </fieldset>
          <button className="btn">Call meeting</button>
        </form></Modal>
      )}
      <Status loading={meetS.loading || usersS.loading} error={meetS.error || usersS.error}>
      <div className="feed">
        {list.map((m) => (
          <div key={m.id} className="panel">
            <div className="row between"><h2>{m.title}</h2>
              {rolesOf(me).includes("head") && <button className="link" onClick={() => confirm("Cancel this meeting?") && deleteDoc(doc(db, "meetings", m.id))}>Cancel</button>}</div>
            <p><strong>{pretty(m.date)} at {time12(m.time)}</strong>{m.place && <> · <Place p={m.place} /></>}</p>
            <p className="muted">Attending: {m.attendees.map(name).join(", ")}</p>
            {rolesOf(me).includes("head") && <p className="muted">Seen by {m.seenBy?.length || 0} of {m.attendees.length}</p>}
          </div>
        ))}
        {!list.length && <p className="empty">No upcoming meetings.</p>}
      </div>
      </Status>
    </>
  );
}
