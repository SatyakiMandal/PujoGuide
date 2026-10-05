import type { Place } from "../schema";

/** Typical time spent at each kind of stop (minutes). Rough; the point is a realistic total. */
export const DWELL_MIN: Record<Place["category"], number> = {
  pandal: 25,
  bonedi_bari: 30,
  cafe: 45,
  restaurant: 60,
  sweets: 15,
  street_food: 15,
};
