import { useEffect, useState } from "react";
import { collection, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { activeOnly, iso, isReminderTime, onLeaveOn, rolesOf } from "../utils/helpers";
import { useQueryRows } from "../utils/useCol";

const KEY = "reminderDismissed";
const dismissedToday = (today) => { try { return localStorage.getItem(KEY) === today; } catch { return false; } };

// From 6 pm: tells you to post today's update. Heads also see who is still missing.
export function ReminderBanner({ me, onGo }) {
  const [now, setNow] = useState(new Date());
  const [hidden, setHidden] = useState(false);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  const today = iso(now);
  const due = isReminderTime(now) && !hidden && !dismissedToday(today);
  const ups = useQueryRows(() => query(collection(db, "updates"), where("date", "==", today)), [today], due).rows;
  const users = useQueryRows(() => collection(db, "users"), [], due).rows;
  const leaves = useQueryRows(() => collection(db, "leaves"), [], due).rows;
  if (!due) return null;

  const away = onLeaveOn(leaves, today).map((l) => l.uid);
  const missing = activeOnly(users).filter((p) => !ups.some((u) => u.uid === p.id) && !away.includes(p.id));
  const iMissing = missing.some((p) => p.id === me.uid);
  const others = rolesOf(me).includes("head") ? missing.filter((p) => p.id !== me.uid) : [];
  if (!iMissing && !others.length) return null;
  const dismiss = () => { try { localStorage.setItem(KEY, today); } catch { /* ignore */ } setHidden(true); };

  return (
    <div className="banner" role="status">
      <div>
        {iMissing && <strong>It's past 6 pm and you haven't posted today's update.</strong>}
        {others.length > 0 && <div>{iMissing ? "" : <strong>Still waiting on today's update from: </strong>}{iMissing ? "Also waiting on: " : ""}{others.map((p) => p.name).join(", ")}</div>}
      </div>
      <div className="row">{iMissing && <button className="btn" onClick={() => onGo("updates")}>Post now</button>}<button className="btn ghost" onClick={dismiss}>Dismiss</button></div>
    </div>
  );
}
