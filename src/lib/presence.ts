import { useEffect, useState } from "react";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getDatabase, onDisconnect, onValue, ref, serverTimestamp, set } from "firebase/database";
import { firebaseApp, firebaseConfigured } from "@/lib/firebase";

/**
 * How many browser tabs currently have this site open, counted via a Firebase Realtime
 * Database presence node (one anonymous-auth uid per tab, auto-removed on disconnect).
 * Returns null until Firebase env vars are set (feature silently off) or before the first count arrives.
 */
export function useLiveCount(): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!firebaseConfigured) return;
    const app = firebaseApp();
    const db = getDatabase(app);
    const auth = getAuth(app);
    let myRef: ReturnType<typeof ref> | null = null;

    const connectedRef = ref(db, ".info/connected");
    const unsubConnected = onValue(connectedRef, (snap) => {
      if (!snap.val()) return;
      signInAnonymously(auth)
        .then(({ user }) => {
          myRef = ref(db, `presence/${user.uid}`);
          onDisconnect(myRef).remove();
          set(myRef, serverTimestamp());
        })
        .catch(() => {});
    });

    const presenceRef = ref(db, "presence");
    const unsubPresence = onValue(presenceRef, (snap) => setCount(snap.size), () => setCount(null));

    return () => {
      unsubConnected();
      unsubPresence();
      if (myRef) set(myRef, null).catch(() => {});
    };
  }, []);

  return count;
}
