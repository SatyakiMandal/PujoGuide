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

import { isFood, type Place } from "../schema";

/** Finds food places near leg endpoints or midpoint, excluding already-added stops. */
export function findNearbyFood(from: Point, to: Point, allPlaces: Place[], excludeSlugs: string[], maxKm = 0.7): Place[] {
  const midPoint = { lat: (from.lat + to.lat) / 2, lng: (from.lng + to.lng) / 2 };
  const foodOnly = allPlaces.filter((p) => isFood(p.category) && !excludeSlugs.includes(p.slug) && !p.closed);

  return foodOnly
    .map((p) => {
      const distFrom = haversineKm(from, p);
      const distTo = haversineKm(to, p);
      const distMid = haversineKm(midPoint, p);
      const minDist = Math.min(distFrom, distTo, distMid);
      return { place: p, dist: minDist };
    })
    .filter((item) => item.dist <= maxKm)
    .sort((a, b) => a.dist - b.dist)
    .map((item) => item.place);
}
