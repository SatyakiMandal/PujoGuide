"use client";

import { CloudRain, CloudSun, Confetti } from "@phosphor-icons/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useUI } from "@/store/ui";

/** 2026 calendar (IST). Shashthi to Dashami is the festival; Mahalaya opens the season. */
const DAYS: { name: string; date: string }[] = [
  { name: "Mahalaya", date: "2026-10-10" },
  { name: "Shashthi", date: "2026-10-17" },
  { name: "Saptami", date: "2026-10-18" },
  { name: "Ashtami", date: "2026-10-19" },
  { name: "Navami", date: "2026-10-20" },
  { name: "Dashami", date: "2026-10-21" },
];

const istToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

function festivalLine(today: string): string {
  const [mahalaya, shashthi] = DAYS;
  const exact = DAYS.find((d) => d.date === today);
  if (exact && exact.name === "Mahalaya") return `Mahalaya today. Shashthi is in ${dayDiff(today, shashthi.date)} days.`;
  if (exact) return `Today is ${exact.name}.`;
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
        <span className="truncate">{festivalLine(today)}</span>
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
