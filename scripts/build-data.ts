import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { areas, regionOf, rows, zones } from "../data/seed";
import { parseGoogleHours } from "../src/lib/hours";
import { haversineKm } from "../src/lib/route/geo";
import { placeSchema, zoneSchema, type Place } from "../src/lib/schema";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Offset (metres) from the anchor so places sharing a neighbourhood don't stack. Deterministic. */
const spread = (i: number) => {
  const ring = Math.floor(i / 6);
  const angle = ((i % 6) * 60 + ring * 30) * (Math.PI / 180);
  const r = 70 + ring * 70;
  return { dLat: (r * Math.cos(angle)) / 111_320, dLngM: r * Math.sin(angle) };
};

// Optional inputs. overrides = hand-verified coordinates; geocoded = name matches from OpenStreetMap.
const readJson = <T,>(path: string, fallback: T): T => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback);
const overrides = readJson<Record<string, { lat: number; lng: number }>>("data/overrides.json", {});
type Geo = { lat: number; lng: number; kind?: string } | null;
const geocodedRaw = readJson<Record<string, Geo>>("data/geocoded.json", {});
// Matches a human reviewed and found to be a different place (a hospital, a motel...). See review-geocode.ts.
const rejected = new Set(readJson<string[]>("data/geocode-rejects.json", []));

/**
 * Trust rules for name matches. Pandals are often named after a street or bus stop ("Dover Lane",
 * "Jadavpur 8B"), so those anchors are fine. A Bonedi Bari is a private house, so a road that merely
 * shares a family name is not good evidence. Rail and waterways are never right.
 */
function usable(geo: Geo, category: string, slug: string): boolean {
  if (!geo || rejected.has(slug)) return false;
  const kind = geo.kind ?? "";
  if (/^(railway|waterway):/.test(kind)) return false;
  if (category === "bonedi_bari" && /^highway:(?!bus_stop)/.test(kind)) return false;
  return true;
}

const used = new Set<string>();
const perArea = new Map<string, number>();

const places: Place[] = rows.map((row) => {
  const anchor = areas[row.area];
  if (!anchor) throw new Error(`Unknown area "${row.area}" for ${row.name}`);

  const slug = slugify(row.name);
  if (used.has(slug)) throw new Error(`Duplicate slug ${slug}`);
  used.add(slug);

  const i = perArea.get(row.area) ?? 0;
  perArea.set(row.area, i + 1);
  const { dLat, dLngM } = spread(i);
  const lngPerM = 1 / (111_320 * Math.cos((anchor.lat * Math.PI) / 180));

  const geo = usable(geocodedRaw[slug] ?? null, row.category, slug) ? geocodedRaw[slug] : null;
  const exact = overrides[slug] ?? geo;
  const confidence = overrides[slug] ? "verified" : geo ? "osm" : "area";

  return placeSchema.parse({
    id: slug,
    slug,
    category: row.category,
    name: { en: row.name },
    aliases: row.opts.aliases ?? [],
    zones: row.zones,
    region: regionOf(row.zones),
    area: row.area,
    lat: exact ? +exact.lat.toFixed(5) : +(anchor.lat + dLat).toFixed(5),
    lng: exact ? +exact.lng.toFixed(5) : +(anchor.lng + dLngM * lngPerM).toFixed(5),
    coordConfidence: confidence,
    metro: anchor.metro ?? [],
    tags: row.opts.tags ?? [],
    notes: row.opts.notes,
    needsReview: row.opts.review || undefined,
    ...row.food,
  });
});

// ── Foods from the user's Google Maps lists (see scripts/ingest-lists.ts) ──────────────────────────
type Generated = {
  slug: string; name: string; category: Place["category"]; zones: string[]; area: string;
  lat: number; lng: number; source: "new" | "old"; address?: string; note?: string;
  cuisines: Place["cuisines"]; vibes: Place["vibes"]; diet?: Place["diet"]; openLate?: boolean;
};
for (const g of readJson<Generated[]>("data/lists/food.generated.json", [])) {
  if (used.has(g.slug)) throw new Error(`Food slug clashes with an existing place: ${g.slug}`);
  used.add(g.slug);
  places.push(
    placeSchema.parse({
      id: g.slug,
      slug: g.slug,
      category: g.category,
      name: { en: g.name },
      aliases: [],
      zones: g.zones,
      region: regionOf(g.zones),
      area: g.area,
      lat: +g.lat.toFixed(5),
      lng: +g.lng.toFixed(5),
      coordConfidence: "verified", // an exact pin the user saved in Google Maps
      metro: [],
      tags: [],
      notes: g.note,
      address: g.address || undefined,
      cuisines: g.cuisines,
      vibes: g.vibes,
      diet: g.diet,
      openLate: g.openLate,
      source: g.source,
    }),
  );
}

