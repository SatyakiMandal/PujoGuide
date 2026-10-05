import type { Hours, Place } from "../schema";

/**
 * Live ratings, hours and photos from Google Places API (New). It needs a key (and billing), so it stays
 * dormant until NEXT_PUBLIC_GMAPS_KEY is set. Until then the app shows the Google Maps snapshot in
 * data/snapshot.json. Restrict the key to your Vercel domain in Google Cloud.
 */
export const GMAPS_KEY = process.env.NEXT_PUBLIC_GMAPS_KEY ?? "";

export type LiveInfo = {
  rating?: number;
  ratingCount?: number;
  hours?: Hours;
  photo?: string;
  /** Google's own business status, e.g. CLOSED_PERMANENTLY. */
  status?: string;
  source: "google";
  fetchedAt: string;
};

type Clock = { day: number; hour?: number; minute?: number };
type Period = { open?: Clock; close?: Clock };

/** Google periods use Sunday = 0 and list each window once. Convert to Monday-first minute windows. */
export function periodsToHours(periods: Period[] | undefined): Hours | undefined {
  if (!periods || periods.length === 0) return undefined;
  const out: Hours = Array.from({ length: 7 }, () => null);
  // One period that opens and never closes means open around the clock.
  if (periods.length === 1 && !periods[0].close) return out.map(() => [[0, 1440]] as [number, number][]);
  for (const p of periods) {
    if (!p.open || !p.close) continue;
    const day = (p.open.day + 6) % 7;
    const start = (p.open.hour ?? 0) * 60 + (p.open.minute ?? 0);
    let end = (p.close.hour ?? 0) * 60 + (p.close.minute ?? 0);
    if (p.close.day !== p.open.day || end <= start) end += 1440;
    out[day] = [...(out[day] ?? []), [start, end]];
  }
  return out;
}

type GooglePlace = {
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  regularOpeningHours?: { periods?: Period[] };
  photos?: { name: string }[];
};

export async function fetchGoogleLive(
  place: Pick<Place, "name" | "lat" | "lng">,
  key: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LiveInfo | null> {
  if (!key) return null;
  const res = await fetchImpl("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "places.displayName,places.rating,places.userRatingCount,places.businessStatus,places.regularOpeningHours.periods,places.photos.name",
    },
    body: JSON.stringify({
      textQuery: `${place.name.en} Kolkata`,
      maxResultCount: 1,
      locationBias: { circle: { center: { latitude: place.lat, longitude: place.lng }, radius: 400 } },
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { places?: GooglePlace[] };
  const g = data.places?.[0];
  if (!g) return null;
  const photoName = g.photos?.[0]?.name;
  return {
    rating: g.rating,
    ratingCount: g.userRatingCount,
    hours: periodsToHours(g.regularOpeningHours?.periods),
    photo: photoName ? `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=640&key=${key}` : undefined,
    status: g.businessStatus,
    source: "google",
    fetchedAt: new Date().toISOString(),
  };
}
