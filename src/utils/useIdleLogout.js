import { useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export const IDLE_MS = 5 * 60 * 1000; // sign out after 5 minutes without activity

export function useIdleLogout(active) {
  useEffect(() => {
    if (!active) return;
    let last = Date.now();
    const touch = () => { last = Date.now(); };
    const check = () => {
      if (Date.now() - last < IDLE_MS) return;
      try { sessionStorage.setItem("loginNotice", "You were signed out after 5 minutes of inactivity."); } catch { /* ignore */ }
      signOut(auth);
    };
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    document.addEventListener("visibilitychange", check);
    const timer = setInterval(check, 10000);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      events.forEach((e) => window.removeEventListener(e, touch));
    };
  }, [active]);
}
