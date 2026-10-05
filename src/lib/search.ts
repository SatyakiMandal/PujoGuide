import MiniSearch from "minisearch";
import type { Place, Zone } from "./schema";

export function buildSearch(places: Place[], zones: Zone[]) {
  const zoneName = new Map(zones.map((z) => [z.id, z.name]));
  const index = new MiniSearch<Place & { zoneNames: string; nameEn: string; aliasText: string }>({
    fields: ["nameEn", "aliasText", "zoneNames", "area"],
    storeFields: ["id"],
    searchOptions: { prefix: true, fuzzy: 0.2, boost: { nameEn: 3, aliasText: 2 }, combineWith: "AND" },
  });
  index.addAll(
    places.map((p) => ({
      ...p,
      nameEn: p.name.en,
      aliasText: [...p.aliases, p.name.bn ?? ""].join(" "),
      zoneNames: p.zones.map((z) => zoneName.get(z) ?? z).join(" "),
      area: p.area.replace(/_/g, " "),
    })),
  );
  /** null = no active search (matches everything). */
  return (query: string): Set<string> | null => {
    const q = query.trim();
    if (!q) return null;
    return new Set(index.search(q).map((r) => r.id as string));
  };
}
