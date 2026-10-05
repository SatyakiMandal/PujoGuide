/**
 * ROUGH ESTIMATES, not real prices. No public API gives live auto/cab fares, so these are
 * simple distance models. Tune them against what you actually pay, and open the ride-hailing
 * apps for real quotes. Rupees.
 */
export const FARE = {
  auto: { base: 30, perKm: 13 },
  cab: { base: 60, perKm: 16 },
  bike: { base: 25, perKm: 8 },
  /** Fare range = estimate × [1 - spread, 1 + spread]. */
  spread: 0.2,
  /** Cab surge multiplier range on a Puja night. */
  cabSurge: [1.15, 1.6] as [number, number],
} as const;

/**
 * Kolkata Metro fares are distance slabs. These slabs are APPROXIMATE: verify against the
 * current official fare table before relying on them. [maxKm, rupees]
 */
export const METRO_FARE_SLABS: [number, number][] = [
  [2, 5],
  [5, 10],
  [10, 15],
  [20, 25],
  [Infinity, 30],
];

/** Pickup wait (minutes) before a road ride starts. */
export const WAIT_MIN = { auto: 4, cab: 6, bike: 4, metro: 5 } as const;

/** Road speeds from the OSRM car profile are free-flow; real city traffic is slower. */
export const TRAFFIC = { normal: 1.5, pujaNight: 2.1 } as const;
export const WALK_CROWD = { normal: 1, pujaNight: 1.2 } as const;
