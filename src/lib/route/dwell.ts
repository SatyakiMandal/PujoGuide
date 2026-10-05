import type { Place } from "../schema";

/** Base viewing & dining time spent at each kind of stop (minutes). */
export const DWELL_MIN: Record<Place["category"], number> = {
  pandal: 20,
  bonedi_bari: 25,
  cafe: 45,
  restaurant: 60,
  sweets: 15,
  street_food: 15,
};

/** Calculates total stop duration splitting base viewing time and queue delay buffer. */
export function placeDwellMin(p: Place, options?: { pujaNight?: boolean }): { viewing: number; queue: number; total: number } {
  const viewing = DWELL_MIN[p.category] ?? 20;
  let queue = 0;

  if (p.category === "pandal" || p.category === "bonedi_bari") {
    const crowd = p.crowd ?? "medium";
    queue = crowd === "extreme" ? 35 : crowd === "high" ? 20 : crowd === "medium" ? 10 : 5;
    if (options?.pujaNight && (crowd === "high" || crowd === "extreme")) {
      queue += 15;
    }
  }

  return { viewing, queue, total: viewing + queue };
}
