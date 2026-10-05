/**
 * Turns the raw crawl dump (data/snapshot.raw.json, taken from Google Maps place pages) into the slim
 * data/snapshot.json that build-data merges. Records with no usable name (a failed load) are dropped and
 * listed so they can be re-crawled. Run: `npx tsx scripts/ingest-snapshot.ts [raw.json ...]`.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

type Raw = {
  q?: string;
  cn?: string;
  cd?: number;
  miss?: number;
  nm?: string;
  r?: number;
  c?: number;
  cl?: string;
  h?: string[];
  p?: string;
  img?: string;
  ll?: [number, number];
  t?: string;
};

const inputs = process.argv.slice(2);
if (inputs.length === 0) inputs.push("data/snapshot.raw.json");

const merged: Record<string, Raw> = {};
for (const file of inputs) Object.assign(merged, JSON.parse(readFileSync(file, "utf8")));

const out: Record<string, unknown> = existsSync("data/snapshot.json") ? JSON.parse(readFileSync("data/snapshot.json", "utf8")) : {};
out._at = new Date().toISOString().slice(0, 10);

// Places picked for "best of Kolkata" are not in places.json yet: their full crawl records go to a separate file.
const curatedSlugs = new Set<string>(existsSync("data/lists/curated.queue.json") ? JSON.parse(readFileSync("data/lists/curated.queue.json", "utf8")).map((x: string[]) => x[0]) : []);
const curated: Record<string, Raw> = {};

const failed: string[] = [];
let kept = 0;
for (const [slug, r] of Object.entries(merged)) {
  if (!r.nm && !r.miss) {
    failed.push(slug);
    continue;
  }
  if (curatedSlugs.has(slug)) {
    curated[slug] = r;
    continue;
  }
  const rec: Record<string, unknown> = {};
  if (r.nm) rec.nm = r.nm;
  if (r.cd !== undefined) rec.cd = r.cd;
  if (r.miss) rec.miss = 1;
  if (r.r) rec.r = r.r;
  if (r.c) rec.c = r.c;
  if (r.cl) rec.cl = r.cl;
  if (r.h && r.h.length === 7) rec.h = r.h;
  if (r.p) rec.p = r.p;
  if (r.img) rec.img = r.img;
  if (r.ll) rec.ll = r.ll;
  out[slug] = rec;
  kept++;
}

writeFileSync("data/lists/curated.crawl.json", JSON.stringify(curated, null, 1));
writeFileSync("data/snapshot.json", JSON.stringify(out, null, 0).replace(/},"/g, "},\n\""));
console.log(`${Object.keys(curated).length} curated records saved to data/lists/curated.crawl.json`);
console.log(`kept ${kept}, dropped ${failed.length} failed loads`);
if (failed.length) console.log("re-crawl:", failed.join(", "));
