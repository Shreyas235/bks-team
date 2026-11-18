import { getApp, getApps, initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail, signOut, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, firebaseConfig } from "../firebase";

const CHARS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
// Nobody ever sees this password. The person sets their own through the invite email.
const throwaway = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => CHARS[b % CHARS.length]).join("");

// Creates a login + profile for someone else and emails them a "set your password" link.
// A second Firebase app is used so the head stays signed in.
export async function createAccount({ name, email, roles }) {
  const app = getApps().some((a) => a.name === "account-creator") ? getApp("account-creator") : initializeApp(firebaseConfig, "account-creator");
  const auth2 = getAuth(app);
  const cred = await createUserWithEmailAndPassword(auth2, email, throwaway());
  let emailSent = true;
  try {
    await updateProfile(cred.user, { displayName: name });
    const list = roles.length ? roles : ["member"];
    await setDoc(doc(db, "users", cred.user.uid), {
      name, email, roles: list, role: list.includes("head") ? "head" : list[0], active: true, createdAt: serverTimestamp(),
    });
    try { await sendPasswordResetEmail(auth2, email); } catch { emailSent = false; }
  } finally {
    await signOut(auth2);
  }
  return { emailSent };
}

export const sendInvite = (email) => sendPasswordResetEmail(auth, email);
