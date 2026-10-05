// Prints each OSM match with its type and distance from the neighbourhood anchor, for eyeballing.
import { readFileSync } from "node:fs";
import { areas, rows } from "../data/seed";
import { haversineKm } from "../src/lib/route/geo";

const g = JSON.parse(readFileSync("data/geocoded.json", "utf8")) as Record<string, { lat: number; lng: number; name: string; kind: string } | null>;
const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

for (const r of rows) {
  const h = g[slugify(r.name)];
  if (!h) continue;
  const d = haversineKm(h, areas[r.area]);
  console.log(`${r.category.padEnd(11)} ${r.name.padEnd(42)} → ${h.name.padEnd(30)} ${h.kind.padEnd(26)} ${d.toFixed(2)} km`);
}
