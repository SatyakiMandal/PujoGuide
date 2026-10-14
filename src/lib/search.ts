import MiniSearch from "minisearch";
import { CATEGORY_META, CUISINE_LABEL, DIET_LABEL, VIBE_LABEL } from "./categories";
import type { Place, Zone } from "./schema";

export function buildSearch(places: Place[], zones: Zone[]) {
  const zoneName = new Map(zones.map((z) => [z.id, z.name]));
  const index = new MiniSearch<
    Place & {
      zoneNames: string;
      nameEn: string;
      aliasText: string;
      categoryText: string;
      attrText: string;
      dishText: string;
    }
  >({
    fields: ["nameEn", "aliasText", "zoneNames", "area", "categoryText", "attrText", "dishText"],
    storeFields: ["id"],
    searchOptions: {
      prefix: true,
      // 0.2 of a word's length rounds up to a whole letter of edit-distance slack (e.g. 1 of "sex"'s
      // 3 letters, or 1 of "boobs"'s 5), which lets a short query fuzzy-match any similar-length word
      // elsewhere in the data ("sex" -> "sen"/"six"/"sea", "boobs" -> "bombs") essentially at random.
      // Only forgive typos once there's enough word that one edit stays a small fraction of it.
      fuzzy: (term) => (term.length > 5 ? 0.2 : 0),
      boost: { nameEn: 3, aliasText: 2, categoryText: 1.5 },
      combineWith: "AND",
    },
  });
  index.addAll(
    places.map((p) => {
      // Lets "Bonedi Bari", "Pure Veg", "Rooftop", etc. find places by attribute, not just by name/area.
      const attrText = [
        ...(p.cuisines ?? []).map((c) => CUISINE_LABEL[c]),
        ...(p.vibes ?? []).map((v) => VIBE_LABEL[v]),
        ...(p.diet ?? []).map((d) => DIET_LABEL[d]),
        // "Non-veg" tokenizes to "non"+"veg", so a one-word "nonveg" query (how people often type it,
        // especially on mobile) wouldn't prefix-match either half. Add the unspaced form explicitly.
        p.diet?.includes("nonveg") ? "nonveg" : "",
        p.pureVeg ? "pure veg" : "",
        ...p.tags.map((t) => t.replace(/_/g, " ")),
      ].join(" ");
      // Lets "chicken", "biryani", "rolls", etc. find places by what's actually on the menu.
      const dishText = [
        ...(p.dishes ?? []),
        ...(p.mustTry?.veg ?? []),
        ...(p.mustTry?.nonveg ?? []),
        ...(p.mustTry?.drinks ?? []),
        ...(p.menu ?? []).map((m) => m.name),
      ].join(" ");
      return {
        ...p,
        nameEn: p.name.en,
        aliasText: [...p.aliases, p.name.bn ?? ""].join(" "),
        zoneNames: p.zones.map((z) => zoneName.get(z) ?? z).join(" "),
        area: p.area.replace(/_/g, " "),
        categoryText: CATEGORY_META[p.category].plural,
        attrText,
        dishText,
      };
    }),
  );
  /** null = no active search (matches everything). */
  return (query: string): Set<string> | null => {
    const q = query.trim();
    if (!q) return null;
    return new Set(index.search(q).map((r) => r.id as string));
  };
}
