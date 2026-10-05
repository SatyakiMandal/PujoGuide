"use client";

import { PlaceIcon } from "@/lib/placeIcon";
import { AnimatePresence, motion } from "motion/react";
import { Check, Plus } from "@phosphor-icons/react";
import { CATEGORY_META } from "@/lib/categories";
import { zoneName } from "@/lib/data";
import type { Place } from "@/lib/schema";
import { useUI } from "@/store/ui";
import { Rating } from "./HoursCard";

export function PlaceList({ list }: { list: Place[] }) {
  const select = useUI((s) => s.select);

  if (list.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
        Nothing matches these filters. Try clearing a few.
      </div>
    );
  }
  return (
    <ul className="space-y-1.5">
      <AnimatePresence initial={false}>
        {list.map((p) => {
          const meta = CATEGORY_META[p.category];
          return (
            <motion.li
              key={p.id}
              layout="position"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="group flex items-center rounded-2xl border border-line/60 bg-surface p-1 transition-all hover:border-line hover:bg-surface2">
                <button
                  type="button"
                  onClick={() => select(p.slug)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2 text-left"
                >
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-2xl shadow-sm transition-transform group-hover:scale-105"
                    style={{ background: `var(${meta.cssVar})`, color: "var(--pin-fg)" }}
                  >
                    <PlaceIcon place={p} size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-medium leading-snug">
                      <span className="truncate">{p.name.en}</span>
                      {p.pureVeg && (
                        <span className="shrink-0 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          Veg
                        </span>
                      )}
                      {p.source === "curated" && (
                        <span className="shrink-0 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                          ★ Best-of
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2 truncate text-xs text-muted">
                      <span className="truncate">
                        {meta.label} · {zoneName.get(p.zones[0])}
                      </span>
                      <Rating rating={p.rating} count={p.ratingCount} className="shrink-0 text-xs text-fg" />
                    </span>
                  </span>
                </button>
                <AddButton slug={p.slug} name={p.name.en} />
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}

function AddButton({ slug, name }: { slug: string; name: string }) {
  const inRoute = useUI((s) => s.route.stops.includes(slug));
  return (
    <button
      type="button"
      aria-label={inRoute ? `Remove ${name} from route` : `Add ${name} to route`}
      aria-pressed={inRoute}
      onClick={() => (inRoute ? useUI.getState().removeStop(slug) : useUI.getState().addStop(slug))}
      className={`mr-1.5 grid size-10 shrink-0 place-items-center rounded-full border transition-all active:scale-90 ${
        inRoute ? "border-transparent bg-primary text-primary-fg" : "border-line bg-surface text-fg hover:bg-surface2"
      }`}
    >
      {inRoute ? <Check size={18} weight="bold" /> : <Plus size={18} weight="bold" />}
    </button>
  );
}
