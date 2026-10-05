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
              <div className="flex items-center rounded-xl transition-colors hover:bg-surface2">
                <button
                  type="button"
                  onClick={() => select(p.slug)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2.5 text-left"
                >
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-full"
                    style={{ background: `var(${meta.cssVar})`, color: "var(--pin-fg)" }}
                  >
                    <PlaceIcon place={p} size={20} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{p.name.en}</span>
                    <span className="flex items-center gap-2 truncate text-sm text-muted">
                      <span className="truncate">
                        {meta.label} · {zoneName.get(p.zones[0])}
                        {p.source === "old" && " · older list"}
                        {p.source === "curated" && " · best-of pick"}
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
