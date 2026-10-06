"use client";

import {
  DotsSixVertical,
  MagnifyingGlass,
  Plus,
  Shuffle,
  Trash,
  X,
} from "@phosphor-icons/react";
import { AnimatePresence, Reorder, useDragControls, motion } from "motion/react";
import { useMemo, useState } from "react";
import { CATEGORY_META } from "@/lib/categories";
import { placeBySlug, places } from "@/lib/data";
import { PlaceIcon } from "@/lib/placeIcon";
import { optimiseOrder } from "@/lib/route/optimise";
import { routePlaces } from "@/lib/route/useLegs";
import type { Place } from "@/lib/schema";
import { useUI } from "@/store/ui";
import { clsx } from "clsx";

export function EditRouteModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const stops = useUI((s) => s.route.stops);
  const { setStops, removeStop, addStop, clearRoute } = useUI.getState();
  const routePlacesList = useMemo(() => routePlaces(stops), [stops]);

  const [addQuery, setAddQuery] = useState("");

  const searchResults = useMemo(() => {
    if (!addQuery.trim()) return [];
    const q = addQuery.toLowerCase();
    return places
      .filter(
        (p) =>
          !stops.includes(p.slug) &&
          !p.closed &&
          (p.name.en.toLowerCase().includes(q) ||
            p.aliases.some((a) => a.toLowerCase().includes(q)) ||
            p.zones.some((z) => z.toLowerCase().includes(q))),
      )
      .slice(0, 5);
  }, [addQuery, stops]);

  if (!open) return null;

  const optimise = () => {
    const order = optimiseOrder(routePlacesList);
    setStops(order.map((i) => routePlacesList[i].slug));
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          role="dialog"
          aria-label="Edit Route Stops"
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
          className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-line bg-bg p-5 shadow-float space-y-4"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <h3 className="font-display text-lg font-bold">Edit &amp; Customise Route</h3>
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface2"
            >
              <X size={18} weight="bold" />
            </button>
          </div>

          {/* Quick Search & Add Stop */}
          <div className="space-y-2">
            <label className="relative block">
              <MagnifyingGlass size={18} weight="bold" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={addQuery}
                onChange={(e) => setAddQuery(e.target.value)}
                placeholder="Search a pandal or food spot to add…"
                className="h-11 w-full rounded-2xl border border-line bg-surface pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>

            {searchResults.length > 0 && (
              <div className="space-y-1 rounded-2xl border border-line bg-surface p-2 shadow-xs">
                {searchResults.map((p) => {
                  const meta = CATEGORY_META[p.category];
                  return (
                    <div key={p.slug} className="flex items-center justify-between gap-2 rounded-xl p-2 hover:bg-surface2 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="grid size-7 shrink-0 place-items-center rounded-full"
                          style={{ background: `var(${meta.cssVar})`, color: "var(--pin-fg)" }}
                        >
                          <PlaceIcon place={p} size={15} />
                        </span>
                        <span className="font-medium truncate">{p.name.en}</span>
                      </div>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          addStop(p.slug);
                          setAddQuery("");
                        }}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1 font-semibold text-primary-fg"
                      >
                        <Plus size={14} weight="bold" /> Add
                      </motion.button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Drag & Reorder List */}
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Reorder Stops ({stops.length})
            </span>
            <Reorder.Group axis="y" values={stops} onReorder={setStops} className="space-y-1.5">
              {routePlacesList.map((p, i) => (
                <EditStopRow key={p.slug} place={p} index={i} onRemove={() => removeStop(p.slug)} />
              ))}
            </Reorder.Group>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-line">
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              disabled={stops.length < 4}
              onClick={optimise}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-line bg-surface px-4 text-xs font-semibold disabled:opacity-40"
            >
              <Shuffle size={16} weight="bold" /> Optimise Route Order
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                clearRoute();
                onClose();
              }}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-line bg-surface px-4 text-xs font-semibold text-primary"
            >
              <Trash size={16} weight="bold" /> Clear All
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function EditStopRow({
  place,
  index,
  onRemove,
}: {
  place: Place;
  index: number;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  const meta = CATEGORY_META[place.category];

  return (
    <Reorder.Item
      value={place.slug}
      dragListener={false}
      dragControls={controls}
      className="list-none"
      whileDrag={{ scale: 1.02, zIndex: 20 }}
    >
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-2 text-xs">
        <button
          type="button"
          aria-label={`Drag to reorder ${place.name.en}`}
          onPointerDown={(e) => controls.start(e)}
          className="grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-muted active:cursor-grabbing"
        >
          <DotsSixVertical size={18} weight="bold" />
        </button>
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-fg text-[11px] font-bold text-bg">
          {index + 1}
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className="grid size-7 shrink-0 place-items-center rounded-full"
            style={{ background: `var(${meta.cssVar})`, color: "var(--pin-fg)" }}
          >
            <PlaceIcon place={place} size={15} />
          </span>
          <span className="truncate font-medium">{place.name.en}</span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-surface2 hover:text-primary"
        >
          <X size={15} weight="bold" />
        </button>
      </div>
    </Reorder.Item>
  );
}
