"use client";

import { DownloadSimple, WifiHigh, WifiSlash } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { precacheKolkataMapTiles, type CacheProgress } from "@/lib/offlineTileCacher";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [progress, setProgress] = useState<CacheProgress>({ total: 0, completed: 0, percent: 0, status: "idle" });

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOffline(!navigator.onLine);

    const onOffline = () => setIsOffline(true);
    const onOnline = () => setIsOffline(false);

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const handlePrecache = async () => {
    await precacheKolkataMapTiles((p) => setProgress(p));
  };

  if (!isOffline && progress.status === "idle") return null;

  return (
    <div
      role="status"
      className={`fixed top-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2.5 rounded-full px-4 py-2 text-xs font-semibold shadow-lg backdrop-blur-md transition-all ${
        isOffline
          ? "border border-amber-500/40 bg-amber-500/90 text-slate-950"
          : "border border-emerald-500/40 bg-emerald-500/90 text-slate-950"
      }`}
    >
      {isOffline ? (
        <>
          <WifiSlash size={16} weight="bold" className="shrink-0" />
          <span>Puja Day Mode (Offline) · Using cached map tiles &amp; routes</span>
        </>
      ) : (
        <>
          <WifiHigh size={16} weight="bold" className="shrink-0" />
          {progress.status === "caching" ? (
            <span>Precaching Kolkata map tiles: {progress.percent}%</span>
          ) : progress.status === "done" ? (
            <span>Map tiles cached! Ready for offline Pujo hopping.</span>
          ) : (
            <span>Online</span>
          )}
        </>
      )}

      {!isOffline && progress.status === "idle" && (
        <button
          type="button"
          onClick={handlePrecache}
          className="flex items-center gap-1 rounded-full bg-slate-950/20 px-2.5 py-0.5 text-[11px] font-bold text-slate-950 transition-colors hover:bg-slate-950/30 active:scale-95"
        >
          <DownloadSimple size={12} weight="bold" /> Download Map
        </button>
      )}
    </div>
  );
}
