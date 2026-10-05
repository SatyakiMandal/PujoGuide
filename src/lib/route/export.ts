import type { Place } from "@/lib/schema";

/** Maps URLs allow an origin, a destination and up to 9 waypoints. */
const MAX_POINTS = 11;

/** Pins at "area" confidence aren't the real spot, so let Google resolve the name instead. */
const target = (p: Place) =>
  p.coordConfidence === "area" ? `${p.name.en}, Kolkata` : `${p.lat},${p.lng}`;

/**
 * Free Google Maps deep links (no API key). Longer plans are split into overlapping parts so
 * each part ends where the next begins.
 */
export function googleMapsLinks(places: Place[]): string[] {
  if (places.length < 2) return [];
  const links: string[] = [];
  for (let start = 0; start < places.length - 1; start += MAX_POINTS - 1) {
    const part = places.slice(start, start + MAX_POINTS);
    if (part.length < 2) break;
    const q = new URLSearchParams({
      api: "1",
      origin: target(part[0]),
      destination: target(part[part.length - 1]),
    });
    const mid = part.slice(1, -1).map(target);
    if (mid.length) q.set("waypoints", mid.join("|"));
    links.push(`https://www.google.com/maps/dir/?${q}`);
  }
  return links;
}

export const shareUrl = (origin: string, slugs: string[]) => `${origin}/?route=${slugs.join(",")}`;
