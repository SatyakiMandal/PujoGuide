"use client";

import { AnimatePresence, motion } from "motion/react";
import { SlidersHorizontal } from "@phosphor-icons/react";
import { Chip } from "@/components/ui/Chip";
import { CUISINE_LABEL, DIET_LABEL, PRICE, VIBE_LABEL } from "@/lib/categories";
import { CUISINE_ICON } from "@/lib/placeIcon";
import { metroStations, zones } from "@/lib/data";
import { activeFacetCount } from "@/lib/filter";
import { CUISINES, DIETS, FOOD_CATEGORIES, VIBES, type Region } from "@/lib/schema";
import { useUI } from "@/store/ui";

const REGION_LABEL: Record<Region, string> = {
  north: "North",
  central: "Central",
  south: "South",
  saltlake: "Salt Lake",
};

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

export function FilterToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const filters = useUI((s) => s.filters);
  const reset = useUI((s) => s.reset);
  const n = activeFacetCount(filters);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-sm font-medium hover:bg-surface2"
      >
        <SlidersHorizontal size={17} weight="bold" />
        Filters
        {n > 0 && (
          <span className="grid size-5 place-items-center rounded-full bg-primary text-xs text-primary-fg">
            {n}
          </span>
        )}
      </button>
      {n > 0 && (
        <button type="button" onClick={reset} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Clear
        </button>
      )}
    </div>
  );
}

export function FilterGroups({ open }: { open: boolean }) {
  const filters = useUI((s) => s.filters);
  const { toggle, setMaxPrice, toggleOpenLate, toggleOpenNow, togglePureVeg, setMinRating, setPersonal, toggleClosed } = useUI.getState();
  const hasFood = filters.layers.some((l) => FOOD_CATEGORIES.includes(l));

  return (
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-5 pt-4">
              {(Object.keys(REGION_LABEL) as Region[]).map((r) => (
                <Group key={r} title={`Area · ${REGION_LABEL[r]}`}>
                  {zones
                    .filter((z) => z.region === r)
                    .map((z) => (
                      <Chip key={z.id} active={filters.zones.includes(z.id)} onClick={() => toggle("zones", z.id)}>
                        {z.name}
                      </Chip>
                    ))}
                </Group>
              ))}

              <Group title="My places">
                {(
                  [
                    ["saved", "Saved"],
                    ["visited", "Visited"],
                    ["unvisited", "Not visited yet"],
                  ] as const
                ).map(([id, label]) => (
                  <Chip key={id} active={filters.personal === id} onClick={() => setPersonal(filters.personal === id ? null : id)}>
                    {label}
                  </Chip>
                ))}
              </Group>

              <Group title="Near metro">
                {metroStations.map((m) => (
                  <Chip key={m} active={filters.metro.includes(m)} onClick={() => toggle("metro", m)}>
                    {m}
                  </Chip>
                ))}
              </Group>

              {hasFood && (
                <>
                  <Group title="Cuisine">
                    {CUISINES.map((c) => {
                      const CuisineIcon = CUISINE_ICON[c];
                      return (
                        <Chip key={c} active={filters.cuisines.includes(c)} onClick={() => toggle("cuisines", c)}>
                          <CuisineIcon size={16} weight="duotone" /> {CUISINE_LABEL[c]}
                        </Chip>
                      );
                    })}
                  </Group>
                  <Group title="Vibe">
                    {VIBES.map((v) => (
                      <Chip key={v} active={filters.vibes.includes(v)} onClick={() => toggle("vibes", v)}>
                        {VIBE_LABEL[v]}
                      </Chip>
                    ))}
                  </Group>
                  <Group title="Where it came from">
                    <Chip active={filters.sources.includes("new")} onClick={() => toggle("sources", "new")}>
                      Newer picks
                    </Chip>
                    <Chip active={filters.sources.includes("old")} onClick={() => toggle("sources", "old")}>
                      Older list
                    </Chip>
                    <Chip active={filters.sources.includes("curated")} onClick={() => toggle("sources", "curated")}>
                      Best-of picks
                    </Chip>
                  </Group>
                  <Group title="Diet · Price · Hours">
                    {DIETS.map((d) => (
                      <Chip key={d} active={filters.diets.includes(d)} onClick={() => toggle("diets", d)}>
                        {DIET_LABEL[d]}
                      </Chip>
                    ))}
                    <Chip active={filters.pureVeg} onClick={togglePureVeg}>
                      100% Pure Veg
                    </Chip>
                    {[1, 2, 3].map((p) => (
                      <Chip key={p} active={filters.maxPrice === p} onClick={() => setMaxPrice(filters.maxPrice === p ? null : p)}>
                        up to {PRICE(p)}
                      </Chip>
                    ))}
                    <Chip active={filters.openLate} onClick={toggleOpenLate}>
                      Open late
                    </Chip>
                    <Chip active={filters.openNow} onClick={toggleOpenNow}>
                      Open now
                    </Chip>
                    {[4, 4.3, 4.5].map((r) => (
                      <Chip key={r} active={filters.minRating === r} onClick={() => setMinRating(filters.minRating === r ? null : r)}>
                        {r}★ and up
                      </Chip>
                    ))}
                    <Chip active={filters.showClosed} onClick={toggleClosed}>
                      Show closed
                    </Chip>
                  </Group>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
  );
}
