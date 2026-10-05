"use client";

import { useEffect, useState } from "react";

export type Clock = { iso: string; weekday: number; minute: number };

/** Current Kolkata date and time, independent of the device's own timezone. */
export function kolkataNow(d = new Date()): Clock {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const iso = `${get("year")}-${String(get("month")).padStart(2, "0")}-${String(get("day")).padStart(2, "0")}`;
  const weekday = (new Date(Date.UTC(get("year"), get("month") - 1, get("day"))).getUTCDay() + 6) % 7;
  return { iso, weekday, minute: get("hour") * 60 + get("minute") };
}

/** Null on the server and first paint (avoids hydration mismatches), then ticks every minute. */
export function useNow(): Clock | null {
  const [now, setNow] = useState<Clock | null>(null);
  useEffect(() => {
    const tick = () => setNow(kolkataNow());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}
