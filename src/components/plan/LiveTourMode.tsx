"use client";

import {
  ArrowSquareOut,
  CaretLeft,
  CaretRight,
  CheckCircle,
  Clock,
  Compass,
  CrosshairSimple,
  FlagCheckered,
  MapPin,
  NavigationArrow,
  Play,
  Sparkle,
  X,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { CATEGORY_META } from "@/lib/categories";
import { zoneName } from "@/lib/data";
import { PlaceIcon } from "@/lib/placeIcon";
import { legLink } from "@/lib/route/export";
import { fmtFare, fmtMin, MODE_META } from "@/lib/route/modeMeta";
import { placeDwellMin } from "@/lib/route/dwell";
import { isFood, type Place } from "@/lib/schema";
import type { Leg } from "@/lib/route/useLegs";
import { haversineKm } from "@/lib/route/geo";
import { useUI } from "@/store/ui";
import { clsx } from "clsx";

export function LiveTourMode({
  places,
  legs,
  activeIndex,
  onChangeIndex,
  onExit,
}: {
  places: Place[];
  legs: Leg[];
  activeIndex: number;
  onChangeIndex: (i: number) => void;
  onExit: () => void;
}) {
  const current = places[activeIndex];
  const next = places[activeIndex + 1];
  const leg = legs[activeIndex];
  const select = useUI((s) => s.select);
  const toggleVisited = useUI((s) => s.toggleVisited);
  const visited = useUI((s) => s.visited.includes(current?.slug));
  const userPos = useUI((s) => s.userPos);
  const pujaNight = useUI((s) => s.route.pujaNight);
  const [completedAnim, setCompletedAnim] = useState(false);

  // Focus the map on the active stop whenever activeIndex changes.
  useEffect(() => {
    if (current) select(current.slug);
  }, [activeIndex, current, select]);

  // GPS Proximity Auto-checkin: Auto advance when user comes within 50 meters of the stop
  useEffect(() => {
    if (!current || !userPos || completedAnim) return;
    const distKm = haversineKm(userPos, { lat: current.lat, lng: current.lng });
    if (distKm <= 0.05) {
      if (!visited) toggleVisited(current.slug);
      setCompletedAnim(true);
      const timer = setTimeout(() => {
        setCompletedAnim(false);
        if (activeIndex < places.length - 1) {
          onChangeIndex(activeIndex + 1);
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [userPos, current, activeIndex, places.length, visited, completedAnim, onChangeIndex, toggleVisited]);

  if (!current) return null;

  const meta = CATEGORY_META[current.category];
  const dwell = placeDwellMin(current, { pujaNight });
  const progressPercent = Math.round(((activeIndex + 1) / places.length) * 100);

  const markReachedAndNext = () => {
    if (!visited) toggleVisited(current.slug);
    setCompletedAnim(true);
    setTimeout(() => {
      setCompletedAnim(false);
      if (activeIndex < places.length - 1) {
        onChangeIndex(activeIndex + 1);
      }
    }, 600);
  };

  return (
    <div className="space-y-4">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-surface p-3 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Compass size={22} weight="fill" />
          </span>
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-muted">
              Live Tour Traversal
            </span>
            <span className="text-sm font-bold">
              Stop {activeIndex + 1} of {places.length}
            </span>
          </div>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={onExit}
          className="inline-flex min-h-9 items-center gap-1 rounded-full border border-line bg-surface px-3 text-xs font-semibold text-muted hover:text-fg"
        >
          <X size={15} weight="bold" /> Exit Tour
        </motion.button>
      </div>

      {/* Animated Progress Bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* Active Stop Card Carousel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.slug}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className={clsx(
            "relative space-y-4 rounded-3xl border-2 p-5 shadow-float transition-colors",
            completedAnim ? "border-emerald-500 bg-emerald-500/10" : "border-primary/50 bg-surface",
          )}
        >
          {completedAnim && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-3xl bg-emerald-600/90 text-white backdrop-blur-xs"
            >
              <CheckCircle size={56} weight="fill" className="animate-bounce" />
              <span className="mt-2 text-lg font-bold">Reached Stop {activeIndex + 1}!</span>
              <span className="text-xs opacity-90">Moving to next destination…</span>
            </motion.div>
          )}

          <div className="flex items-start justify-between gap-3">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-xs"
              style={{ background: `var(${meta.cssVar})`, color: "var(--pin-fg)" }}
            >
              <PlaceIcon place={current} size={16} /> Stop {activeIndex + 1} · {meta.label}
            </span>

            <span className="text-xs font-semibold text-muted">
              {zoneName.get(current.zones[0])}
            </span>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold leading-tight text-fg">{current.name.en}</h2>
            {current.aliases.length > 0 && (
              <p className="mt-0.5 text-xs text-muted">A.k.a {current.aliases.join(", ")}</p>
            )}
          </div>

          {current.blurb && (
            <p className="text-sm leading-relaxed text-muted line-clamp-3">{current.blurb}</p>
          )}

          <div className="flex flex-wrap gap-2 text-xs">
            {userPos && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-3 py-1 font-semibold text-blue-600 dark:text-blue-400">
                <CrosshairSimple size={15} weight="bold" /> {(haversineKm(userPos, { lat: current.lat, lng: current.lng }) * 1000).toFixed(0)}m away (GPS live)
              </span>
            )}
            {dwell.queue > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 font-semibold text-amber-600 dark:text-amber-400">
                <Clock size={15} weight="bold" /> ⌛ ~{dwell.queue}m queue wait
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-surface2 px-3 py-1 font-medium">
              Visit time: ~{dwell.viewing} mins
            </span>
          </div>

          {current.tips?.expect && (
            <div className="rounded-2xl bg-surface2/80 p-3 text-xs leading-relaxed">
              <b className="block font-semibold text-fg">What to expect:</b>
              {current.tips.expect}
            </div>
          )}

          {/* Direct Directions for current leg */}
          {leg && (
            <div className="rounded-2xl border border-line bg-surface2/50 p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-fg flex items-center gap-1">
                  <NavigationArrow size={14} weight="fill" className="text-primary" /> Next Transit Leg
                </span>
                <span className="text-muted font-medium">
                  {MODE_META[leg.chosen].label} · {fmtMin(leg.option.minutes)} ({leg.option.km.toFixed(1)} km)
                </span>
              </div>
              <a
                href={legLink(current, next, leg.chosen)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
              >
                <ArrowSquareOut size={14} weight="bold" /> Open directions to {next?.name.en}
              </a>
            </div>
          )}

          {/* Traversal CTAs */}
          <div className="space-y-2 pt-1">
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={markReachedAndNext}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 font-bold text-primary-fg shadow-xs transition-colors"
            >
              <CheckCircle size={20} weight="fill" />
              {activeIndex === places.length - 1
                ? "Finish Tour & Complete Route!"
                : `✓ Reached Stop ${activeIndex + 1} — Next Stop`}
            </motion.button>

            <div className="flex gap-2">
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                disabled={activeIndex === 0}
                onClick={() => onChangeIndex(activeIndex - 1)}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-line bg-surface text-xs font-semibold disabled:opacity-40"
              >
                <CaretLeft size={16} weight="bold" /> Previous Stop
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                disabled={activeIndex === places.length - 1}
                onClick={() => onChangeIndex(activeIndex + 1)}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-line bg-surface text-xs font-semibold disabled:opacity-40"
              >
                Next Stop <CaretRight size={16} weight="bold" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Overview List of Remaining Stops */}
      <div className="space-y-2 rounded-2xl border border-line bg-surface p-4 text-xs">
        <span className="font-semibold uppercase tracking-wider text-muted">Tour Route Overview</span>
        <ol className="space-y-1.5 pt-1">
          {places.map((p, idx) => {
            const isCurrent = idx === activeIndex;
            const isDone = idx < activeIndex;
            return (
              <li
                key={p.slug}
                onClick={() => onChangeIndex(idx)}
                className={clsx(
                  "flex cursor-pointer items-center justify-between gap-2 rounded-xl p-2 transition-colors",
                  isCurrent
                    ? "bg-primary/10 font-bold text-primary"
                    : isDone
                    ? "text-muted opacity-70"
                    : "hover:bg-surface2",
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={clsx(
                      "grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                      isCurrent
                        ? "bg-primary text-primary-fg"
                        : isDone
                        ? "bg-emerald-500 text-white"
                        : "bg-surface2 text-fg",
                    )}
                  >
                    {isDone ? "✓" : idx + 1}
                  </span>
                  <span className="truncate">{p.name.en}</span>
                </div>
                {isCurrent && <span className="shrink-0 text-[10px] uppercase font-bold text-primary">Now</span>}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
