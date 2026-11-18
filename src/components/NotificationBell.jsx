import { useEffect, useRef, useState } from "react";
import { collection, deleteDoc, doc, query, updateDoc, where, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { CLOSED } from "../utils/constants";
import { iso } from "../utils/helpers";
import { dueReminders, whenText } from "../utils/reminders";
import { useCol, useQueryRows } from "../utils/useCol";

const KEY = "overdueDismissed";
const loadGone = (today) => { try { const v = JSON.parse(localStorage.getItem(KEY) || "{}"); return v.date === today ? v.ids || [] : []; } catch { return []; } };

export function NotificationBell({ me, onGo }) {
  const { rows } = useQueryRows(() => query(collection(db, "notifications"), where("uid", "==", me.uid)), [me.uid]);
  const deals = useCol("deals");
  const reminders = useCol("reminders");
  const today = iso(new Date());
  const [open, setOpen] = useState(false);
  const [gone, setGone] = useState(() => loadGone(today)); // overdue deals dismissed today
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const out = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", out);
    return () => document.removeEventListener("mousedown", out);
  }, [open]);

  const overdue = deals.filter((d) => d.ownerUid === me.uid && d.followUp && d.followUp < today && !CLOSED.includes(d.stage) && !gone.includes(d.id));
  const due = dueReminders(reminders, today, me.uid).filter((x) => !gone.includes(x.key));
  const items = [...rows].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 20);
  const unread = items.filter((n) => !n.read);
  const count = unread.length + (overdue.length ? 1 : 0) + due.length;

  const go = (tab) => { setOpen(false); onGo(tab); };
  const read = (n) => { if (!n.read) updateDoc(doc(db, "notifications", n.id), { read: true }); go(n.tab || "home"); };
  const remove = (n) => deleteDoc(doc(db, "notifications", n.id));
  const dismiss = (keys) => {
    const ids = [...new Set([...gone, ...keys])];
    setGone(ids);
    try { localStorage.setItem(KEY, JSON.stringify({ date: today, ids })); } catch { /* ignore */ }
  };
  const markAll = () => { const b = writeBatch(db); unread.forEach((n) => b.update(doc(db, "notifications", n.id), { read: true })); b.commit(); };
  const clearAll = () => { const b = writeBatch(db); items.forEach((n) => b.delete(doc(db, "notifications", n.id))); b.commit(); dismiss([...overdue.map((d) => d.id), ...due.map((x) => x.key)]); };

  return (
    <div className="bell" ref={ref}>
      <button className="bellbtn" onClick={() => setOpen(!open)} aria-label={`Notifications${count ? `, ${count} new` : ""}`} aria-expanded={open}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
        {count > 0 && <span className="bellcount">{count > 9 ? "9+" : count}</span>}
      </button>
      {open && (
        <div className="bellpanel" role="menu">
          <div className="bellhead"><strong>Notifications</strong>
            <span>{unread.length > 0 && <button className="link small" onClick={markAll}>Mark all read</button>}
              {(items.length > 0 || overdue.length > 0 || due.length > 0) && <button className="link small" onClick={clearAll}>Clear all</button>}</span></div>
          {overdue.length > 0 && (
            <div className="bellrow"><button className="bellitem unread" onClick={() => go("pipe")}>{overdue.length} overdue follow-up{overdue.length > 1 ? "s" : ""} on your deals</button>
              <button className="bellx" onClick={() => dismiss(overdue.map((d) => d.id))} aria-label="Dismiss for today" title="Dismiss for today">×</button></div>)}
          {due.map((x) => (
            <div key={x.key} className="bellrow"><button className="bellitem unread" onClick={() => go("cal")}>{x.r.title}: {whenText(x.days)}</button>
              <button className="bellx" onClick={() => dismiss([x.key])} aria-label="Dismiss for today" title="Dismiss for today">×</button></div>))}
          {items.map((n) => (
            <div key={n.id} className="bellrow"><button className={"bellitem" + (n.read ? "" : " unread")} onClick={() => read(n)}>{n.text}</button>
              <button className="bellx" onClick={() => remove(n)} aria-label="Remove notification" title="Remove">×</button></div>))}
          {!items.length && !overdue.length && !due.length && <p className="muted small bellempty">You're all caught up.</p>}
        </div>
      )}
    </div>
  );
}
