import { FARE, TRAFFIC, WAIT_MIN, WALK_CROWD } from "./fares";
import { haversineKm, ROAD_FACTOR, toLngLat, WALK_KMH } from "./geo";
import { metroTrip } from "./metroRoute";
import type { LegOption, Mode, Point, RouteOptions, Routed } from "./types";

export type LegGeometry = { foot?: Routed | null; car?: Routed | null };

const round1 = (n: number) => Math.round(n * 10) / 10;
const rupees = (n: number) => Math.round(n / 5) * 5;

/** Straight-line stand-in when the router is unreachable. Flagged `approx`. */
function fallback(from: Point, to: Point, kmh: number): Routed {
  const km = haversineKm(from, to) * ROAD_FACTOR;
  return { km, minutes: (km / kmh) * 60, path: [toLngLat(from), toLngLat(to)], approx: true };
}

export function legOptions(from: Point, to: Point, geom: LegGeometry, o: RouteOptions): LegOption[] {
  const foot = geom.foot ?? fallback(from, to, WALK_KMH);
  const car = geom.car ?? fallback(from, to, 25);
  const traffic = o.pujaNight ? TRAFFIC.pujaNight : TRAFFIC.normal;

  const walk: LegOption = {
    mode: "walk",
    available: true,
    minutes: Math.round(foot.minutes * (o.pujaNight ? WALK_CROWD.pujaNight : WALK_CROWD.normal)),
    km: round1(foot.km),
    fare: { min: 0, max: 0 },
    path: foot.path,
    approx: foot.approx,
    note: foot.minutes > 40 ? "A long walk. Consider a ride for part of it." : undefined,
  };

  const road = (mode: "auto" | "cab" | "bike"): LegOption => {
    const f = FARE[mode];
    const est = f.base + f.perKm * car.km;
    const surge = mode === "cab" && o.pujaNight ? FARE.cabSurge[1] : 1;
    return {
      mode,
      available: true,
      minutes: Math.round(car.minutes * traffic + WAIT_MIN[mode]),
      km: round1(car.km),
      fare: { min: rupees(est * (1 - FARE.spread)), max: rupees(est * (1 + FARE.spread) * surge) },
      path: car.path,
      approx: car.approx,
    };
  };

  const metro = metroTrip(from, to) ?? {
    mode: "metro" as const,
    available: false,
    minutes: 0,
    km: 0,
    fare: null,
    path: [],
    approx: true,
    note: "No metro station within walking distance of both ends.",
  };

  return [walk, metro, road("auto"), road("cab"), road("bike")];
}

/** Cheap-and-quick wins: walk short hops, otherwise lowest (minutes + rupees/10), with a tiredness penalty on long walks. */
export function pickMode(options: LegOption[]): Mode {
  let best: { mode: Mode; score: number } | null = null;
  for (const o of options) {
    if (!o.available) continue;
    const fare = o.fare ? (o.fare.min + o.fare.max) / 2 : 0;
    let score = o.minutes + fare / 10;
    if (o.mode === "walk" && o.minutes > 20) score += (o.minutes - 20) * 1.5;
    if (o.mode === "walk" && o.minutes <= 14) score -= 10;
    if (!best || score < best.score) best = { mode: o.mode, score };
  }
  return best?.mode ?? "walk";
}
