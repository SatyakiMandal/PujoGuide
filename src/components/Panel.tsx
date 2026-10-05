"use client";

import { AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { MagnifyingGlass, MapTrifold, Path, X } from "@phosphor-icons/react";
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

export function Panel() {
  const { list, matched, visibleCount } = useFiltered();
  const { query, mode, selected, filters, tab } = useUI();
  const stopCount = useUI((s) => s.route.stops.length);
  const { setQuery, setMode, toggleLayer, setTab, select } = useUI.getState();
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 px-4 pb-3 pt-1">
        <div className="flex items-baseline justify-between">
          <h1 className="flex items-center gap-2.5 font-display text-xl font-semibold">
            <LogoMark />
            <span>
              Pujo<span className="text-primary">Guide</span>
            </span>
          </h1>
          {tab === "explore" && (
            <span className="text-xs text-muted" aria-live="polite">
              {matched.size} of {visibleCount} shown
            </span>
          )}
        </div>

        <TodayStrip />

        <div role="tablist" className="grid grid-cols-2 rounded-full border border-line bg-surface p-0.5">
          {(
            [
              { id: "explore", label: "Explore", icon: MapTrifold },
              { id: "plan", label: "Plan", icon: Path },
            ] as const
          ).map(({ id, label, icon: TabIcon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => {
                setTab(id);
                useUI.getState().select(null);
              }}
              className={clsx(
                "flex min-h-10 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors",
                tab === id ? "bg-fg text-bg" : "text-muted hover:text-fg",
              )}
            >
              <TabIcon size={18} weight={tab === id ? "fill" : "duotone"} />
              {label}
              {id === "plan" && stopCount > 0 && (
                <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1 text-xs text-primary-fg">
                  {stopCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "explore" && (
          <>
        <label className="relative block">
          <MagnifyingGlass size={18} weight="bold" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pandals, baris, areas, food…"
            enterKeyHint="search"
            className="h-11 w-full rounded-full border border-line bg-surface pl-10 pr-12 text-base outline-none transition-shadow focus:ring-2 focus:ring-primary/40"
          />
          {!query && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-line bg-surface2 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted shadow-2xs">
              /
            </span>
          )}
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface2"
            >
              <X size={15} weight="bold" />
            </button>
          )}
        </label>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
          {CATEGORIES.map((c) => {
            const meta = CATEGORY_META[c];
            const Icon = meta.icon;
            return (
              <Chip key={c} color={meta.cssVar} active={filters.layers.includes(c)} onClick={() => toggleLayer(c)}>
                <Icon size={17} weight="duotone" /> {meta.plural}
              </Chip>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3">
          <FilterToggle open={filtersOpen} onToggle={() => setFiltersOpen((o) => !o)} />
          <div role="radiogroup" aria-label="How filters apply" className="flex rounded-full border border-line bg-surface p-0.5">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={mode === m.id}
                title={m.hint}
                onClick={() => setMode(m.id)}
                className={clsx(
                  "min-h-8 rounded-full px-3 text-sm font-medium transition-colors",
                  mode === m.id ? "bg-fg text-bg" : "text-muted hover:text-fg",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
          </>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-line px-3 py-3">
        <AnimatePresence mode="wait" initial={false}>
          {place ? (
            <PlaceDetail key={place.id} place={place} />
          ) : tab === "plan" ? (
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
