import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Modal } from "../components/Modal";
import { Status } from "../components/State";
import { createAccount, sendInvite } from "../utils/createAccount";
import { rolesOf } from "../utils/helpers";
import { useCollection } from "../utils/useCol";

const ROLES = [["head", "Head"], ["sales", "Sales"]];
const blank = { name: "", email: "", roles: [] };

function AddMember({ onClose }) {
  const [f, setF] = useState(blank);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErr(""); };
  const toggle = (r) => setF({ ...f, roles: f.roles.includes(r) ? f.roles.filter((x) => x !== r) : [...f.roles, r] });

  async function save(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const { emailSent } = await createAccount({ name: f.name.trim(), email: f.email.trim(), roles: f.roles });
      setDone({ name: f.name.trim(), email: f.email.trim(), emailSent });
    } catch (e2) {
      setErr(e2.code === "auth/email-already-in-use" ? "This email already has an account."
        : e2.code === "auth/invalid-email" ? "Enter a valid email address."
        : e2.code === "permission-denied" ? "Only heads can add people." : e2.message);
    }
    setBusy(false);
  }
  return (
    <Modal title="Add team member" onClose={onClose}>
      {done ? (
        <>
          {done.emailSent
            ? <p className="ok">We emailed {done.email} a link to set their own password.</p>
            : <p className="error">{done.name}'s account was created, but the email could not be sent. Use "Resend invite" on the Team page.</p>}
          <p className="muted small" style={{ marginTop: ".5rem" }}>They open the email, choose a password, then sign in. Nobody needs to share a password. Ask them to check spam if it doesn't arrive.</p>
          <div className="row" style={{ marginTop: "1rem" }}><button className="btn" onClick={() => { setF(blank); setDone(null); }}>Add another</button><button className="btn ghost" onClick={onClose}>Close</button></div>
        </>
      ) : (
        <form onSubmit={save}>
          <label>Full name<input value={f.name} onChange={set("name")} required /></label>
          <label>Email<input type="email" value={f.email} onChange={set("email")} required /></label>
          <fieldset><legend>Roles (everyone is a Member by default)</legend>
            {ROLES.map(([r, l]) => <label key={r} className="check"><input type="checkbox" checked={f.roles.includes(r)} onChange={() => toggle(r)} />{l}</label>)}
          </fieldset>
          <p className="muted small">They get an email to set their own password.</p>
          {err && <p className="error">{err}</p>}
          <button className="btn" disabled={busy}>{busy ? "Creating…" : "Add and send invite"}</button>
        </form>
      )}
    </Modal>
  );
}

export default function Team({ me }) {
  const { rows: people, loading, error } = useCollection("users");
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  async function toggle(p, r) {
    const cur = rolesOf(p).filter((x) => x !== "member");
    const next = cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r];
    await updateDoc(doc(db, "users", p.id), { roles: next.length ? next : ["member"], role: next.includes("head") ? "head" : next[0] || "member" });
  }
  const setActive = (p, active) => (active || confirm(`Disable ${p.name}? They won't be able to sign in. Their old updates and deals stay.`)) && updateDoc(doc(db, "users", p.id), { active });
  async function invite(p) {
    try { await sendInvite(p.email); setMsg(`Invite sent to ${p.email}.`); } catch (e) { setMsg(`Could not send: ${e.message}`); }
  }
  return (
    <>
      <header className="top"><div><h1>Team</h1><p className="muted">Add people, choose what each can do, or disable someone who has left.</p></div>
        <button className="btn" onClick={() => setOpen(true)}>Add member</button></header>
      {open && <AddMember onClose={() => setOpen(false)} />}
      {msg && <p className="ok" role="status">{msg}</p>}
      <Status loading={loading} error={error}>
        <div className="feed">
          {people.map((p) => { const rs = rolesOf(p); const off = p.active === false; return (
            <div key={p.id} className={"panel row between" + (off ? " off" : "")}>
              <div className="who"><span className="avatar">{(p.name || "?")[0].toUpperCase()}</span>
                <div><strong>{p.name}</strong>{off && <span className="tag">Disabled</span>}<div className="muted">{p.email}</div>
                  <div className="row small"><button className="link" onClick={() => invite(p)}>Resend invite</button></div></div></div>
              <div className="roles">{ROLES.map(([r, l]) => (
                <label key={r} className="check"><input type="checkbox" checked={rs.includes(r)} disabled={off || (r === "head" && p.id === me.uid)} onChange={() => toggle(p, r)} />{l}</label>))}
                {p.id !== me.uid && <button className={off ? "btn ghost" : "btn ghost danger"} onClick={() => setActive(p, off)}>{off ? "Enable" : "Disable"}</button>}</div>
            </div>); })}
        </div>
      </Status>
      <p className="muted" style={{ marginTop: "1rem" }}>Everyone is a Member by default. Heads can call meetings and manage this page. Heads and Sales can change deals. Disabled people can't sign in; their history stays.</p>
    </>
  );
}
