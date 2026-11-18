import { useState } from "react";
import { Place } from "../components/Place";
import { Status } from "../components/State";
import { iso, onLeaveOn, pretty, time12 } from "../utils/helpers";
import { occursOn } from "../utils/reminders";
import { useCollection } from "../utils/useCol";

export default function Calendar() {
  const meetS = useCollection("meetings"), leaveS = useCollection("leaves");
  const remS = useCollection("reminders");
  const meetings = meetS.rows, leaves = leaveS.rows, reminders = remS.rows;
  const today = iso(new Date());
  const [m, setM] = useState(today.slice(0, 7));
  const [sel, setSel] = useState(today);
  const [y, mo] = m.split("-").map(Number);
  const lead = new Date(y, mo - 1, 1).getDay();
  const n = new Date(y, mo, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => `${m}-${String(i + 1).padStart(2, "0")}`)];
  const go = (k) => setM(iso(new Date(y, mo - 1 + k, 1)).slice(0, 7));
  const info = (d) => ({ ms: meetings.filter((x) => x.date === d).sort((a, b) => a.time.localeCompare(b.time)), ls: onLeaveOn(leaves, d), rs: reminders.filter((r) => occursOn(r, d)) });
  const s = info(sel);
  return (
    <>
      <header className="top"><div><h1>Calendar</h1><p className="muted">Meetings, leave and reminders in one place.</p></div>
        <div className="datenav"><button className="btn ghost" onClick={() => go(-1)} aria-label="Previous month">‹</button>
          <strong className="monthname">{new Date(y, mo - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</strong>
          <button className="btn ghost" onClick={() => go(1)} aria-label="Next month">›</button></div></header>
      <Status loading={meetS.loading || leaveS.loading || remS.loading} error={meetS.error || leaveS.error || remS.error}>
      <div className="calwrap">
        <div className="cal">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="dow">{d}</div>)}
          {cells.map((d, i) => { if (!d) return <div key={i} className="day blank" />; const { ms, ls, rs } = info(d);
            return (
              <button key={d} className={"day" + (d === today ? " today" : "") + (d === sel ? " sel" : "")} onClick={() => setSel(d)}>
                <span className="num">{+d.slice(8)}</span>
                {rs.slice(0, 2).map((x) => <span key={x.id} className="chip rm">{x.title}</span>)}
                {ms.slice(0, 2).map((x) => <span key={x.id} className="chip mt">{time12(x.time)} {x.title}</span>)}
                {ms.length > 2 && <span className="more">+{ms.length - 2} more</span>}
                {ls.length > 0 && <span className="chip lv">{ls.length} away</span>}
              </button>); })}
        </div>
        <aside className="panel dayinfo" key={sel}>
          <h2>{pretty(sel)}</h2>
          {s.rs.map((x) => <p key={x.id}><span className="tag">{x.type}</span> <strong>{x.title}</strong>{x.description && <span className="muted"> · {x.description}</span>}</p>)}
          {s.ms.map((x) => <p key={x.id}><span className="tag">{time12(x.time)}</span> {x.title}{x.place && <span className="muted"> · <Place p={x.place} /></span>}</p>)}
          {s.ls.map((l) => <p key={l.id} className="muted">{l.name} is away{l.reason && ` (${l.reason})`}</p>)}
          {!s.ms.length && !s.ls.length && !s.rs.length && <p className="muted">Nothing scheduled.</p>}
        </aside>
      </div>
      </Status>
    </>
  );
}
