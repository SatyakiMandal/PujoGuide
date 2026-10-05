import { describe, expect, it } from "vitest";
import places from "../src/data/places.json";
import { applyFilters, defaultFilters } from "../src/lib/filter";
import { placeSchema } from "../src/lib/schema";

const all = places.map((p) => placeSchema.parse(p));
const run = (patch = {}, ids: Set<string> | null = null) =>
  applyFilters(all, { ...defaultFilters, ...patch }, ids);

describe("applyFilters", () => {
  it("shows only the active layers (baris + pandals by default, no food)", () => {
    const { visible } = run();
    expect(visible).toHaveLength(79);
    expect(visible.every((p) => ["bonedi_bari", "pandal"].includes(p.category))).toBe(true);
  });

  it("matches everything when no facet is active", () => {
    const { visible, matched } = run();
    expect(matched.size).toBe(visible.length);
  });

  it("zone filter keeps multi-zone places in both zones (Deshapriya Park: Kalighat + South)", () => {
    const k = run({ zones: ["kalighat"] }).matched;
    const s = run({ zones: ["south"] }).matched;
    expect(k.has("deshapriya-park")).toBe(true);
    expect(s.has("deshapriya-park")).toBe(true);
  });

  it("OR within a facet, AND across facets", () => {
    const either = run({ zones: ["kalighat", "kasba"] }).matched.size;
    const kal = run({ zones: ["kalighat"] }).matched.size;
    expect(either).toBeGreaterThan(kal);
    const both = run({ zones: ["kalighat"], layers: ["bonedi_bari"] }).matched.size;
    expect(both).toBe(0);
  });

  it("food facets constrain food only and leave pandals untouched", () => {
    const { matched, visible } = run({
      layers: ["pandal", "restaurant"],
      cuisines: ["bengali"],
    });
    const pandals = visible.filter((p) => p.category === "pandal");
    expect(pandals.every((p) => matched.has(p.id))).toBe(true);
    const nonBengali = visible.find((p) => p.category === "restaurant" && !p.cuisines?.includes("bengali"));
    expect(nonBengali && matched.has(nonBengali.id)).toBe(false);
  });

  it("search ids intersect with facets", () => {
    const { matched } = run({}, new Set(["singhi-park"]));
    expect([...matched]).toEqual(["singhi-park"]);
  });

  it("price cap and open-late narrow food", () => {
    const cheap = run({ layers: ["restaurant"], maxPrice: 1 }).matched;
    for (const id of cheap) {
      const price = all.find((p) => p.id === id)!.priceLevel;
      expect(price === undefined || price <= 1).toBe(true);
    }
    const late = run({ layers: ["restaurant"], openLate: true }).matched;
    expect(late.size).toBeGreaterThan(0);
    for (const id of late) expect(all.find((p) => p.id === id)!.openLate).toBe(true);
  });

  it("unknown price or diet never hides a place", () => {
    const unknown = all.find((p) => p.category === "restaurant" && p.diet === undefined && p.priceLevel === undefined)!;
    expect(unknown).toBeDefined();
    expect(run({ layers: ["restaurant"], diets: ["veg"] }).matched.has(unknown.id)).toBe(true);
    expect(run({ layers: ["restaurant"], maxPrice: 1 }).matched.has(unknown.id)).toBe(true);
  });

  it("source filter separates the newer picks from the older list", () => {
    const newer = run({ layers: ["cafe", "restaurant", "sweets", "street_food"], sources: ["new"], showClosed: true }).matched;
    const older = run({ layers: ["cafe", "restaurant", "sweets", "street_food"], sources: ["old"], showClosed: true }).matched;
    expect(newer.size).toBe(40);
    expect(older.size).toBe(202);
    for (const id of newer) expect(older.has(id)).toBe(false);
  });
});

describe("closed places", () => {
  it("are hidden unless asked for", () => {
    const layers = ["cafe", "restaurant", "sweets", "street_food"] as const;
    const hidden = applyFilters(all, { ...defaultFilters, layers: [...layers] }, null).visible;
    const shown = applyFilters(all, { ...defaultFilters, layers: [...layers], showClosed: true }, null).visible;
    const closed = all.filter((p) => p.closed);
    expect(closed.length).toBeGreaterThan(0);
    expect(shown.length - hidden.length).toBe(closed.length);
    expect(hidden.some((p) => p.closed)).toBe(false);
  });
});
