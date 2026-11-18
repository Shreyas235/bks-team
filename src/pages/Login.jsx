import { useEffect, useState } from "react";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { LOGO } from "../utils/constants";

function takeNotice() {
  try { const v = sessionStorage.getItem("loginNotice"); sessionStorage.removeItem("loginNotice"); return v || ""; }
  catch { return ""; }
}

export default function Login({ notice }) {
  const [mode, setMode] = useState("in");
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [show, setShow] = useState(false);
  const [info, setInfo] = useState(takeNotice);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  // Reasons we signed you out right after a correct password (disabled account, no profile, ...).
  useEffect(() => { if (notice) { setErr(notice.text); setInfo(""); } }, [notice]);

  async function submit(e) {
    e.preventDefault(); setErr(""); setInfo("");
    if (mode === "reset") {
      try { await sendPasswordResetEmail(auth, f.email); setInfo("Reset link sent. Check your inbox (and spam folder) and follow the link to set a new password."); }
      catch (e2) { setErr(e2.code === "auth/invalid-email" ? "Enter a valid email address." : e2.message); }
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, f.email, f.password);
    } catch (e2) {
      setErr(e2.code === "auth/invalid-credential" ? "Wrong email or password."
        : e2.code === "auth/too-many-requests" ? "Too many attempts. Please try again later."
        : e2.message);
    }
  }

  return (
    <div className="login">
      <div className="login-bg" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
      <form className="login-card" onSubmit={submit}>
        <img className="loginlogo" src={LOGO} alt="BK’s Solutions" />
        <h1>BK’s Team</h1>
        <p className="muted">{mode === "in" ? "Sign in to post today's update." : "Enter your email and we'll send you a link to set a new password."}</p>
        <label>Email<input type="email" value={f.email} onChange={set("email")} required /></label>
        {mode === "in" && <label>Password<span className="pw"><input type={show ? "text" : "password"} value={f.password} onChange={set("password")} required />
          <button type="button" className="eye" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>{show ? "Hide" : "Show"}</button></span></label>}
        {err && <p className="error">{err}</p>}
        {info && <p className="ok">{info}</p>}
        <button className="btn">{mode === "in" ? "Sign in" : "Send reset link"}</button>
        <button type="button" className="link" onClick={() => { setMode(mode === "in" ? "reset" : "in"); setErr(""); setInfo(""); }}>
          {mode === "in" ? "Forgot password?" : "Back to sign in"}
        </button>
        {mode === "in" && <p className="muted small">No account? Ask your team head to add you.</p>}
      </form>
    </div>
  );
}
