"use client";

import { Clock, Star } from "@phosphor-icons/react";
import { clsx } from "clsx";
import { useState } from "react";
import { PUJA_CAL, ritualsOn } from "@/lib/calendar";
import { DAY_NAMES, fmtClock, fmtWindows, openStatus, weekdayOf } from "@/lib/hours";
import { useShown } from "@/lib/live/useLive";
import type { Place } from "@/lib/schema";
import { useNow } from "@/lib/useNow";

const fmtCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));
const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

/** Festival days keyed by Monday-first weekday, so the table can label "Mon · Ashtami". */
const FEST_BY_WEEKDAY = new Map(PUJA_CAL.map((d) => [weekdayOf(d.date), d.name]));

export function Rating({ rating, count, className }: { rating?: number; count?: number; className?: string }) {
  if (!rating) return null;
  return (
    <span className={clsx("inline-flex items-center gap-1 tabular-nums", className)} aria-label={`Rated ${rating} out of 5${count ? `, ${count} reviews` : ""}`}>
      <Star size={14} weight="fill" className="text-accent" aria-hidden />
      <b className="font-semibold">{rating.toFixed(1)}</b>
      {count ? <span className="text-muted">({fmtCount(count)})</span> : null}
    </span>
  );
}

export function StatusLine({ place, className }: { place: Place; className?: string }) {
  const now = useNow();
  if (!now || place.closed) return null;
  const s = openStatus(place, now.weekday, now.minute);
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 text-sm",
        s.tone === "open" ? "text-c-food" : s.tone === "closed" ? "text-primary" : "text-muted",
        className,
      )}
    >
      <i aria-hidden className={clsx("size-2 rounded-full", s.tone === "open" ? "bg-c-food" : s.tone === "closed" ? "bg-primary" : "bg-line")} />
      {s.text}
    </span>
  );
}

export function HoursCard({ place }: { place: Place }) {
  const shown = useShown(place);
  const now = useNow();
  const [photoOk, setPhotoOk] = useState(true);
  const isSight = place.category === "bonedi_bari" || place.category === "pandal";
  const rituals = isSight
    ? PUJA_CAL.map((d) => ({ day: d, items: ritualsOn(d.id, place.category === "pandal" ? "pandals" : "baris") })).filter((x) => x.items.length)
    : [];

  if (!shown.photo && !shown.rating && !shown.hours && !isSight) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-line bg-surface p-4" aria-label="Hours and ratings">
      {shown.photo && photoOk && (
        // eslint-disable-next-line @next/next/no-img-element -- remote snapshot photo with its own fallback
        <img
          src={shown.photo}
          alt={`${place.name.en}, photo from Google Maps`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setPhotoOk(false)}
          className="aspect-[3/2] w-full rounded-xl object-cover"
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <Rating rating={shown.rating} count={shown.ratingCount} className="text-base" />
        <StatusLine place={place} />
      </div>

      {shown.hours ? (
        <div>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
            <Clock size={14} weight="bold" /> Opening hours
          </h3>
          <table className="w-full text-sm">
            <tbody>
              {DAY_NAMES.map((name, i) => {
                const today = now?.weekday === i;
                const fest = FEST_BY_WEEKDAY.get(i);
                return (
                  <tr key={name} className={clsx(today && "font-semibold")}>
                    <th scope="row" className="py-0.5 pr-3 text-left font-normal">
                      {name.slice(0, 3)}
                      {fest && <span className="ml-1.5 text-[11px] text-accent">{fest}</span>}
                    </th>
                    <td className="py-0.5 text-right tabular-nums">{fmtWindows(shown.hours![i])}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        !isSight && <p className="text-sm text-muted">No hours listed. Check before you go.</p>
      )}

      {isSight && (
        <div>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Puja day timings (approximate)</h3>
          <ul className="space-y-1 text-sm">
            {rituals.map(({ day, items }) => (
              <li key={day.id}>
                <b>{day.name}:</b>{" "}
                {items.map((r, i) => (
                  <span key={r.kind + r.start}>
                    {i > 0 && " · "}
                    {r.label.replace(/^(Saptami|Ashtami|Navami) /, "")} {fmtClock(r.start)}
                    {r.end - r.start > 15 ? `–${fmtClock(r.end)}` : ""}
                  </span>
                ))}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-muted">Sandhi Puja timing is from Belur Math. Each club sets its own Pushpanjali time, so confirm locally.</p>
        </div>
      )}

      {shown.freshness !== "none" && (
        <p className="text-xs text-muted">
          {shown.freshness === "live" ? "Live from Google." : `From Google Maps, ${fmtDate(shown.asOf) || "snapshot"}.`} Hours around the festival often change.
        </p>
      )}
    </section>
  );
}
