/**
 * Builds src/data/metro.json from OpenStreetMap (Overpass). One-off; commit the output.
 * Data © OpenStreetMap contributors, ODbL. The map UI already credits OSM.
 * Re-run before Puja if lines open: `npm run metro`.
 */
import { writeFileSync } from "node:fs";

// One direction per line is enough: stops are ordered, ways give the track.
const RELATIONS = [
  { id: 8034180, line: "blue", name: "Blue Line", color: "#1f5bd6" },
  { id: 11720071, line: "green", name: "Green Line", color: "#1e9d4b" },
  { id: 15068961, line: "purple", name: "Purple Line", color: "#7b3fa0" },
  { id: 17320237, line: "orange", name: "Orange Line", color: "#f47421" },
  { id: 19508978, line: "yellow", name: "Yellow Line", color: "#d9a900" },
];

type Member = {
  type: "node" | "way";
  role: string;
  lat?: number;
  lon?: number;
  geometry?: { lat: number; lon: number }[];
  ref: number;
};

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

/** The public servers are shared and flaky (504s), so retry across mirrors with backoff. */
async function overpass(query: string) {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 6; attempt++) {
    const url = ENDPOINTS[attempt % ENDPOINTS.length];
    try {
      const res = await fetch(url, {
        method: "POST",
        body: "data=" + encodeURIComponent(query),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "PujoGuide/0.1 (personal Durga Puja map project)",
          Accept: "application/json",
        },
      });
      if (res.ok) return await res.json();
      lastErr = new Error(`${url} -> ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
  throw lastErr;
}

const clean = (n: string) => n.replace(/\s*\(.*?\)\s*/g, "").replace(/\s+/g, " ").trim();
const r5 = (n: number) => +n.toFixed(5);

async function main() {
const lines = [];
for (const rel of RELATIONS) {
  const j = await overpass(`[out:json][timeout:90];relation(${rel.id});out geom;`);
  const members: Member[] = j.elements[0].members;

  const stations = members
    .filter((m) => m.type === "node" && m.role.startsWith("stop") && m.lat !== undefined)
    .map((m, i) => ({ order: i, lat: r5(m.lat!), lng: r5(m.lon!), ref: m.ref }));

  // Names live on the nodes themselves.
  const nodes = await overpass(
    `[out:json][timeout:90];node(id:${stations.map((s) => s.ref).join(",")});out tags;`,
  );
  const nameOf = new Map<number, string>(
    nodes.elements.map((e: { id: number; tags?: Record<string, string> }) => [e.id, e.tags?.name ?? ""]),
  );

  const segments = members
    .filter((m) => m.type === "way" && m.geometry?.length)
    .map((m) => m.geometry!.map((p) => [r5(p.lon), r5(p.lat)]));

  lines.push({
    id: rel.line,
    name: rel.name,
    color: rel.color,
    stations: stations.map((s) => ({ name: clean(nameOf.get(s.ref) || `Station ${s.order + 1}`), lat: s.lat, lng: s.lng })),
    segments,
  });
  console.log(rel.name, stations.length, "stops,", segments.length, "track segments");
  await new Promise((r) => setTimeout(r, 1500)); // be polite to the public server
}

writeFileSync(
  "src/data/metro.json",
  JSON.stringify({ source: "OpenStreetMap contributors (ODbL), via Overpass", fetched: new Date().toISOString().slice(0, 10), lines }),
);
console.log("Wrote src/data/metro.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