// ── "Best of Kolkata" picks (data/lists/curated.json): found by research, pinned from Google Maps ──────
type Curated = {
  slug: string; name: string; category: Place["category"]; lat: number; lng: number; address?: string;
  cuisines: Place["cuisines"]; vibes: Place["vibes"]; tags?: string[]; priceLevel?: number; diet?: Place["diet"];
  openLate?: boolean; blurb: string; dishes?: string[]; tips?: Place["tips"]; aliases?: string[];
};
let curatedCount = 0;
for (const c of readJson<Curated[]>("data/lists/curated.json", [])) {
  if (used.has(c.slug)) throw new Error(`Curated slug clashes with an existing place: ${c.slug}`);
  used.add(c.slug);
  // Zone and area follow the nearest places we already know, so filters and plans treat the pick like its neighbours.
  const near = places
    .filter((p) => p.coordConfidence !== "area")
    .map((p) => ({ p, d: haversineKm(p, c) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 3);
  const tally = new Map<string, number>();
  for (const { p } of near) tally.set(p.zones[0], (tally.get(p.zones[0]) ?? 0) + 1);
  const zone = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
  places.push(
    placeSchema.parse({
      id: c.slug,
      slug: c.slug,
      category: c.category,
      name: { en: c.name },
      aliases: c.aliases ?? [],
      zones: [zone],
      region: regionOf([zone]),
      area: near[0].p.area,
      lat: +c.lat.toFixed(5),
      lng: +c.lng.toFixed(5),
      coordConfidence: "verified",
      metro: [],
      tags: c.tags ?? [],
      address: c.address,
      cuisines: c.cuisines,
      vibes: c.vibes,
      priceLevel: c.priceLevel,
      diet: c.diet,
      openLate: c.openLate,
      blurb: c.blurb,
      dishes: c.dishes,
      tips: c.tips,
      info: "researched",
      source: "curated",
    }),
  );
  curatedCount++;
}

// ── Research notes (data/research/*.json): tags, tips, prices, closures. Typos in a slug fail the build. ──
type Research = Partial<{
  tags: string[]; cuisines: Place["cuisines"]; vibes: Place["vibes"]; priceLevel: number; diet: Place["diet"];
  openLate: boolean; closed: boolean; dishes: string[]; tips: Place["tips"]; crowd: Place["crowd"]; blurb: string;
  info: Place["info"]; aliases: string[]; category: Place["category"];
  menu: Place["menu"]; menuSources: string[]; mustTry: Place["mustTry"]; pureVeg: boolean; checkedAt: string;
}>;
const researchFiles = existsSync("data/research") ? readdirSync("data/research").filter((f) => f.endsWith(".json")).sort() : [];
const bySlug = new Map(places.map((p) => [p.slug, p]));
let researched = 0;
for (const file of researchFiles) {
  const entries = readJson<Record<string, Research>>(`data/research/${file}`, {});
  for (const [slug, r] of Object.entries(entries)) {
    const p = bySlug.get(slug);
    if (!p) throw new Error(`data/research/${file}: unknown place "${slug}"`);
    const { tags, ...rest } = r;
    Object.assign(p, Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)));
    if (tags) p.tags = [...new Set([...p.tags, ...tags])];
    if (r.info === "researched") researched++;
  }
}

// ── Google Maps snapshot (data/snapshot.json): rating, hours, photo and closed flag ─────────────────
type Snap = { r?: number; c?: number; cl?: string; h?: string[]; img?: string; nm?: string; cd?: number; miss?: number };
const snapRaw = readJson<Record<string, Snap | string>>("data/snapshot.json", {});
const snapAt = typeof snapRaw._at === "string" ? snapRaw._at : undefined;
const STOP_WORDS = new Set(["cafe", "the", "and", "kolkata", "restaurant", "bar", "durga", "puja", "pujo", "of", "in"]);
const tokens = (t: string) => (t.toLowerCase().normalize("NFKD").match(/[a-z0-9]{2,}/g) ?? []).filter((w) => !STOP_WORDS.has(w));
const squash = (t: string) => tokens(t).join("");
let snapApplied = 0;
const snapRejected: string[] = [];
for (const [slug, v] of Object.entries(snapRaw)) {
  if (slug === "_at") continue;
  const s = v as Snap;
  const p = bySlug.get(slug);
  if (!p) throw new Error(`data/snapshot.json: unknown place ${slug}`);
  const names = [p.name.en, ...p.aliases].flatMap(tokens);
  // Same place if a word is shared, or one squashed name contains the other ("What's Up! Cafe" vs "WhatsUp Cafe").
  const mine = [p.name.en, ...p.aliases].map(squash).filter((x) => x.length >= 3);
  const theirs = s.nm ? squash(s.nm) : "";
  const same = !!s.nm && (tokens(s.nm).some((w) => names.includes(w)) || (theirs.length >= 3 && mine.some((m) => m.includes(theirs) || theirs.includes(m))));
  // Trusted only if Google's pin is within 150 m of ours and the names share a word (or it is within 40 m).
  const trusted = !s.miss && (s.cd === undefined || s.cd <= 150) && (same || (s.cd !== undefined && s.cd <= 40));
  if (!trusted) {
    snapRejected.push(`${slug} -> ${s.nm ?? "no match"}${s.cd !== undefined ? ` (${s.cd} m)` : ""}`);
    continue;
  }
  snapApplied++;
  p.snapshotAt = snapAt;
  if (s.r && s.r >= 1 && s.r <= 5) p.rating = s.r;
  if (s.c) p.ratingCount = s.c;
  if (s.img) p.photo = s.img.replace(/=w\d+-h\d+-k-no$/, "=w480-h320-k-no");
  if (s.h && s.h.length === 7) {
    const hours = parseGoogleHours(s.h);
    if (hours) {
      p.hours = hours;
      const food = p.category !== "bonedi_bari" && p.category !== "pandal";
      if (food && hours.some((d) => d?.some(([, e]) => e >= 1440 + 30))) p.openLate = true;
    }
  }
  if (s.cl === "P" || s.cl === "T") {
    p.closed = true;
    p.info ??= "inferred";
    p.tips = { ...p.tips, watch: s.cl === "P" ? "Google Maps lists this as permanently closed." : "Google Maps lists this as temporarily closed." };
  }
}

