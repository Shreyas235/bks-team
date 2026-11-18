import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

// In-app notification for each person (not the sender). Never blocks the main action.
export async function notify(uids, text, tab, fromUid) {
  const targets = [...new Set(uids)].filter((u) => u && u !== fromUid);
  await Promise.all(targets.map((uid) => addDoc(collection(db, "notifications"), { uid, text, tab, read: false, createdAt: serverTimestamp() }).catch(() => {})));
}
