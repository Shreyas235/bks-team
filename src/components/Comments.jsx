import { useState } from "react";
import { addDoc, collection, deleteDoc, doc, query, serverTimestamp, where } from "firebase/firestore";
import { db } from "../firebase";
import { notify } from "../utils/notify";
import { rolesOf } from "../utils/helpers";
import { useQueryRows } from "../utils/useCol";
import { Status } from "./State";

const when = (t) => (t?.seconds ? new Date(t.seconds * 1000).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "just now");

// Comment thread under an update or a deal. Loads only when opened.
export function Comments({ me, parentType, parentId, ownerUid, label }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const { rows, loading, error } = useQueryRows(() => query(collection(db, "comments"), where("parentId", "==", parentId)), [parentId], open);
  const list = [...rows].sort((a, b) => (a.createdAt?.seconds || 9e12) - (b.createdAt?.seconds || 9e12));
  const isHead = rolesOf(me).includes("head");

  async function send() {
    const t = text.trim(); if (!t || busy) return;
    setBusy(true);
    try {
      await addDoc(collection(db, "comments"), { parentType, parentId, uid: me.uid, name: me.name, text: t, createdAt: serverTimestamp() });
      await notify([ownerUid, ...rows.map((r) => r.uid)], `${me.name} commented on ${label}`, parentType === "deal" ? "pipe" : "updates", me.uid);
      setText("");
    } finally { setBusy(false); }
  }
  return (
    <div className="comments">
      <button type="button" className="link" onClick={() => setOpen(!open)}>{open ? "Hide comments" : "Comments"}</button>
      {open && (
        <Status loading={loading} error={error}>
          {list.map((c) => (
            <div key={c.id} className="comment"><div><strong>{c.name}</strong> <span className="muted small">{when(c.createdAt)}</span></div><p>{c.text}</p>
              {(c.uid === me.uid || isHead) && <button type="button" className="link small" onClick={() => deleteDoc(doc(db, "comments", c.id))}>Delete</button>}</div>))}
          <div className="commentbox">
            <input value={text} maxLength={1000} placeholder="Write a comment…" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }} />
            <button type="button" className="btn" disabled={busy || !text.trim()} onClick={send}>Send</button>
          </div>
        </Status>
      )}
    </div>
  );
}
