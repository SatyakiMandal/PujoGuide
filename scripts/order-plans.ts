/**
 * Re-sequences each plan in src/lib/plans.ts with the route optimiser, keeping the first stop
 * and a closing meal stop in place. Run after adding or editing plans: `npm run plans`.
 * It rewrites only the `stops: [...]` arrays.
 */
import { readFileSync, writeFileSync } from "node:fs";
import places from "../src/data/places.json";
import { haversineKm } from "../src/lib/route/geo";
import { optimiseOrder } from "../src/lib/route/optimise";
import { PLANS } from "../src/lib/plans";

const by = new Map(places.map((p) => [p.slug, p]));
const isFood = (slug: string) => !["bonedi_bari", "pandal"].includes(by.get(slug)!.category);
const len = (slugs: string[]) =>
  slugs.slice(1).reduce((s, v, i) => s + haversineKm(by.get(slugs[i])!, by.get(v)!), 0);

let text = readFileSync("src/lib/plans.ts", "utf8");
for (const plan of PLANS) {
  const stops = plan.stops;
  const last = stops[stops.length - 1];
  const keepLast = stops.length > 3 && isFood(last) && !isFood(stops[0]) ? last : null;
  const body = keepLast ? stops.slice(0, -1) : stops;
  const order = optimiseOrder(body.map((s) => by.get(s)!));
  const next = [...order.map((i) => body[i]), ...(keepLast ? [keepLast] : [])];

  const before = len(stops);
  const after = len(next);
  if (after < before - 0.01) {
    const re = new RegExp(String.raw`(id: "${plan.id}"[\s\S]*?stops: )\[[\s\S]*?\]`);
    text = text.replace(re, `$1[\n${next.map((s) => `      "${s}",`).join("\n")}\n    ]`);
  }
  console.log(`${plan.id.padEnd(34)} ${before.toFixed(1).padStart(5)} -> ${after.toFixed(1).padStart(5)} km`);
}
writeFileSync("src/lib/plans.ts", text);
