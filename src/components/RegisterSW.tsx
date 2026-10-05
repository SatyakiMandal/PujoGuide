"use client";

import { useEffect } from "react";

/** Registers the offline service worker. Production only, so it never caches dev builds. */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support is a bonus; the app works without it */
    });
  }, []);
  return null;
}
