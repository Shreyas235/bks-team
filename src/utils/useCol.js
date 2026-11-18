import { useEffect, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

// Live Firestore query with loading + error state.
// build() returns a query/collection ref. Pass enabled=false to skip subscribing.
export function useQueryRows(build, deps, enabled = true) {
  const [s, setS] = useState({ rows: [], loading: enabled, error: null });
  useEffect(() => {
    if (!enabled) { setS({ rows: [], loading: false, error: null }); return; }
    setS((p) => ({ ...p, loading: true, error: null }));
    return onSnapshot(build(),
      (snap) => setS({ rows: snap.docs.map((d) => ({ id: d.id, ...d.data() })), loading: false, error: null }),
      (error) => { console.error(error); setS({ rows: [], loading: false, error }); });
  }, [...deps, enabled]);
  return s;
}

export const useCollection = (name) => useQueryRows(() => collection(db, name), [name]);
export const useCol = (name) => useCollection(name).rows;

// Live single document.
export function useDoc(path, id) {
  const [s, setS] = useState({ data: null, loading: true, error: null });
  useEffect(() => onSnapshot(doc(db, path, id),
    (snap) => setS({ data: snap.exists() ? snap.data() : null, loading: false, error: null }),
    (error) => setS({ data: null, loading: false, error })), [path, id]);
  return s;
}
