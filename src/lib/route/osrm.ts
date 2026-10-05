import type { LngLat, Point, Routed } from "./types";

/**
 * Public OSRM instances run by FOSSGIS (the ones openstreetmap.org's directions use).
 * Free, key-less, CORS-enabled, fair-use only. Fine for a personal planner; for real traffic
 * self-host OSRM/Valhalla or switch to a paid router behind this one function.
 */
const BASE = "https://routing.openstreetmap.de";
const PROFILE = { foot: "routed-foot/route/v1/foot", car: "routed-car/route/v1/driving" } as const;

const cache = new Map<string, Promise<Routed | null>>();

/** The public server answers 429 to bursts, so start requests at most every GAP_MS, two at a time. */
const GAP_MS = 350;
const MAX_PARALLEL = 2;
let active = 0;
let nextStart = 0;
const waiting: (() => void)[] = [];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_PARALLEL) await new Promise<void>((r) => waiting.push(r));
  active++;
  try {
    const wait = Math.max(0, nextStart - Date.now());
    nextStart = Math.max(nextStart, Date.now()) + GAP_MS;
    if (wait) await sleep(wait);
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

async function request(profile: keyof typeof PROFILE, a: Point, b: Point): Promise<Routed | null> {
  const url = `${BASE}/${PROFILE[profile]}/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(9000) });
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("Retry-After"));
        await sleep((retryAfter > 0 ? retryAfter * 1000 : 800) * (attempt + 1));
        continue;
      }
      if (!res.ok) return null;
      const j = await res.json();
      const r = j.routes?.[0];
      if (j.code !== "Ok" || !r) return null;
      return { km: r.distance / 1000, minutes: r.duration / 60, path: r.geometry.coordinates as LngLat[], approx: false };
    } catch {
      return null;
    }
  }
  return null;
}

export function fetchRouted(profile: keyof typeof PROFILE, a: Point, b: Point): Promise<Routed | null> {
  const key = `${profile}:${a.lat},${a.lng}>${b.lat},${b.lng}`;
  let p = cache.get(key);
  if (!p) {
    p = slot(() => request(profile, a, b));
    cache.set(key, p);
    // Don't cache failures: let the next change retry.
    p.then((r) => r === null && cache.delete(key));
  }
  return p;
}