// ── Nearest metro stations for everyone, from the real (OSM) station positions ──────────────────────
const metroStations = (readJson<{ lines: { stations: { name: string; lat: number; lng: number }[] }[] }>("src/data/metro.json", { lines: [] }))
  .lines.flatMap((l) => l.stations);
const METRO_WALK_KM = 1.0;
for (const p of places) {
  const near = metroStations
    .map((s) => ({ name: s.name, d: haversineKm(p, s) }))
    .filter((s) => s.d <= METRO_WALK_KM)
    .sort((a, b) => a.d - b.d)
    .map((s) => s.name);
  p.metro = [...new Set([...p.metro, ...near])].slice(0, 3);
}

// ── Only operating places ship. Closed ones, and food places nobody could confirm, never reach the app. ──
// "Confirmed" = Google Maps snapshot matched this place (and didn't say closed) or a researcher confirmed it (checkedAt).
const dropped: { slug: string; name: string; reason: string }[] = [];
for (let i = places.length - 1; i >= 0; i--) {
  const p = places[i];
  const food = p.category !== "bonedi_bari" && p.category !== "pandal";
  const reason = p.closed ? "closed" : food && !p.snapshotAt && !p.checkedAt ? "unverified" : null;
  if (!reason) continue;
  dropped.push({ slug: p.slug, name: p.name.en, reason });
  places.splice(i, 1);
}
writeFileSync("data/removed-report.json", JSON.stringify(dropped.reverse(), null, 1));

// ── Several places can share one exact pin (same building): fan them out ~12 m so each is clickable ──
const stacks = new Map<string, Place[]>();
for (const p of places) {
  const k = `${p.lat},${p.lng}`;
  stacks.set(k, [...(stacks.get(k) ?? []), p]);
}
for (const group of stacks.values()) {
  if (group.length < 2) continue;
  group.forEach((p, i) => {
    const angle = (i / group.length) * 2 * Math.PI;
    p.lat = +(p.lat + (12 * Math.cos(angle)) / 111_320).toFixed(5);
    p.lng = +(p.lng + (12 * Math.sin(angle)) / (111_320 * Math.cos((p.lat * Math.PI) / 180))).toFixed(5);
  });
}

for (const z of zones) zoneSchema.parse(z);
for (const p of places) for (const z of p.zones) {
  if (!zones.some((x) => x.id === z)) throw new Error(`${p.name.en}: unknown zone ${z}`);
}

// Everything has been merged by now (seed, lists, research): re-validate so a bad enum or typo can't ship.
for (const p of places) placeSchema.parse(p);

mkdirSync("src/data", { recursive: true });
writeFileSync("src/data/places.json", JSON.stringify(places, null, 1));
writeFileSync("src/data/zones.json", JSON.stringify(zones, null, 1));

console.log(`${curatedCount} best-of picks added.`);
console.log(`Snapshot applied to ${snapApplied} places; ${snapRejected.length} rejected as a different place.`);
for (const r of snapRejected) console.log(`  - ${r}`);
console.log(`Research applied to ${researched} places from ${researchFiles.length} files.`);
const count = (c: string) => places.filter((p) => p.category === c).length;
console.log(
  `Wrote ${places.length} places: ${count("bonedi_bari")} bonedi baris, ${count("pandal")} pandals, ` +
    `(${places.filter((p) => p.coordConfidence === "osm").length} OSM-matched, ${places.filter((p) => p.coordConfidence === "verified").length} verified) ` +
    `${places.length - count("bonedi_bari") - count("pandal")} food. ` +
    `${places.filter((p) => p.needsReview).length} flagged needsReview.`,
);
