"use client";

import { CaretDown, CalendarBlank, Clock, MagicWand, MapTrifold, Plus, Sparkle, Users } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { AutoPlanner } from "./AutoPlanner";
import { placeBySlug } from "@/lib/data";
import { PlaceIcon } from "@/lib/placeIcon";
import { AREA_TAGS, INTEREST_TAGS, PLANS, PUJA_DAYS, planById, type Plan, type PlanGroup } from "@/lib/plans";
import { isFood, type Crowd } from "@/lib/schema";
import { useUI } from "@/store/ui";
import { clsx } from "clsx";

type View = PlanGroup | "day" | "auto";

const CROWD_LABEL: Record<Crowd, string> = { low: "Quiet", medium: "Moderate", high: "Busy", extreme: "Very crowded" };

export function PlansCatalog({ onDone, hasRoute }: { onDone: () => void; hasRoute: boolean }) {
  const [view, setView] = useState<View>("auto");
  const [tag, setTag] = useState<string | null>(null);

  const tags = view === "area" ? AREA_TAGS : view === "interest" ? INTEREST_TAGS : [];
  const shown = PLANS.filter((p) => p.group === view && (tag === null || p.tag === tag));

  return (
    <div className="space-y-4">
      {view !== "auto" && (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-2xl border border-line/60 bg-surface shadow-sm">
            <img
              src="/assets/banner-routes.png"
              alt="Explore new routes & share stories"
              className="w-full h-auto object-cover max-h-40"
            />
          </div>
          <h2 className="font-display text-lg font-semibold">Ready-made plans</h2>
          <p className="text-sm text-muted">
            {PLANS.length} plans that between them cover every pandal and Bonedi Bari. Load one, then edit it.
          </p>
        </div>
      )}

      <div role="tablist" className="grid grid-cols-4 rounded-full border border-line bg-surface p-0.5">
        {(
          [
            ["auto", "Auto", MagicWand],
            ["area", "Area", MapTrifold],
            ["interest", "Interest", Sparkle],
            ["day", "Day", CalendarBlank],
          ] as const
        ).map(([id, label, TabIcon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => {
              setView(id);
              setTag(null);
            }}
            className={clsx(
              "flex min-h-9 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-colors",
              view === id ? "bg-fg text-bg" : "text-muted hover:text-fg",
            )}
          >
            <TabIcon size={16} weight={view === id ? "fill" : "duotone"} /> {label}
          </button>
        ))}
      </div>

      {view !== "day" && view !== "auto" && (
        <div className="flex flex-wrap gap-2">
          <Chip active={tag === null} onClick={() => setTag(null)}>
            All
          </Chip>
          {tags.map((t) => (
            <Chip key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)}>
              {t}
            </Chip>
          ))}
        </div>
      )}

      {view === "auto" ? (
        <AutoPlanner hasRoute={hasRoute} onDone={onDone} />
      ) : view === "day" ? (
        <DayGuide hasRoute={hasRoute} onDone={onDone} />
      ) : (
        <ul className="space-y-2.5">
          <AnimatePresence initial={false}>
            {shown.map((p) => (
              <motion.li
                key={p.id}
                layout="position"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <PlanCard plan={p} hasRoute={hasRoute} onDone={onDone} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {hasRoute && (
        <button type="button" onClick={onDone} className="w-full rounded-full border border-line bg-surface py-2.5 text-sm font-medium">
          Back to my plan
        </button>
      )}
    </div>
  );
}

function PlanCard({ plan, hasRoute, onDone }: { plan: Plan; hasRoute: boolean; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const { setStops, setTab, select } = useUI.getState();
  const places = plan.stops.map((s) => placeBySlug.get(s)).filter((p) => !!p);
  const food = places.filter((p) => isFood(p.category)).length;
  const heritage = places.filter((p) => p.category === "bonedi_bari").length;
  const pandals = places.filter((p) => p.category === "pandal").length;

  const load = (mode: "replace" | "append") => {
    const current = useUI.getState().route.stops;
    if (mode === "replace" && current.length && !confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 6000);
      return;
    }
    setStops(mode === "replace" ? plan.stops : [...current, ...plan.stops.filter((s) => !current.includes(s))]);
    select(null);
    setTab("plan");
    onDone();
  };

  return (
    <article className="rounded-2xl border border-line bg-surface p-3.5">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start gap-3 text-left">
        <span className="min-w-0 flex-1">
          <span className="block font-semibold leading-snug">{plan.title}</span>
          <span className="mt-1 block text-sm leading-relaxed text-muted">{plan.blurb}</span>
        </span>
        <CaretDown size={18} weight="bold" className={clsx("mt-1 shrink-0 text-muted transition-transform", open && "rotate-180")} />
      </button>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <MapTrifold size={14} weight="duotone" /> {plan.stops.length} stops
          {pandals > 0 && ` · ${pandals} pandal${pandals > 1 ? "s" : ""}`}
          {heritage > 0 && ` · ${heritage} bari${heritage > 1 ? "s" : ""}`}
          {food > 0 && ` · ${food} to eat`}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users size={14} weight="duotone" /> {CROWD_LABEL[plan.crowd]}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock size={14} weight="duotone" /> {plan.best}
        </span>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-3">
              <p className="text-sm">
                <b>Getting around:</b> {plan.getting}
              </p>
              <ol className="space-y-1">
                {places.map((p, i) => (
                  <li key={p.slug} className="flex items-center gap-2 text-sm">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-surface2 text-[11px] font-bold">{i + 1}</span>
                    <span className="text-muted">
                      <PlaceIcon place={p} size={15} />
                    </span>
                    <span className="truncate">{p.name.en}</span>
                  </li>
                ))}
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => load("replace")}
          className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-fg transition-transform active:scale-95"
        >
          {confirm ? "Tap again to replace my plan" : "Use this plan"}
        </button>
        {hasRoute && (
          <button
            type="button"
            onClick={() => load("append")}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm font-medium transition-transform active:scale-95"
          >
            <Plus size={16} weight="bold" /> Add
          </button>
        )}
      </div>
    </article>
  );
}

function DayGuide({ hasRoute, onDone }: { hasRoute: boolean; onDone: () => void }) {
  return (
    <ol className="space-y-3">
      {PUJA_DAYS.map((d) => (
        <li key={d.day} className="space-y-2 rounded-2xl border border-line bg-surface p-3.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display text-lg font-semibold">{d.day}</span>
            <span className="text-xs text-muted">{d.date}</span>
          </div>
          <p className="text-sm font-medium">{d.theme}</p>
          <p className="text-sm leading-relaxed text-muted">{d.note}</p>
          <div className="space-y-2">
            {d.plans.map((id) => {
              const plan = planById.get(id)!;
              return <PlanCard key={id} plan={plan} hasRoute={hasRoute} onDone={onDone} />;
            })}
          </div>
        </li>
      ))}
      <li className="text-xs leading-relaxed text-muted">
        Dates are from published 2026 calendars; confirm Sandhi Puja and Dashami timings with a panjika. Plans change as roads are closed near the biggest pandals.
      </li>
    </ol>
  );
}
