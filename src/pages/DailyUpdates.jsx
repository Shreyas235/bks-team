import { useState } from "react";
import { collection, doc, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db } from "../firebase";
import { DatePicker } from "../components/DatePicker";
import { Comments } from "../components/Comments";
import { Modal } from "../components/Modal";
import { Status } from "../components/State";
import { ROLE } from "../utils/constants";
import { activeOnly, addDays, initials, iso, onLeaveOn, prettyLong, rolesOf } from "../utils/helpers";
import { matches } from "../utils/search";
import { useCollection, useQueryRows } from "../utils/useCol";

const FIELDS = ["Sales", "Service", "Digital Marketing", "Branding and Design", "Business Consulting", "Custom Software Solution", "Custom Web and App Development", "Business Automation Training", "Admin / Internal", "Other"];
const blankTask = () => ({ fields: [], client: "", what: "", hours: "", status: "Done" });

function UpdateForm({ me, date, existing, onDone }) {
  const [tasks, setTasks] = useState(() => existing?.tasks?.length ? existing.tasks : existing?.done ? [{ ...blankTask(), what: existing.done }] : [blankTask()]);
  const [tomorrow, setTomorrow] = useState(existing?.tomorrow || "");
  const [blockers, setBlockers] = useState(existing?.blockers || "");
  const [err, setErr] = useState("");
  const upd = (i, patch) => setTasks(tasks.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const toggle = (i, f) => { const cur = tasks[i].fields; upd(i, { fields: cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f] }); };

  async function save(e) {
    e.preventDefault();
    const bad = tasks.findIndex((t) => !t.fields.length);
    if (bad >= 0) return setErr(`Task ${bad + 1}: pick at least one field.`);
    await setDoc(doc(db, "updates", `${me.uid}_${date}`), {
      uid: me.uid, name: me.name, date, tomorrow, blockers, updatedAt: serverTimestamp(),
      tasks: tasks.map((t) => ({ ...t, client: t.client.trim(), what: t.what.trim(), hours: t.hours === "" ? "" : Number(t.hours) })),
    });
    onDone();
  }
  return (
    <form onSubmit={save}>
      {tasks.map((t, i) => (
        <fieldset key={i} className="task">
          <div className="row between"><strong>Task {i + 1}</strong>
            {tasks.length > 1 && <button type="button" className="link" onClick={() => setTasks(tasks.filter((_, j) => j !== i))}>Remove</button>}</div>
          <div className="field req">Field (pick one or more)
            <div className="chips">{FIELDS.map((f) => <button type="button" key={f} className={"pill" + (t.fields.includes(f) ? " on" : "")} onClick={() => toggle(i, f)}>{f}</button>)}</div></div>
          <label>Client or project name<input required value={t.client} onChange={(e) => upd(i, { client: e.target.value })} placeholder="e.g. Sharma Traders website" /></label>
          <label>What did you do?<textarea rows={2} required value={t.what} onChange={(e) => upd(i, { what: e.target.value })} placeholder="e.g. Edited the promo video, finished the client meeting" /></label>
          <div className="two">
            <label>Time spent (hours)<input type="number" required min="0.1" step="any" value={t.hours} onChange={(e) => upd(i, { hours: e.target.value })} /></label>
            <label>Status<select value={t.status} onChange={(e) => upd(i, { status: e.target.value })}><option>Done</option><option>In progress</option><option>Pending</option></select></label>
          </div>
        </fieldset>
      ))}
      <button type="button" className="btn ghost addtask" onClick={() => setTasks([...tasks, blankTask()])}>+ Add another task</button>
      <label>Plan for tomorrow<textarea rows={2} value={tomorrow} onChange={(e) => setTomorrow(e.target.value)} /></label>
      <label>Blockers<textarea rows={2} value={blockers} onChange={(e) => setBlockers(e.target.value)} placeholder="Anything stopping you or needing help." /></label>
      {err && <p className="error">{err}</p>}
      <button className="btn">{existing ? "Save changes" : "Post update"}</button>
    </form>
  );
}

function Lines({ text }) {
  return <>{text.split("\n").filter(Boolean).map((l, i) => <p key={i}>{l}</p>)}</>;
}

function UpdateCard({ u, author, me, showDate }) {
  return (
    <article className="panel update">
      <div className="who">
        <span className="avatar">{initials(u.name)}</span>
        <div><strong>{u.name}</strong>{rolesOf(author).filter((r) => r !== "member").map((r) => <span key={r} className="tag">{ROLE[r]}</span>)}
          {showDate && <div className="muted small">{prettyLong(u.date)}</div>}</div>
      </div>
      {u.tasks?.length ? u.tasks.map((t, i) => (
        <div key={i} className="task-item">
          <div className="chips">{t.fields.map((f) => <span key={f} className="tag">{f}</span>)}{t.client && <strong>{t.client}</strong>}</div>
          <p>{t.what}</p>
          <p className="muted small">{t.hours ? `${t.hours} h, ` : ""}{t.status}</p>
        </div>
      )) : <><h3>Done</h3><Lines text={u.done || ""} /></>}
      {u.tomorrow && <><h3>Tomorrow</h3><Lines text={u.tomorrow} /></>}
      {u.blockers && <div className="blocker"><h3>Blockers</h3><Lines text={u.blockers} /></div>}
      <Comments me={me} parentType="update" parentId={`${u.uid}_${u.date}`} ownerUid={u.uid} label={`${u.name}'s update`} />
    </article>
  );
}

