import placesJson from "@/data/places.json";
import zonesJson from "@/data/zones.json";
import type { Place, Zone } from "./schema";

// Validated against the zod schemas when the data is built (scripts/build-data.ts) and again in tests, so the
// browser does not pay to re-parse several hundred places on every load.
export const places = placesJson as unknown as Place[];
export const zones = zonesJson as unknown as Zone[];
export const placeBySlug = new Map(places.map((p) => [p.slug, p]));
export const zoneName = new Map(zones.map((z) => [z.id, z.name]));

export const metroStations = [...new Set(places.flatMap((p) => p.metro))].sort();
