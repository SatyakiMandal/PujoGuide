import placesJson from "@/data/places.json";
import zonesJson from "@/data/zones.json";
import { placeSchema, zoneSchema, type Place, type Zone } from "./schema";

export const places: Place[] = placesJson.map((p) => placeSchema.parse(p));
export const zones: Zone[] = zonesJson.map((z) => zoneSchema.parse(z));
export const placeBySlug = new Map(places.map((p) => [p.slug, p]));
export const zoneName = new Map(zones.map((z) => [z.id, z.name]));

export const metroStations = [...new Set(places.flatMap((p) => p.metro))].sort();
