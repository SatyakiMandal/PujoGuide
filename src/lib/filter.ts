import { openAt } from "./hours";
import { isFood, type Category, type Cuisine, type Diet, type Place, type Source, type Vibe } from "./schema";

export type Personal = "saved" | "visited" | "unvisited";
export type Mine = { saved: Set<string>; visited: Set<string> };
/** Kolkata weekday (Monday = 0) and minutes since midnight. */
export type Clock = { weekday: number; minute: number };

export type FilterState = {
  /** Which kinds of place exist on the map at all. */
  layers: Category[];
  zones: string[];
  metro: string[];
  cuisines: Cuisine[];
  vibes: Vibe[];
  diets: Diet[];
  /** Which list a food place came from. Empty = all. */
  sources: Source[];
  /** Max price level (1–4); null = any. */
  maxPrice: number | null;
  openLate: boolean;
  /** Hide places whose listed hours say they are closed right now. Unknown hours never hide a place. */
  openNow: boolean;
  /** Minimum Google rating (e.g. 4). Unrated places are never hidden. */
  minRating: number | null;
  /** Only places you saved / visited / have not visited yet. */
  personal: Personal | null;
  /** Include places the web says have closed. */
  showClosed: boolean;
};

export const defaultFilters: FilterState = {
  layers: ["bonedi_bari", "pandal"],
  zones: [],
  metro: [],
  cuisines: [],
  vibes: [],
  diets: [],
  sources: [],
  maxPrice: null,
  openLate: false,
  openNow: false,
  minRating: null,
  personal: null,
  showClosed: false,
};

const anyOf = <T,>(wanted: T[], have: T[] | undefined) =>
  wanted.length === 0 || (have ?? []).some((h) => wanted.includes(h));

/** Facets within one group are OR; groups are AND. Food facets only constrain food places. */
function passesFacets(p: Place, f: FilterState, mine?: Mine, now?: Clock): boolean {
  if (f.zones.length && !p.zones.some((z) => f.zones.includes(z))) return false;
  if (f.metro.length && !p.metro.some((m) => f.metro.includes(m))) return false;
  if (f.personal && mine) {
    if (f.personal === "saved" && !mine.saved.has(p.slug)) return false;
    if (f.personal === "visited" && !mine.visited.has(p.slug)) return false;
    if (f.personal === "unvisited" && mine.visited.has(p.slug)) return false;
  }
  if (f.openNow && now && p.hours && !openAt(p, now.weekday, now.minute).open) return false;
  if (f.minRating !== null && p.rating !== undefined && p.rating < f.minRating) return false;
  if (!isFood(p.category)) return true;
  if (!anyOf(f.cuisines, p.cuisines)) return false;
  if (!anyOf(f.vibes, p.vibes)) return false;
  // Diet and price are often unknown for places from the user's lists; unknown never hides a place.
  if (p.diet && !anyOf(f.diets, p.diet)) return false;
  if (f.sources.length && !(p.source && f.sources.includes(p.source))) return false;
  if (f.maxPrice !== null && p.priceLevel !== undefined && p.priceLevel > f.maxPrice) return false;
  if (f.openLate && !p.openLate) return false;
  return true;
}

/**
 * visible = on the map (layer is on). matched = also passes every active facet and the search.
 * Highlight mode renders visible places and dims the unmatched; Filter mode renders only matched.
 */
export function applyFilters(places: Place[], f: FilterState, searchIds: Set<string> | null, mine?: Mine, now?: Clock) {
  const visible = places.filter((p) => f.layers.includes(p.category) && (f.showClosed || !p.closed));
  const matched = new Set(
    visible
      .filter((p) => passesFacets(p, f, mine, now) && (searchIds === null || searchIds.has(p.id)))
      .map((p) => p.id),
  );
  return { visible, matched };
}

export const activeFacetCount = (f: FilterState) =>
  f.zones.length +
  f.metro.length +
  f.cuisines.length +
  f.vibes.length +
  f.diets.length +
  f.sources.length +
  (f.maxPrice !== null ? 1 : 0) +
  (f.openLate ? 1 : 0) +
  (f.openNow ? 1 : 0) +
  (f.minRating !== null ? 1 : 0) +
  (f.personal ? 1 : 0) +
  (f.showClosed ? 1 : 0);
