import { Suspense, lazy, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";
import { LOGO } from "./utils/constants";
import { rolesOf } from "./utils/helpers";
import { useIdleLogout } from "./utils/useIdleLogout";
import { MeetingBanner } from "./components/MeetingBanner";
import { NotificationBell } from "./components/NotificationBell";
import { ReminderBanner } from "./components/ReminderBanner";
import { Spinner } from "./components/State";
import { UserMenu } from "./components/UserMenu";
import Login from "./pages/Login";

// Pages load on demand. All CSS is loaded up front from styles/index.css, so the cascade never depends on visit order.
const DailyUpdates = lazy(() => import("./pages/DailyUpdates"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Pipeline = lazy(() => import("./pages/Pipeline"));
const Clients = lazy(() => import("./pages/Clients"));
const Payments = lazy(() => import("./pages/Payments"));
const Availability = lazy(() => import("./pages/Availability"));
const Meetings = lazy(() => import("./pages/Meetings"));
const Calendar = lazy(() => import("./pages/Calendar"));
const WeeklySummary = lazy(() => import("./pages/WeeklySummary"));
const Team = lazy(() => import("./pages/Team"));

export default function App() {
  const [user, setUser] = useState(undefined);
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState("home");
  const [menu, setMenu] = useState(false);
  const [notice, setNotice] = useState(null);
  // Sign out and tell the Login screen why (it is still mounted, so it must be told, not just remember).
  const leave = (text) => { setNotice({ text, id: Date.now() }); signOut(auth); };

  useEffect(() => {
    let stopProfile = () => {};
    const stopAuth = onAuthStateChanged(auth, (u) => {
      stopProfile();
      setTab("home"); setMenu(false); // every login (and logout) starts on the Dashboard
      if (!u) { setUser(null); setMe(null); return; }
      // Live profile: roles update instantly, and a disabled person is signed out at once.
      stopProfile = onSnapshot(doc(db, "users", u.uid),
        (snap) => {
          const data = snap.data();
          if (!snap.exists()) return leave("This account isn't set up yet. Ask a head to add you.");
          if (data.active === false) return leave("This account has been disabled. Ask a head if this is a mistake.");
          setMe({ uid: u.uid, ...data }); setUser(u);
        },
        () => leave("Couldn't load your profile. Please sign in again."));
    });
    return () => { stopProfile(); stopAuth(); };
  }, []);

  useIdleLogout(!!user);

  if (user === undefined) return <Spinner />;
  if (!user || !me) return <Login notice={notice} />;
  const onName = (name) => setMe({ ...me, name });
  const go = (k) => { setTab(k); setMenu(false); };
  const isHead = rolesOf(me).includes("head");
  const tabs = [["home", "Dashboard"], ["updates", "Daily updates"], ["pipe", "Pipeline"], ["clients", "Clients"], ["pay", "Payments"], ["avail", "Leave & reminders"], ["meet", "Meetings"], ["cal", "Calendar"], ["summary", "Weekly summary"], ...(isHead ? [["team", "Team"]] : [])];
  const tools = <><NotificationBell me={me} onGo={go} /><UserMenu me={me} onName={onName} /></>;
  return (
    <div className="shell">
      <div className="mbar"><div className="brand"><div className="logochip"><img src={LOGO} alt="BK’s Solutions" /></div><div>BK’s<span>Team</span></div></div>
        <div className="mright">{tools}
          <button className="menubtn" onClick={() => setMenu(!menu)} aria-label="Menu" aria-expanded={menu}>{menu ? "✕" : "☰"}</button></div></div>
      <aside className={"side" + (menu ? " open" : "")}>
        <div className="brand"><div className="logochip"><img src={LOGO} alt="BK’s Solutions" /></div><div>BK’s<span>Team</span></div></div>
        <nav>{tabs.map(([k, l]) => <button key={k} className={tab === k ? "active" : ""} onClick={() => go(k)}>{l}</button>)}</nav>
      </aside>
      <main className="main">
        <div className="topbar"><span className="hello">Hello, {(me.name || "").split(" ")[0]}</span><div className="topright">{tools}</div></div>
        <MeetingBanner me={me} />
        <ReminderBanner me={me} onGo={go} />
        <div key={tab} className={"page" + (tab === "pipe" ? " wide" : "")}>
          <Suspense fallback={<Spinner />}>
            {tab === "home" && <Dashboard me={me} onGo={go} />}
            {tab === "updates" && <DailyUpdates me={me} />}
            {tab === "pipe" && <Pipeline me={me} />}
            {tab === "clients" && <Clients me={me} />}
            {tab === "pay" && <Payments me={me} />}
            {tab === "avail" && <Availability me={me} />}
            {tab === "meet" && <Meetings me={me} />}
            {tab === "cal" && <Calendar />}
            {tab === "summary" && <WeeklySummary />}
            {tab === "team" && isHead && <Team me={me} />}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
