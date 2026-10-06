"use client";

import {
  CalendarBlank,
  CaretDown,
  Clock,
  Funnel,
  MagicWand,
  MagnifyingGlass,
  MapTrifold,
  PencilSimple,
  Plus,
  SortAscending,
  Sparkle,
  Users,
  X,
} from "@phosphor-icons/react";
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

type View = "all" | PlanGroup | "day" | "auto";
type SortOption = "recommended" | "stops-desc" | "stops-asc" | "crowd-asc" | "title-asc";

const CROWD_LABEL: Record<Crowd, string> = { low: "Quiet", medium: "Moderate", high: "Busy", extreme: "Very crowded" };
const CROWD_RANK: Record<Crowd, number> = { low: 1, medium: 2, high: 3, extreme: 4 };

const SORT_LABELS: Record<SortOption, string> = {
  recommended: "Recommended",
  "stops-desc": "Most stops first",
  "stops-asc": "Fewest stops first",
  "crowd-asc": "Quietest first",
  "title-asc": "Alphabetical A–Z",
};

export function PlansCatalog({
  onDone,
  onStartCustomRoute,
  hasRoute,
}: {
  onDone: () => void;
  onStartCustomRoute?: () => void;
  hasRoute: boolean;
}) {
  const [view, setView] = useState<View>("all");
  const [tag, setTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recommended");

  const tags = view === "area" ? AREA_TAGS : view === "interest" ? INTEREST_TAGS : [...AREA_TAGS, ...INTEREST_TAGS];

  // Filtering
  const filtered = PLANS.filter((p) => {
    if (view !== "all" && view !== "auto" && view !== "day") {
      if (p.group !== view) return false;
    }
    if (tag !== null && p.tag !== tag) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchBlurb = p.blurb.toLowerCase().includes(q);
      const matchTag = p.tag.toLowerCase().includes(q);
      const matchStops = p.stops.some((s) => {
        const place = placeBySlug.get(s);
        return place && (place.name.en.toLowerCase().includes(q) || s.toLowerCase().includes(q));
      });
      if (!matchTitle && !matchBlurb && !matchTag && !matchStops) return false;
    }
    return true;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "stops-desc") return b.stops.length - a.stops.length;
    if (sortBy === "stops-asc") return a.stops.length - b.stops.length;
    if (sortBy === "crowd-asc") return CROWD_RANK[a.crowd] - CROWD_RANK[b.crowd];
    if (sortBy === "title-asc") return a.title.localeCompare(b.title);
    return 0;
  });

  return (
    <div className="space-y-4">
      {/* Custom Route Builder Banner */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-primary/40 bg-surface p-3 shadow-xs">
        <div className="min-w-0">
          <span className="block font-display text-xs sm:text-sm font-bold text-fg">
            Custom Route Builder
          </span>
          <span className="block text-[11px] sm:text-xs text-muted truncate">
            Build your own itinerary from scratch by searching spots
          </span>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            useUI.getState().setStops([]);
            useUI.getState().setTab("plan");
            if (onStartCustomRoute) {
              onStartCustomRoute();
            } else {
              onDone();
            }
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-fg shadow-xs"
        >
          <PencilSimple size={14} weight="bold" /> Custom Route
        </motion.button>
      </div>

      <div className="space-y-1">
        <h2 className="font-display text-base sm:text-lg font-semibold">
          {view === "auto"
            ? "Smart Auto-Planner"
            : view === "all"
            ? "All Ready-Made Curated Plans"
            : view === "area"
            ? "Ready-Made Plans by Area"
            : view === "interest"
            ? "Ready-Made Plans by Interest"
            : "Day-by-Day Festival Guide"}
        </h2>
        <p className="text-xs sm:text-sm text-muted">
          {view === "auto"
            ? "Generate a custom itinerary based on your available time and preferences."
            : `${PLANS.length} curated plans covering all pandals & Bonedi Baris. Filter or sort by stops, crowd & distance.`}
        </p>
      </div>

      {/* Main View Selector Tabs */}
      <div role="tablist" className="relative grid grid-cols-5 rounded-full border border-line bg-surface p-0.5 text-xs">
        {(
          [
            ["all", "All", Sparkle],
            ["area", "Area", MapTrifold],
            ["interest", "Interest", Funnel],
            ["day", "Day", CalendarBlank],
            ["auto", "Auto", MagicWand],
          ] as const
        ).map(([id, label, TabIcon]) => {
          const active = view === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setView(id);
                setTag(null);
              }}
              className={clsx(
                "relative flex min-h-8 items-center justify-center gap-1 rounded-full text-[11px] sm:text-xs font-semibold transition-colors z-10",
                active ? "text-bg" : "text-muted hover:text-fg",
              )}
            >
              {active && (
                <motion.span
                  layoutId="catalogTabPill"
                  className="absolute inset-0 rounded-full bg-fg -z-10 shadow-xs"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
              <TabIcon size={14} weight={active ? "fill" : "duotone"} />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Search & Sort Controls Bar */}
      {view !== "day" && view !== "auto" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="relative flex-1">
              <MagnifyingGlass size={15} weight="bold" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search plans by name, area or stop..."
                className="h-8 w-full rounded-full border border-line bg-surface pl-8 pr-8 text-xs outline-none focus:ring-2 focus:ring-primary/40"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 grid size-5 place-items-center rounded-full text-muted hover:bg-surface2"
                >
                  <X size={12} weight="bold" />
                </button>
              )}
            </label>

            <div className="relative shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort plans by"
                className="h-8 appearance-none rounded-full border border-line bg-surface pl-7 pr-7 text-xs font-semibold text-fg outline-none cursor-pointer hover:bg-surface2 transition-colors"
              >
                <option value="recommended">Recommended</option>
                <option value="stops-desc">Most stops first</option>
                <option value="stops-asc">Fewest stops first</option>
                <option value="crowd-asc">Quietest first</option>
                <option value="title-asc">Title A–Z</option>
              </select>
              <SortAscending size={14} weight="bold" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <CaretDown size={12} weight="bold" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />
            </div>
          </div>

          {/* Filter Tags Scroll Row */}
          <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
            <Chip active={tag === null} onClick={() => setTag(null)}>
              All Tags
            </Chip>
            {tags.map((t) => (
              <Chip key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)}>
                {t}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* Plan Cards Rendering */}
      {view === "auto" ? (
        <AutoPlanner hasRoute={hasRoute} onDone={onDone} />
      ) : view === "day" ? (
        <DayGuide hasRoute={hasRoute} onDone={onDone} />
      ) : (
        <div>
          {sorted.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-6 text-center text-xs text-muted">
              No plans match your search or filter. Try clearing your search query.
            </div>
          ) : (
            <ul className="space-y-2.5">
              <AnimatePresence initial={false}>
                {sorted.map((p) => (
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
        </div>
      )}

      {hasRoute && (
        <button type="button" onClick={onDone} className="w-full rounded-full border border-line bg-surface py-2 text-xs font-semibold">
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
    <article className="rounded-2xl border border-line bg-surface p-3 sm:p-3.5">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start gap-2.5 text-left">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-xs sm:text-sm leading-snug">{plan.title}</span>
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold text-primary">
              {plan.tag}
            </span>
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-muted">{plan.blurb}</span>
        </span>
        <CaretDown size={16} weight="bold" className={clsx("mt-1 shrink-0 text-muted transition-transform", open && "rotate-180")} />
      </button>

      <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1 font-semibold text-fg">
          <MapTrifold size={13} weight="duotone" className="text-primary" /> {plan.stops.length} stops
          {pandals > 0 && ` · ${pandals} pandal${pandals > 1 ? "s" : ""}`}
          {heritage > 0 && ` · ${heritage} bari${heritage > 1 ? "s" : ""}`}
          {food > 0 && ` · ${food} food`}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users size={13} weight="duotone" /> {CROWD_LABEL[plan.crowd]}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock size={13} weight="duotone" /> {plan.best}
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
            <div className="space-y-2 pt-2.5">
              <p className="text-xs">
                <b>Getting around:</b> {plan.getting}
              </p>
              <ol className="space-y-1">
                {places.map((p, i) => (
                  <li key={p.slug} className="flex items-center gap-1.5 text-xs">
                    <span className="grid size-4 shrink-0 place-items-center rounded-full bg-surface2 text-[10px] font-bold">{i + 1}</span>
                    <span className="text-muted">
                      <PlaceIcon place={p} size={14} />
                    </span>
                    <span className="truncate">{p.name.en}</span>
                  </li>
                ))}
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={() => load("replace")}
          className="inline-flex min-h-8 flex-1 items-center justify-center rounded-full bg-primary px-3 text-xs font-semibold text-primary-fg transition-transform active:scale-95 shadow-xs"
        >
          {confirm ? "Tap again to replace my plan" : "Use this plan"}
        </button>
        {hasRoute && (
          <button
            type="button"
            onClick={() => load("append")}
            className="inline-flex min-h-8 items-center gap-1 rounded-full border border-line bg-surface px-3 text-xs font-medium transition-transform active:scale-95"
          >
            <Plus size={14} weight="bold" /> Add
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
        <li key={d.day} className="space-y-2 rounded-2xl border border-line bg-surface p-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display text-base font-semibold">{d.day}</span>
            <span className="text-xs text-muted">{d.date}</span>
          </div>
          <p className="text-xs font-semibold">{d.theme}</p>
          <p className="text-xs leading-relaxed text-muted">{d.note}</p>
          <div className="space-y-2">
            {d.plans.map((id) => {
              const plan = planById.get(id);
              if (!plan) return null;
              return <PlanCard key={id} plan={plan} hasRoute={hasRoute} onDone={onDone} />;
            })}
          </div>
        </li>
      ))}
      <li className="text-[11px] leading-relaxed text-muted">
        Dates are from published 2026 calendars; confirm Sandhi Puja and Dashami timings with a panjika. Plans change as roads are closed near the biggest pandals.
      </li>
    </ol>
  );
}
