import { useEffect, useRef, useState } from "react";
import { iso } from "../utils/helpers";

const longDate = (s) => new Date(s + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

export function DatePicker({ value, onChange, min, max, clearable, pop, required }) {
  const today = iso(new Date());
  const base = value || today;
  const [open, setOpen] = useState(false);
  const [m, setM] = useState(base.slice(0, 7));
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const out = (ev) => ref.current && !ref.current.contains(ev.target) && setOpen(false);
    const esc = (ev) => { if (ev.key === "Escape") { ev.stopPropagation(); setOpen(false); } };
    document.addEventListener("mousedown", out); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", out); document.removeEventListener("keydown", esc); };
  }, [open]);
  const [y, mo] = m.split("-").map(Number);
  const lead = new Date(y, mo - 1, 1).getDay();
  const n = new Date(y, mo, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => `${m}-${String(i + 1).padStart(2, "0")}`)];
  const go = (k) => setM(iso(new Date(y, mo - 1 + k, 1)).slice(0, 7));
  const ok = (d) => (!min || d >= min) && (!max || d <= max);
  const pick = (d) => { onChange(d); setOpen(false); };
  return (
    <div className={"dp" + (pop ? " pop" : "")} ref={ref}>
      <button type="button" className="dpbtn" aria-haspopup="dialog" aria-expanded={open} onClick={() => { setM(base.slice(0, 7)); setOpen(!open); }}>
        <span>{value ? longDate(value) : "Pick a date"}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>
      </button>
      {required && <input className="dpreq" required value={value || ""} onChange={() => {}} tabIndex={-1} aria-hidden="true" />}
      {open && (
        <div className="dppanel" role="dialog" aria-label="Choose a date">
          <div className="dphead">
            <button type="button" className="dpnav" onClick={() => go(-1)} aria-label="Previous month">‹</button>
            <strong>{new Date(y, mo - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</strong>
            <button type="button" className="dpnav" onClick={() => go(1)} aria-label="Next month">›</button>
          </div>
          <div className="dpgrid">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} className="dpdow">{d}</span>)}
            {cells.map((d, i) => d
              ? <button type="button" key={d} disabled={!ok(d)} className={"dpday" + (d === value ? " sel" : "") + (d === today ? " today" : "")} onClick={() => pick(d)}>{+d.slice(8)}</button>
              : <span key={"b" + i} />)}
          </div>
          <div className="dpfoot">
            <button type="button" className="link" disabled={!ok(today)} onClick={() => pick(today)}>Today</button>
            {clearable && value && <button type="button" className="link" onClick={() => { onChange(""); setOpen(false); }}>Clear</button>}
          </div>
        </div>
      )}
    </div>
  );
}