export default function DailyUpdates({ me }) {
  const today = iso(new Date());
  const [date, setDate] = useState(today);
  const [showForm, setShowForm] = useState(false);
  const [q, setQ] = useState("");
  const [person, setPerson] = useState("all");
  const [range, setRange] = useState("30");
  const searching = q.trim() !== "" || person !== "all";

  const usersS = useCollection("users"), leavesS = useCollection("leaves");
  const dayS = useQueryRows(() => query(collection(db, "updates"), where("date", "==", date)), [date]);
  const rangeS = useQueryRows(() => query(collection(db, "updates"), where("date", ">=", addDays(today, -Number(range)))), [range, today], searching);
  const states = searching ? [usersS, rangeS] : [usersS, leavesS, dayS];

  const allUsers = usersS.rows;
  const people = activeOnly(allUsers);
  const updates = dayS.rows;
  const byUid = Object.fromEntries(updates.map((u) => [u.uid, u]));
  const away = onLeaveOn(leavesS.rows, date);
  const awayIds = away.map((l) => l.uid);
  const pending = people.filter((p) => !byUid[p.id] && !awayIds.includes(p.id));
  const posted = people.length - people.filter((p) => !byUid[p.id]).length;
  const results = rangeS.rows
    .filter((u) => (person === "all" || u.uid === person) && matches(q, u.name, u.tomorrow, u.blockers, u.done, (u.tasks || []).flatMap((t) => [t.client, t.what, ...(t.fields || [])])))
    .sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));

  return (
    <>
      <header className="top">
        <div>
          <h1>Team updates</h1>
          <p className="muted">{searching ? `Searching the last ${range} days` : prettyLong(date)}</p>
        </div>
        <div className="actions">{date === today && <button className="btn" onClick={() => setShowForm(true)}>{byUid[me.uid] ? "Edit update" : "Post update"}</button>}
        {!searching && <div className="datenav">
          <button className="btn ghost" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">‹</button>
          <DatePicker pop max={today} value={date} onChange={(v) => v && setDate(v)} />
          <button className="btn ghost" disabled={date >= today} onClick={() => setDate(addDays(date, 1))} aria-label="Next day">›</button>
        </div>}</div>
      </header>

      <div className="searchbar">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search updates by client, task or person…" aria-label="Search updates" />
        <select value={person} onChange={(e) => setPerson(e.target.value)} aria-label="Filter by person"><option value="all">Everyone</option>{allUsers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        {searching && <select value={range} onChange={(e) => setRange(e.target.value)} aria-label="Date range"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select>}
        {searching && <button className="btn ghost" onClick={() => { setQ(""); setPerson("all"); }}>Clear</button>}
      </div>

      {date === today && showForm && <Modal title={`Your update for ${prettyLong(date)}`} onClose={() => setShowForm(false)}><UpdateForm me={me} date={date} existing={byUid[me.uid]} onDone={() => setShowForm(false)} /></Modal>}

      <Status loading={states.some((x) => x.loading)} error={states.find((x) => x.error)?.error}>
        {searching ? (
          <>
            <p className="muted small">{results.length} update{results.length === 1 ? "" : "s"} found</p>
            <div className="feed">{results.map((u) => <UpdateCard key={u.uid + u.date} u={u} author={allUsers.find((p) => p.id === u.uid)} me={me} showDate />)}
              {!results.length && <p className="empty">Nothing matches. Try fewer words or a longer date range.</p>}</div>
          </>
        ) : (
          <>
            <section className="strip">
              <strong>{posted} of {people.length} posted</strong>
              <span className="muted">{pending.length ? `Waiting on ${pending.map((p) => p.name).join(", ")}` : "Everyone has posted."}</span>
              {away.length > 0 && <span className="muted">Unavailable: {[...new Set(away.map((l) => l.name))].join(", ")}</span>}
            </section>
            {date !== today && !byUid[me.uid] && <p className="muted">You didn't post an update on this day.</p>}
            <div className="feed">
              {updates.map((u) => <UpdateCard key={u.uid} u={u} author={allUsers.find((p) => p.id === u.uid)} me={me} />)}
              {!updates.length && <p className="empty">No updates for this day yet.</p>}
            </div>
          </>
        )}
      </Status>
    </>
  );
}
