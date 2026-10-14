"use client";

import { useEffect, useState } from "react";
import { PUJA_CAL } from "@/lib/calendar";
import { kolkataNow } from "@/lib/useNow";

/**
 * This app has no backend (see AGENTS.md / README), so there's nothing to count visitors with.
 * This is a simulated estimate for the "N people here now" badge, not a real number — plausible
 * and smoothly varying, higher on festival days and in the evening pandal-hopping hours, never
 * meant to be read as verified data. Swap this file for a real presence source (a small backend
 * + websocket/polling) if that's ever added.
 */

/** Festival days get a big baseline boost; evenings (pandal-hopping hours) get a smaller one. */
function baseline(iso: string, minute: number): number {
  const isFestivalDay = PUJA_CAL.some((d) => d.date === iso);
  const eveningFactor = Math.max(0, 1 - Math.abs(minute - 20 * 60) / (6 * 60)); // peaks ~8pm
  return (isFestivalDay ? 40 : 6) + eveningFactor * (isFestivalDay ? 60 : 10);
}

/**
 * Live-looking count that drifts slowly instead of jumping, so reloads don't look erratic.
 * Null until mounted (computed from the client clock, so it can't be rendered on the server
 * without risking a hydration mismatch).
 */
export function useLiveCount(): number | null {
  const [n, setN] = useState<number | null>(null);

  useEffect(() => {
    const { iso, minute } = kolkataNow();
    setN(Math.round(baseline(iso, minute)));

    const id = setInterval(() => {
      const now = kolkataNow();
      const target = baseline(now.iso, now.minute);
      setN((prev) => {
        const base = prev ?? target;
        const drift = (target - base) * 0.2 + (Math.random() - 0.5) * 3;
        return Math.max(1, Math.round(base + drift));
      });
    }, 8_000);
    return () => clearInterval(id);
  }, []);

  return n;
}
