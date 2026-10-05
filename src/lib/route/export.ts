import type { Place } from "@/lib/schema";
import type { Mode } from "./types";

/** Maps URLs allow an origin, a destination and up to 9 waypoints. */
const MAX_POINTS = 11;

/** Pins at "area" confidence aren't the real spot, so let Google resolve the name instead. */
const target = (p: Place) =>
  p.coordConfidence === "area" ? `${p.name.en}, Kolkata` : `${p.lat},${p.lng}`;

/**
 * Free Google Maps deep links (no API key). Longer plans are split into overlapping parts so
 * each part ends where the next begins.
 */
export function googleMapsLinks(places: Place[], travelmode?: "walking" | "driving"): string[] {
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
    if (travelmode) q.set("travelmode", travelmode);
    const mid = part.slice(1, -1).map(target);
    if (mid.length) q.set("waypoints", mid.join("|"));
    links.push(`https://www.google.com/maps/dir/?${q}`);
  }
  return links;
}

export const shareUrl = (origin: string, slugs: string[]) => `${origin}/?route=${slugs.join(",")}`;

import { isFood } from "../schema";

/** Formats a clean WhatsApp/text shareable summary of the itinerary with link. */
export function formattedShareText(origin: string, places: Place[]): string {
  if (places.length === 0) return "";
  const lines = places.map((p, i) => `${i + 1}. ${p.name.en}${isFood(p.category) ? " 🍽️" : ""}`);
  const url = shareUrl(origin, places.map((p) => p.slug));
  return `🪔 My Pujo 2026 Plan (${places.length} stops):\n${lines.join("\n")}\n\nOpen route on PujoGuide:\n${url}`;
}

/** Google's travelmode names. Transit can't carry waypoints, so it's only used for single legs. */
const TRAVEL_MODE: Record<Mode, string> = { walk: "walking", metro: "transit", auto: "driving", cab: "driving", bike: "two-wheeler" };

/** One leg in Google Maps, opened in the mode you chose (metro opens the transit view). */
export function legLink(from: Place, to: Place, mode: Mode): string {
  const q = new URLSearchParams({ api: "1", origin: target(from), destination: target(to), travelmode: TRAVEL_MODE[mode] });
  return `https://www.google.com/maps/dir/?${q}`;
}

/** If nearly every leg is a walk, the whole-route link can say so; otherwise leave the mode to Google. */
export function wholeRouteMode(modes: Mode[]): "walking" | undefined {
  return modes.length > 0 && modes.filter((m) => m === "walk").length / modes.length >= 0.8 ? "walking" : undefined;
}
