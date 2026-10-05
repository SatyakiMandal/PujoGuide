import type { LngLat, Point } from "./types";

const R = 6371.0088;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(a: Point, b: Point): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Streets are never straight; Kolkata's grid and lanes land around 1.3–1.4× the crow-flies distance. */
export const ROAD_FACTOR = 1.35;
export const WALK_KMH = 4.5;

export const toLngLat = (p: Point): LngLat => [p.lng, p.lat];
