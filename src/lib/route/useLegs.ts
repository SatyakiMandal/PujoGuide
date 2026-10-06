"use client";

import { useEffect, useMemo } from "react";
import { placeBySlug } from "@/lib/data";
import { isFood, type Place } from "@/lib/schema";
import { useUI } from "@/store/ui";
import { placeDwellMin } from "./dwell";
import { legOptions, pickMode } from "./estimate";
import { fetchRouted } from "./osrm";
import type { LegOption, Mode } from "./types";

export const legKey = (a: string, b: string) => `${a}>${b}`;

export type Leg = {
  key: string;
  from: Place;
  to: Place;
  options: LegOption[];
  auto: Mode;
  chosen: Mode;
  option: LegOption;
  loading: boolean;
};

export { DWELL_MIN } from "./dwell";

export const routePlaces = (slugs: string[]) =>
  slugs.map((s) => placeBySlug.get(s)).filter((p): p is Place => !!p);

const requested = new Set<string>();

/** Mount once. Fetches road/foot geometry for any leg that doesn't have it yet. */
export function useLegLoader() {
  const stops = useUI((s) => s.route.stops);
  useEffect(() => {
    const places = routePlaces(stops);
    const { geom, setGeom } = useUI.getState();
    for (let i = 0; i < places.length - 1; i++) {
      const a = places[i];
      const b = places[i + 1];
      const key = legKey(a.slug, b.slug);
      const have = geom[key] ?? {};
      for (const profile of ["foot", "car"] as const) {
        const id = `${profile}:${key}`;
        if (have[profile] !== undefined || requested.has(id)) continue;
        requested.add(id);
        // undefined = not finished; null = finished but router unreachable, so estimates fall back.
        fetchRouted(profile, a, b).then((r) => setGeom(key, { [profile]: r }));
      }
    }
  }, [stops]);
}

export function useLegs(): Leg[] {
  const stops = useUI((s) => s.route.stops);
  const override = useUI((s) => s.route.override);
  const pujaNight = useUI((s) => s.route.pujaNight);
  const geom = useUI((s) => s.geom);

  return useMemo(() => {
    const places = routePlaces(stops);
    const legs: Leg[] = [];
    for (let i = 0; i < places.length - 1; i++) {
      const from = places[i];
      const to = places[i + 1];
      const key = legKey(from.slug, to.slug);
      const g = geom[key] ?? {};
      const options = legOptions(from, to, g, { pujaNight });
      const auto = pickMode(options);
      const wanted = override[key];
      const chosen = wanted && options.find((o) => o.mode === wanted)?.available ? wanted : auto;
      legs.push({
        key,
        from,
        to,
        options,
        auto,
        chosen,
        option: options.find((o) => o.mode === chosen)!,
        loading: g.foot === undefined || g.car === undefined,
      });
    }
    return legs;
  }, [stops, override, pujaNight, geom]);
}

export function summarise(legs: Leg[], places: Place[], options?: { pujaNight?: boolean }) {
  const travel = legs.reduce((s, l) => s + l.option.minutes, 0);
  const dwellDetails = places.map((p) => placeDwellMin(p, options));
  const dwell = dwellDetails.reduce((s, d) => s + d.total, 0);
  const totalQueue = dwellDetails.reduce((s, d) => s + d.queue, 0);
  const fareMin = legs.reduce((s, l) => s + (l.option.fare?.min ?? 0), 0);
  const fareMax = legs.reduce((s, l) => s + (l.option.fare?.max ?? 0), 0);
  const km = legs.reduce((s, l) => s + l.option.km, 0);
  return {
    travel,
    dwell,
    totalQueue,
    total: travel + dwell,
    fareMin,
    fareMax,
    km,
    foodStops: places.filter((p) => isFood(p.category)).length,
  };
}
