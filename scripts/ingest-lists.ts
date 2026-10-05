/**
 * Turns the user's two Google Maps lists (data/lists/*.raw.json) into data/lists/food.generated.json.
 *  - cleans names ("MQXT | European Cafe | ..." -> "MQXT"),
 *  - merges duplicates across/within lists (same place saved twice, or in both lists),
 *  - keeps multi-outlet chains separate and names them by area ("Marbella's (Elgin)"),
 *  - assigns neighbourhood + zone from coordinates, and suggested tags (see food-classify.ts).
 * Hand corrections go in data/food-overrides.json (slug -> any generated field).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { classify } from "../data/food-classify";
import { haversineKm } from "../src/lib/route/geo";

type Raw = { name: string; note: string; address: string; lat: number; lng: number };

/** Google's type labels for the 40 places of the new list, in list order (read from the list UI). */
const NEW_TYPES = [
  "Restaurant", "Bar", "Italian restaurant", "Cafe", "Chinese restaurant", "Bar", "Restaurant", "Coffee shop",
  "Cafe", "Cafe", "Restaurant", "Cafe", "Cafe", "Vegetarian restaurant", "Cafe", "Cultural landmark",
  "Restaurant", "Cafe", "Cafe", "4-star hotel", "Cafe", "Bar", "Cafe", "Cafe",
  "Momo restaurant", "Cafe", "Restaurant", "Cafe", "Coffee shop", "Dessert restaurant", "Restaurant", "Eclectic restaurant",
  "Cafe", "Restaurant", "Restaurant", "Cafe", "Dessert shop", "Cafe", "Bistro", "Pub",
];

/** Neighbourhood centres used to label a place and pick its zone. Nearest centre wins. */
const AREAS: { label: string; zone: string; lat: number; lng: number }[] = [
  { label: "Park Street", zone: "park_street", lat: 22.551, lng: 88.3525 },
  { label: "Elgin", zone: "bhowanipore", lat: 22.537, lng: 88.3515 },
  { label: "Esplanade", zone: "central", lat: 22.562, lng: 88.352 },
  { label: "BBD Bagh", zone: "central", lat: 22.57, lng: 88.345 },
  { label: "College Street", zone: "central", lat: 22.5745, lng: 88.364 },
  { label: "Park Circus", zone: "ballygunge", lat: 22.539, lng: 88.366 },
  { label: "Ballygunge", zone: "ballygunge", lat: 22.526, lng: 88.365 },
  { label: "Gariahat", zone: "ballygunge", lat: 22.5175, lng: 88.363 },
  { label: "Lake Market", zone: "kalighat", lat: 22.5155, lng: 88.3525 },
  { label: "Kalighat", zone: "kalighat", lat: 22.521, lng: 88.345 },
  { label: "Jodhpur Park", zone: "jadavpur", lat: 22.5045, lng: 88.3625 },
  { label: "Jadavpur", zone: "jadavpur", lat: 22.492, lng: 88.371 },
  { label: "Garia", zone: "south", lat: 22.464, lng: 88.38 },
  { label: "Salt Lake", zone: "salt_lake", lat: 22.59, lng: 88.408 },
  { label: "Sector V", zone: "salt_lake", lat: 22.572, lng: 88.433 },
  { label: "New Town", zone: "newtown", lat: 22.582, lng: 88.466 },
  { label: "Phoolbagan", zone: "central", lat: 22.574, lng: 88.397 },
  { label: "Topsia", zone: "central", lat: 22.5415, lng: 88.386 },
  { label: "Kasba", zone: "kasba", lat: 22.516, lng: 88.392 },
  { label: "Shyambazar", zone: "north", lat: 22.6015, lng: 88.374 },
  { label: "Shobhabazar", zone: "shobhabazar", lat: 22.597, lng: 88.367 },
  { label: "Lake Town", zone: "north", lat: 22.606, lng: 88.405 },
  { label: "Dum Dum", zone: "north", lat: 22.617, lng: 88.413 },
  { label: "Baguiati", zone: "north", lat: 22.617, lng: 88.43 },
  { label: "Madhyamgram", zone: "north", lat: 22.7, lng: 88.47 },
  { label: "Howrah", zone: "howrah", lat: 22.562, lng: 88.325 },
  { label: "Behala", zone: "south", lat: 22.498, lng: 88.318 },
];

