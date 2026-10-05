"use client";

import { CloudRain, CloudSun, Confetti } from "@phosphor-icons/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useUI } from "@/store/ui";

import { PUJA_CAL } from "@/lib/calendar";
import { fmtClock } from "@/lib/hours";
import { kolkataNow } from "@/lib/useNow";

/** Mahalaya opens the season; Shashthi to Dashami come from the shared festival calendar. */
const DAYS: { name: string; date: string }[] = [{ name: "Mahalaya", date: "2026-10-10" }, ...PUJA_CAL.map((d) => ({ name: d.name, date: d.date }))];

const istToday = () => kolkataNow().iso;
const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

/** The next ritual still to come today, e.g. "Sandhi Puja 10:28 am". */
export function nextRitual(today: string, minute: number): string | null {
  const day = PUJA_CAL.find((d) => d.date === today);
  const next = day?.rituals.filter((r) => r.end > minute).sort((a, b) => a.start - b.start)[0];
  if (!next) return null;
  return minute >= next.start ? `${next.label} (under way)` : `${next.label} ${fmtClock(next.start)}`;
}

export function festivalLine(today: string, minute?: number): string {
  const [mahalaya, shashthi] = DAYS;
  const exact = DAYS.find((d) => d.date === today);
  if (exact && exact.name === "Mahalaya") return `Mahalaya today. Shashthi is in ${dayDiff(today, shashthi.date)} days.`;
  if (exact) {
    const next = minute === undefined ? null : nextRitual(today, minute);
    return next ? `Today is ${exact.name}. Next: ${next}.` : `Today is ${exact.name}.`;
  }
  const toMahalaya = dayDiff(today, mahalaya.date);
  if (toMahalaya > 0) return `Mahalaya in ${toMahalaya} day${toMahalaya > 1 ? "s" : ""}. Shashthi on Sat 17 Oct.`;
  const toShashthi = dayDiff(today, shashthi.date);
  if (toShashthi > 0) return `Shashthi in ${toShashthi} day${toShashthi > 1 ? "s" : ""}.`;
  return "Shubho Bijoya! See you next Puja.";
}

type Forecast = { rain: number; temp: number } | null;

/** Rain chance for the next six hours, from Open-Meteo (free, no key). Silent if it can't load. */
function useForecast(): Forecast {
  const [f, setF] = useState<Forecast>(null);
  useEffect(() => {
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=22.5726&longitude=88.3639" +
      "&hourly=precipitation_probability,temperature_2m&timezone=Asia%2FKolkata&forecast_days=2";
    let live = true;
    fetch(url, { signal: AbortSignal.timeout(8000) })
      .then((r) => r.json())
      .then((j: { hourly: { time: string[]; precipitation_probability: number[]; temperature_2m: number[] } }) => {
        const now = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).slice(0, 13).replace(" ", "T");
        const i = Math.max(0, j.hourly.time.findIndex((t) => t >= now));
        const rain = Math.max(...j.hourly.precipitation_probability.slice(i, i + 6));
        if (live) setF({ rain, temp: Math.round(j.hourly.temperature_2m[i]) });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return f;
}

export function TodayStrip() {
  const today = useSyncExternalStore(
    () => () => {},
    istToday,
    () => null,
  );
  const forecast = useForecast();
  const setTab = useUI((s) => s.setTab);
  if (!today) return null;

  const wet = forecast !== null && forecast.rain >= 50;
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-surface2 px-3 py-2 text-xs">
      <button type="button" onClick={() => setTab("plan")} className="flex min-w-0 items-center gap-1.5 text-left font-medium">
        <Confetti size={16} weight="duotone" className="shrink-0 text-accent" />
        <span className="truncate">{festivalLine(today, kolkataNow().minute)}</span>
      </button>
      {forecast && (
        <span className="flex shrink-0 items-center gap-1 text-muted" title="Next six hours, Kolkata">
          {wet ? <CloudRain size={16} weight="duotone" className="text-primary" /> : <CloudSun size={16} weight="duotone" />}
          {forecast.temp}°{wet ? ` · rain ${forecast.rain}%` : ""}
        </span>
      )}
    </div>
  );
}
