/**
 * Looks places up by name on OpenStreetMap (Nominatim) and caches matches in data/geocoded.json.
 * Free, but fair-use: max 1 request/second and an identifying User-Agent. Resumable: places
 * already in the cache are skipped; delete an entry to retry it.
 *
 * A hit is only accepted if it lands near the place's neighbourhood anchor, so a same-named
 * place elsewhere can't hijack a pin. Pandals are temporary and often won't be in OSM: those
 * stay at neighbourhood level ("area").
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { areas, rows } from "../data/seed";
import { haversineKm } from "../src/lib/route/geo";

const CACHE = "data/geocoded.json";
const MAX_KM = 2.5;
const UA = "PujoGuide/0.1 (personal Durga Puja map project; contact via repo owner)";

type Hit = { lat: number; lng: number; name: string; osm: string; kind: string } | null;
const cache: Record<string, Hit> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};

const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Results that are the *area* rather than a place.
const AREA_CLASSES = new Set(["boundary", "place"]);

async function search(q: string, anchor: { lat: number; lng: number }): Promise<Hit> {
  const d = 0.03;
  const url =
    "https://nominatim.openstreetmap.org/search?" +
    new URLSearchParams({
      q,
      format: "jsonv2",
      limit: "5",
      viewbox: `${anchor.lng - d},${anchor.lat + d},${anchor.lng + d},${anchor.lat - d}`,
      bounded: "1",
    });
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const list = (await res.json()) as {
    lat: string; lon: string; display_name: string; osm_type: string; osm_id: number; category?: string; class?: string; type: string;
  }[];
  for (const r of list) {
    if (AREA_CLASSES.has(r.category ?? r.class ?? "")) continue;
    const p = { lat: +r.lat, lng: +r.lon };
    if (haversineKm(p, anchor) > MAX_KM) continue;
    return { ...p, name: r.display_name.split(",")[0], osm: `${r.osm_type}/${r.osm_id}`, kind: `${r.category ?? r.class}:${r.type}` };
  }
  return null;
}

async function main() {
  let done = 0;
  let found = 0;
  for (const row of rows) {
    const slug = slugify(row.name);
    if (slug in cache) continue;
    const anchor = areas[row.area];
    // Distinct, ordered attempts: full name, then aliases, then name without generic suffixes.
    const stripped = row.name.replace(/\b(Sarbojanin|Sammilani|Sangha|Club|Association|Estate|Bari)\b/gi, "").replace(/\s+/g, " ").trim();
    const queries = [...new Set([row.name, ...(row.opts.aliases ?? []), stripped])].filter((q) => q.length > 3);

    let hit: Hit = null;
    for (const q of queries) {
      try {
        hit = await search(`${q}, Kolkata`, anchor);
      } catch (e) {
        console.error(`  ! ${q}: ${(e as Error).message}`);
      }
      await sleep(1100);
      if (hit) break;
    }
    cache[slug] = hit;
    writeFileSync(CACHE, JSON.stringify(cache, null, 1));
    done++;
    if (hit) found++;
    console.log(`${hit ? "✓" : "·"} ${row.name}${hit ? `  →  ${hit.name} (${hit.kind})` : ""}`);
  }
  const total = Object.values(cache).filter(Boolean).length;
  console.log(`\nLooked up ${done} new; ${found} matched. Cache now has ${total} matches / ${Object.keys(cache).length} places.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