const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/** Comparison key: accents stripped, so "Café" and "Cafe" are the same name. */
const key = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const firstToken = (s: string) => s.toLowerCase().match(/[a-z]{4,}/)?.[0] ?? "";

/** "MQXT | European Cafe | ..." -> "MQXT"; drops stray quotes. */
const cleanName = (n: string) => n.split(" | ")[0].replace(/\s*\|\s*$/, "").replace(/\\?"/g, "").trim();

const readJson = <T,>(p: string, fallback: T): T => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : fallback);

type Entry = {
  name: string;
  note: string;
  address: string;
  lat: number;
  lng: number;
  source: "new" | "old";
  typeHint?: string;
};

const entries: Entry[] = [
  ...readJson<Raw[]>("data/lists/new.raw.json", []).map((r, i) => ({ ...r, source: "new" as const, typeHint: NEW_TYPES[i] })),
  ...readJson<Raw[]>("data/lists/old.raw.json", []).map((r) => ({ ...r, source: "old" as const })),
].map((e) => ({ ...e, name: cleanName(e.name) }));

// ── merge duplicates ─────────────────────────────────────────────────────────
const merged: Entry[] = [];
const sameSpot = (a: Entry, b: Entry) => {
  const d = haversineKm(a, b);
  if (key(a.name) === key(b.name) && d < 0.12) return true;
  // Same pin saved under two names ("Craft coffee" / "Craft Coffee Experience Centre - Ballygunge").
  return d < 0.025 && firstToken(a.name) !== "" && firstToken(a.name) === firstToken(b.name);
};
let mergedCount = 0;
for (const e of entries) {
  const hit = merged.find((m) => sameSpot(m, e));
  if (!hit) {
    merged.push({ ...e });
    continue;
  }
  mergedCount++;
  if (e.source === "new") hit.source = "new"; // saved in the new list too: it is a current pick
  if (e.source === "new" && e.typeHint && !hit.typeHint) hit.typeHint = e.typeHint;
  if (e.source === "new" && e.name.length > hit.name.length) hit.name = e.name; // prefer the fuller (new-list) name
  hit.note ||= e.note;
  hit.address ||= e.address;
}

// ── label, zone, tags, slugs ────────────────────────────────────────────────
const nearestArea = (p: { lat: number; lng: number }) =>
  AREAS.map((a) => ({ a, d: haversineKm(p, a) })).sort((x, y) => x.d - y.d)[0].a;

const nameCount = new Map<string, number>();
for (const m of merged) nameCount.set(key(m.name), (nameCount.get(key(m.name)) ?? 0) + 1);

const overrides = readJson<Record<string, Record<string, unknown>>>("data/food-overrides.json", {});
const used = new Set<string>();

const out = merged.map((m) => {
  const area = nearestArea(m);
  // Several outlets of one chain: tell them apart by neighbourhood.
  const display = (nameCount.get(key(m.name)) ?? 0) > 1 ? `${m.name} (${area.label})` : m.name;
  let slug = slugify(display);
  for (let i = 2; used.has(slug); i++) slug = `${slugify(display)}-${i}`;
  used.add(slug);

  const tags = classify(m.name, m.typeHint);
  const base = {
    slug,
    name: display,
    category: tags.category,
    zones: [area.zone],
    area: slugify(area.label),
    areaLabel: area.label,
    lat: m.lat,
    lng: m.lng,
    source: m.source,
    address: m.address,
    note: m.note || undefined,
    cuisines: tags.cuisines,
    vibes: tags.vibes,
    diet: tags.diet,
    openLate: tags.openLate,
  };
  return { ...base, ...(overrides[slug] ?? {}) };
});

writeFileSync("data/lists/food.generated.json", "[\n" + out.map((o) => JSON.stringify(o)).join(",\n") + "\n]\n");

const by = <K extends string>(f: (o: (typeof out)[number]) => K) =>
  Object.entries(out.reduce<Record<string, number>>((acc, o) => ((acc[f(o)] = (acc[f(o)] ?? 0) + 1), acc), {}))
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}:${v}`)
    .join("  ");

console.log(`${entries.length} saved places -> ${out.length} unique (${mergedCount} duplicates merged)`);
console.log("source   ", by((o) => o.source));
console.log("category ", by((o) => o.category));
console.log("zone     ", by((o) => o.zones[0]));
console.log("no cuisine:", out.filter((o) => !o.cuisines.length).length, "of", out.length);
