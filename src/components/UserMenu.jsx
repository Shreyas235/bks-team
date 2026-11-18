import { useEffect, useRef, useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, signOut, updatePassword, updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { Modal } from "./Modal";
import { ROLE } from "../utils/constants";
import { initials, rolesOf } from "../utils/helpers";


function Profile({ me, onName, onClose }) {
  const [name, setName] = useState(me.name || "");
  const [msg, setMsg] = useState("");
  async function save(e) {
    e.preventDefault();
    const n = name.trim(); if (!n) return;
    await updateDoc(doc(db, "users", me.uid), { name: n });
    await updateProfile(auth.currentUser, { displayName: n });
    onName(n); setMsg("Saved.");
  }
  return (
    <Modal title="Profile" onClose={onClose}>
      <form onSubmit={save}>
        <label>Name<input value={name} onChange={(e) => { setName(e.target.value); setMsg(""); }} required /></label>
        <label>Email<input value={me.email || auth.currentUser?.email || ""} disabled /></label>
        <div className="field">Role<div className="chips">{rolesOf(me).map((r) => <span key={r} className="tag">{ROLE[r]}</span>)}</div></div>
        <div className="row"><button className="btn">Save</button>{msg && <span className="ok">{msg}</span>}</div>
      </form>
    </Modal>
  );
}

function ChangePassword({ onClose }) {
  const [f, setF] = useState({ cur: "", next: "", again: "" });
  const [err, setErr] = useState(""); const [done, setDone] = useState(false);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErr(""); };
  async function save(e) {
    e.preventDefault();
    if (f.next.length < 6) return setErr("Use at least 6 characters for the new password.");
    if (f.next !== f.again) return setErr("The new passwords don't match.");
    try {
      const u = auth.currentUser;
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, f.cur));
      await updatePassword(u, f.next); setDone(true);
    } catch (e2) {
      setErr(["auth/invalid-credential", "auth/wrong-password"].includes(e2.code) ? "Your current password is wrong."
        : e2.code === "auth/too-many-requests" ? "Too many attempts. Please try again later." : e2.message);
    }
  }
  return (
    <Modal title="Change password" onClose={onClose}>
      {done ? <><p className="ok">Your password has been changed.</p><button className="btn" style={{ marginTop: "1rem" }} onClick={onClose}>Close</button></> : (
        <form onSubmit={save}>
          <label>Current password<input type="password" value={f.cur} onChange={set("cur")} required autoComplete="current-password" /></label>
          <label>New password<input type="password" value={f.next} onChange={set("next")} required autoComplete="new-password" /></label>
          <label>Confirm new password<input type="password" value={f.again} onChange={set("again")} required autoComplete="new-password" /></label>
          {err && <p className="error">{err}</p>}
          <button className="btn">Change password</button>
        </form>)}
    </Modal>
  );
}

export function UserMenu({ me, onName }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(null);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const out = (ev) => ref.current && !ref.current.contains(ev.target) && setOpen(false);
    const esc = (ev) => ev.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", out); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", out); document.removeEventListener("keydown", esc); };
  }, [open]);
  const pick = (v) => { setView(v); setOpen(false); };
  return (
    <div className="um" ref={ref}>
      <button className="umbtn" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open}>
        <span className="avatar">{initials(me.name)}</span><span className="umname">{me.name}</span><span className="caret">▾</span>
      </button>
      {open && (
        <div className="umpanel" role="menu">
          <div className="umhead"><strong>{me.name}</strong><small>{me.email || auth.currentUser?.email}</small><small>{rolesOf(me).map((r) => ROLE[r]).join(", ")}</small></div>
          <button role="menuitem" onClick={() => pick("profile")}>Profile</button>
          <button role="menuitem" onClick={() => pick("password")}>Change password</button>
          <button role="menuitem" className="danger" onClick={() => signOut(auth)}>Sign out</button>
        </div>
      )}
      {view === "profile" && <Profile me={me} onName={onName} onClose={() => setView(null)} />}
      {view === "password" && <ChangePassword onClose={() => setView(null)} />}
    </div>
  );
}
