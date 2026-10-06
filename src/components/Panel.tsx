"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CaretDown, CaretUp, CheckCircle, FirstAid, Heart, MagnifyingGlass, MapTrifold, Path, X } from "@phosphor-icons/react";
import { FilterGroups, FilterToggle } from "@/components/filters/Filters";
import { PlaceDetail } from "@/components/place/PlaceDetail";
import { PlanView } from "@/components/plan/PlanView";
import { PlaceList } from "@/components/place/PlaceList";
import { Chip } from "@/components/ui/Chip";
import { TodayStrip } from "@/components/TodayStrip";
import { LogoMark } from "@/components/ui/Logo";
import { CATEGORY_META } from "@/lib/categories";
import { placeBySlug } from "@/lib/data";
import { CATEGORIES } from "@/lib/schema";
import { useFiltered } from "@/lib/useFiltered";
import { useUI, type FilterMode } from "@/store/ui";
import { clsx } from "clsx";

const MODES: { id: FilterMode; label: string; hint: string }[] = [
  { id: "highlight", label: "Highlight", hint: "Dim everything that doesn't match" },
  { id: "filter", label: "Filter", hint: "Hide everything that doesn't match" },
];

export function Panel({ onSearchFocus }: { onSearchFocus?: () => void }) {
  const { list, matched, visibleCount } = useFiltered();
  const { query, mode, selected, filters, tab, showAmenities } = useUI();
  const stopCount = useUI((s) => s.route.stops.length);
  const savedCount = useUI((s) => s.saved.length);
  const visitedCount = useUI((s) => s.visited.length);
  const { setQuery, setMode, toggleLayer, setTab, select, setPersonal, toggleAmenities } = useUI.getState();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterSectionCollapsed, setFilterSectionCollapsed] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const place = selected ? placeBySlug.get(selected) : undefined;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isInput = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");
      if (e.key === "/" && !isInput) {
        e.preventDefault();
        setTab("explore");
        searchRef.current?.focus();
      } else if (e.key === "Escape" && selected) {
        select(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, select, setTab]);

  if (place) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain px-4 pb-4 pt-1">
        <AnimatePresence mode="wait" initial={false}>
          <PlaceDetail key={place.id} place={place} />
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 lg:space-y-3 px-3 pb-2 pt-1 lg:px-4 lg:pb-3">
        <div className="flex items-baseline justify-between">
          <h1 className="flex items-center gap-2 lg:gap-2.5 font-display text-lg lg:text-xl font-semibold">
            <LogoMark />
            <span>
              Pujo<span className="text-primary">Guide</span>
            </span>
          </h1>
          {tab === "explore" && (
            <span className="text-[11px] lg:text-xs text-muted" aria-live="polite">
              {matched.size} of {visibleCount} shown
            </span>
          )}
        </div>

        {!query && <TodayStrip />}

        <div role="tablist" className="grid grid-cols-2 rounded-full border border-line bg-surface p-0.5 relative">
          {(
            [
              { id: "explore", label: "Explore", icon: MapTrifold },
              { id: "plan", label: "Plan", icon: Path },
            ] as const
          ).map(({ id, label, icon: TabIcon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setTab(id);
                  useUI.getState().select(null);
                }}
                className={clsx(
                  "relative flex min-h-8 lg:min-h-10 items-center justify-center gap-1.5 lg:gap-2 rounded-full text-xs lg:text-sm font-semibold transition-colors z-10",
                  active ? "text-bg" : "text-muted hover:text-fg",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="activeTabPill"
                    className="absolute inset-0 rounded-full bg-fg -z-10 shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <TabIcon size={16} weight={active ? "fill" : "duotone"} className="lg:hidden" />
                <TabIcon size={18} weight={active ? "fill" : "duotone"} className="hidden lg:block" />
                {label}
                {id === "plan" && stopCount > 0 && (
                  <span className={clsx("grid min-w-4 lg:min-w-5 place-items-center rounded-full px-1 text-[10px] lg:text-xs transition-colors", active ? "bg-bg text-fg font-bold" : "bg-primary text-primary-fg")}>
                    {stopCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {tab === "explore" && (
          <>
        <label className="relative block">
          <MagnifyingGlass size={16} weight="bold" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted lg:hidden" />
          <MagnifyingGlass size={18} weight="bold" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted hidden lg:block" />
          <input
            ref={searchRef}
            value={query}
            onFocus={onSearchFocus}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pandals, baris, areas, food…"
            enterKeyHint="search"
            className="h-9 lg:h-12 w-full rounded-full border border-line bg-surface pl-9 lg:pl-10 pr-9 lg:pr-12 text-xs lg:text-base outline-none transition-shadow focus:ring-2 focus:ring-primary/40"
          />
          {!query && (
            <span className="pointer-events-none absolute right-2.5 lg:right-3 top-1/2 -translate-y-1/2 rounded-md border border-line bg-surface2 px-1 lg:px-1.5 py-0.5 font-mono text-[9px] lg:text-[10px] font-semibold text-muted shadow-2xs">
              /
            </span>
          )}
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="absolute right-1.5 lg:right-2 top-1/2 grid size-6 lg:size-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface2"
            >
              <X size={13} weight="bold" className="lg:hidden" />
              <X size={15} weight="bold" className="hidden lg:block" />
            </button>
          )}
        </label>

        {filterSectionCollapsed ? (
          <div className="flex items-center justify-between rounded-2xl border border-line bg-surface p-1.5 lg:p-2.5 text-[11px] lg:text-xs">
            <span className="font-semibold text-muted truncate pr-1.5">
              Filters collapsed · {filters.layers.length} categories active
            </span>
            <div className="flex items-center gap-1 lg:gap-1.5 shrink-0">
              <button
                type="button"
                onClick={toggleAmenities}
                className={clsx(
                  "inline-flex items-center gap-1 rounded-full border px-2 lg:px-2.5 py-0.5 lg:py-1 text-[11px] lg:text-xs font-semibold transition-colors",
                  showAmenities
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-line bg-surface2 text-fg hover:bg-surface2/80"
                )}
              >
                <FirstAid size={13} weight={showAmenities ? "fill" : "bold"} className="lg:hidden" />
                <FirstAid size={14} weight={showAmenities ? "fill" : "bold"} className="hidden lg:block" />
                <span>Amenities</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterSectionCollapsed(false)}
                className="flex items-center gap-1 rounded-full bg-primary/10 px-2 lg:px-2.5 py-0.5 lg:py-1 font-bold text-primary hover:bg-primary/20 transition-colors"
              >
                <span>Expand</span>
                <CaretDown size={13} weight="bold" className="lg:hidden" />
                <CaretDown size={14} weight="bold" className="hidden lg:block" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {!query && (
              <div className="flex flex-wrap items-center gap-1 lg:gap-1.5 text-[11px] lg:text-xs">
                <span className="text-[10px] lg:text-[11px] font-semibold uppercase tracking-wider text-muted">Try:</span>
                {[
                  ["Bonedi Bari", "bonedi bari"],
                  ["North Kolkata", "North Kolkata"],
                  ["Pure Veg", "veg"],
                  ["College Street", "College Street"],
                ].map(([label, q]) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuery(q)}
                    className="rounded-full border border-line/70 bg-surface2/60 px-2 py-0.5 text-[10px] lg:text-xs text-muted transition-colors hover:bg-surface2 hover:text-fg"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div className="-mx-3 flex gap-1.5 lg:gap-2 overflow-x-auto px-3 pb-0.5 lg:pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
              {savedCount > 0 && (
                <Chip
                  active={filters.personal === "saved"}
                  onClick={() => setPersonal(filters.personal === "saved" ? null : "saved")}
                >
                  <Heart size={14} weight={filters.personal === "saved" ? "fill" : "duotone"} className="text-primary lg:hidden" />
                  <Heart size={16} weight={filters.personal === "saved" ? "fill" : "duotone"} className="text-primary hidden lg:block" />
                  Saved ({savedCount})
                </Chip>
              )}
              {visitedCount > 0 && (
                <Chip
                  active={filters.personal === "visited"}
                  onClick={() => setPersonal(filters.personal === "visited" ? null : "visited")}
                >
                  <CheckCircle size={14} weight={filters.personal === "visited" ? "fill" : "duotone"} className="text-emerald-500 lg:hidden" />
                  <CheckCircle size={16} weight={filters.personal === "visited" ? "fill" : "duotone"} className="text-emerald-500 hidden lg:block" />
                  Visited ({visitedCount})
                </Chip>
              )}
              {CATEGORIES.map((c) => {
                const meta = CATEGORY_META[c];
                const Icon = meta.icon;
                return (
                  <Chip key={c} color={meta.cssVar} active={filters.layers.includes(c)} onClick={() => toggleLayer(c)}>
                    <Icon size={15} weight="duotone" className="lg:hidden" />
                    <Icon size={17} weight="duotone" className="hidden lg:block" />
                    {meta.plural}
                  </Chip>
                );
              })}
            </div>

            <div className="space-y-1.5 lg:space-y-2 border-t border-line/40 pt-1.5 lg:pt-2">
              <div className="flex items-center justify-between gap-1.5 lg:gap-2">
                <div className="flex items-center gap-1 lg:gap-1.5 flex-wrap">
                  <FilterToggle open={filtersOpen} onToggle={() => setFiltersOpen((o) => !o)} />
                  <button
                    type="button"
                    onClick={toggleAmenities}
                    className={clsx(
                      "inline-flex min-h-7 lg:min-h-9 items-center gap-1 lg:gap-1.5 rounded-full border px-2.5 lg:px-3 text-[11px] lg:text-xs font-semibold transition-all active:scale-95",
                      showAmenities
                        ? "border-primary/50 bg-primary/15 text-primary shadow-xs"
                        : "border-line bg-surface text-fg hover:bg-surface2"
                    )}
                  >
                    <FirstAid size={14} weight={showAmenities ? "fill" : "bold"} className="lg:hidden" />
                    <FirstAid size={16} weight={showAmenities ? "fill" : "bold"} className="hidden lg:block" />
                    <span>Amenities</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setFilterSectionCollapsed(true)}
                  aria-label="Collapse filters section"
                  title="Collapse filters section"
                  className="inline-flex min-h-7 lg:min-h-9 items-center gap-1 rounded-full border border-line bg-surface px-2 lg:px-2.5 text-[11px] lg:text-xs font-semibold text-muted hover:bg-surface2 hover:text-fg active:scale-95 transition-all shrink-0"
                >
                  <span>Collapse</span>
                  <CaretUp size={13} weight="bold" className="lg:hidden" />
                  <CaretUp size={14} weight="bold" className="hidden lg:block" />
                </button>
              </div>

              <div role="radiogroup" aria-label="How filters apply" className="flex w-full rounded-full border border-line bg-surface p-0.5">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={mode === m.id}
                    title={m.hint}
                    onClick={() => setMode(m.id)}
                    className={clsx(
                      "flex-1 min-h-7 lg:min-h-8 rounded-full px-2 lg:px-3 text-[11px] lg:text-xs font-semibold transition-colors text-center",
                      mode === m.id ? "bg-fg text-bg shadow-xs" : "text-muted hover:text-fg",
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
          </>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-line px-2 py-2 lg:px-3 lg:py-3">
        <AnimatePresence mode="wait" initial={false}>
          {tab === "plan" ? (
            <div key="plan">
              <PlanView />
            </div>
          ) : (
            <div key="list">
              <FilterGroups open={filtersOpen} />
              <PlaceList list={list} />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
