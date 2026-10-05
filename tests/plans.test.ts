import { describe, expect, it } from "vitest";
import placesJson from "../src/data/places.json";
import { haversineKm } from "../src/lib/route/geo";
import { optimiseOrder } from "../src/lib/route/optimise";
import { placeSchema } from "../src/lib/schema";
import { PLANS, PUJA_DAYS, planById } from "../src/lib/plans";

const all = placesJson.map((p) => placeSchema.parse(p));
const bySlug = new Map(all.map((p) => [p.slug, p]));

describe("plans", () => {
  it("only reference places that exist", () => {
    for (const p of PLANS) for (const s of p.stops) expect(bySlug.has(s), `${p.id}: ${s}`).toBe(true);
  });

  it("have unique ids and no repeated stop inside a plan", () => {
    expect(new Set(PLANS.map((p) => p.id)).size).toBe(PLANS.length);
    for (const p of PLANS) expect(new Set(p.stops).size, p.id).toBe(p.stops.length);
  });

  it("area plans cover every Bonedi Bari and every pandal", () => {
    const covered = new Set(PLANS.filter((p) => p.group === "area").flatMap((p) => p.stops));
    const missing = all.filter((p) => ["bonedi_bari", "pandal"].includes(p.category) && !covered.has(p.slug));
    expect(missing.map((m) => m.slug)).toEqual([]);
  });

  it("offers area plans for every region and a spread of interests", () => {
    const tags = new Set(PLANS.map((p) => p.tag));
    for (const t of ["North Kolkata", "Central Kolkata", "South Kolkata", "Salt Lake", "Bonedi Baris", "Picturesque", "Less crowded", "Date night"]) {
      expect(tags.has(t), t).toBe(true);
    }
  });

  it("the day-by-day guide only points at real plans", () => {
    expect(PUJA_DAYS).toHaveLength(5);
    for (const d of PUJA_DAYS) for (const id of d.plans) expect(planById.has(id), id).toBe(true);
  });

  it("stop order is not wildly worse than an optimised order (catches silly sequences)", () => {
    const len = (pts: { lat: number; lng: number }[], order: number[]) =>
      order.slice(1).reduce((s, v, i) => s + haversineKm(pts[order[i]], pts[v]), 0);
    for (const plan of PLANS) {
      const pts = plan.stops.map((s) => bySlug.get(s)!);
      if (pts.length < 4) continue;
      const authored = len(pts, pts.map((_, i) => i));
      // Same rule as scripts/order-plans.ts: a closing meal stop stays last.
      const isFood = (i: number) => !["bonedi_bari", "pandal"].includes(pts[i].category);
      const keepLast = isFood(pts.length - 1) && !isFood(0);
      const body = keepLast ? pts.slice(0, -1) : pts;
      const order = optimiseOrder(body);
      const bestOrder = keepLast ? [...order, pts.length - 1] : order;
      const best = len(pts, bestOrder);
      expect(authored, `${plan.id}: ${authored.toFixed(1)} km vs ${best.toFixed(1)} km`).toBeLessThanOrEqual(best * 1.5 + 0.5);
    }
  });
});

describe("plans and closures", () => {
  it("never send you to a place Google lists as closed", () => {
    for (const plan of PLANS) for (const s of plan.stops) expect(bySlug.get(s)?.closed, `${plan.id}:${s}`).toBeFalsy();
  });
});
