"use client";

import { CloudRain, CloudSun, Confetti } from "@phosphor-icons/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useUI } from "@/store/ui";
import { clsx } from "clsx";

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
  const pujaDayMode = useUI((s) => s.pujaDayMode);
  const togglePujaDayMode = useUI((s) => s.togglePujaDayMode);

  if (!today) return null;

  const wet = forecast !== null && forecast.rain >= 50;
  return (
    <div className="space-y-1.5 lg:space-y-2">
      <div className="relative overflow-hidden flex items-center justify-between gap-2 lg:gap-3 rounded-2xl border border-line bg-surface p-2 lg:p-3 text-[11px] lg:text-xs shadow-sm">
        <div className="absolute -right-2 -top-4 -bottom-4 w-32 opacity-15 pointer-events-none overflow-hidden">
          <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" className="w-full h-full text-accent">
            <circle cx="80" cy="50" r="30" strokeWidth="1.5" strokeDasharray="3 3" />
            <path d="M50 30 Q 70 50 50 70 Q 30 50 50 30 Z" strokeWidth="1.5" />
            <circle cx="50" cy="50" r="6" fill="currentColor" />
          </svg>
        </div>
        <button type="button" onClick={() => setTab("plan")} className="relative z-10 flex min-w-0 items-center gap-1.5 lg:gap-2 text-left font-medium">
          <Confetti size={16} weight="duotone" className="shrink-0 text-accent lg:hidden" />
          <Confetti size={18} weight="duotone" className="shrink-0 text-accent hidden lg:block" />
          <span className="truncate">{festivalLine(today, kolkataNow().minute)}</span>
        </button>
        {forecast && (
          <span className="relative z-10 flex shrink-0 items-center gap-1 lg:gap-1.5 rounded-full bg-surface2/90 backdrop-blur-sm px-2 py-0.5 lg:px-2.5 lg:py-1 text-[10px] lg:text-xs text-muted" title="Next six hours, Kolkata">
            {wet ? <CloudRain size={14} weight="duotone" className="text-primary lg:hidden" /> : <CloudSun size={14} weight="duotone" className="lg:hidden" />}
            {wet ? <CloudRain size={16} weight="duotone" className="text-primary hidden lg:block" /> : <CloudSun size={16} weight="duotone" className="hidden lg:block" />}
            {forecast.temp}°{wet ? ` · rain ${forecast.rain}%` : ""}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={togglePujaDayMode}
        className={clsx(
          "flex w-full items-center justify-between rounded-2xl border px-2.5 py-1.5 lg:px-3 lg:py-2 text-[11px] lg:text-xs font-bold transition-all active:scale-98 shadow-sm",
          pujaDayMode
            ? "border-amber-500/60 bg-gradient-to-r from-amber-500/20 via-primary/20 to-accent/20 text-fg ring-1 ring-amber-500/40"
            : "border-line bg-surface hover:bg-surface2 text-muted hover:text-fg"
        )}
      >
        <div className="flex items-center gap-1.5 lg:gap-2">
          <span className="text-xs lg:text-sm">🪔</span>
          <span>{pujaDayMode ? "Puja Day Mode Active" : "Enable Puja Day Mode"}</span>
        </div>
        <span className={clsx("rounded-full px-1.5 py-0.5 lg:px-2 text-[9px] lg:text-[10px] uppercase font-extrabold tracking-wider", pujaDayMode ? "bg-amber-500 text-black shadow-xs" : "bg-surface2 text-muted")}>
          {pujaDayMode ? "ON" : "OFF"}
        </span>
      </button>
    </div>
  );
}
