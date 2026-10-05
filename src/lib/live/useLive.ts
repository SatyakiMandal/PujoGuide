"use client";

import { useEffect, useState } from "react";
import type { Place } from "../schema";
import { fetchGoogleLive, GMAPS_KEY, type LiveInfo } from "./google";

const memo = new Map<string, LiveInfo | null>();

/** What to show for a place: Google live data when a key is set, otherwise the baked-in snapshot. */
export type Shown = {
  rating?: number;
  ratingCount?: number;
  hours: Place["hours"];
  photo?: string;
  closed: boolean;
  /** "live" = fetched just now from Google; "snapshot" = from the data file; "none" = nothing known. */
  freshness: "live" | "snapshot" | "none";
  asOf?: string;
};

export function merge(place: Place, live: LiveInfo | null | undefined): Shown {
  const hasSnap = !!(place.rating || place.hours || place.photo);
  if (live) {
    return {
      rating: live.rating ?? place.rating,
      ratingCount: live.ratingCount ?? place.ratingCount,
      hours: live.hours ?? place.hours,
      photo: live.photo ?? place.photo,
      closed: live.status ? live.status.startsWith("CLOSED") : !!place.closed,
      freshness: "live",
      asOf: live.fetchedAt,
    };
  }
  return {
    rating: place.rating,
    ratingCount: place.ratingCount,
    hours: place.hours,
    photo: place.photo,
    closed: !!place.closed,
    freshness: hasSnap ? "snapshot" : "none",
    asOf: place.snapshotAt,
  };
}

export function useShown(place: Place): Shown {
  const [live, setLive] = useState<LiveInfo | null>(memo.get(place.slug) ?? null);
  useEffect(() => {
    if (!GMAPS_KEY || memo.has(place.slug)) return;
    let alive = true;
    fetchGoogleLive(place, GMAPS_KEY)
      .then((r) => {
        memo.set(place.slug, r);
        if (alive) setLive(r);
      })
      .catch(() => memo.set(place.slug, null));
    return () => {
      alive = false;
    };
  }, [place]);
  return merge(place, live);
}
