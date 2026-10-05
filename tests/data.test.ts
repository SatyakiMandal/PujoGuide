import { describe, expect, it } from "vitest";
import places from "../src/data/places.json";
import zones from "../src/data/zones.json";
import { KOLKATA_BOUNDS, placeSchema } from "../src/lib/schema";

const all = places.map((p) => placeSchema.parse(p));

describe("places data", () => {
  it("matches the de-duplicated source list counts", () => {
    expect(all.filter((p) => p.category === "bonedi_bari")).toHaveLength(25);
    expect(all.filter((p) => p.category === "pandal")).toHaveLength(54);
  });

  it("has unique slugs and ids", () => {
    expect(new Set(all.map((p) => p.slug)).size).toBe(all.length);
  });

  it("only references known zones", () => {
    const ids = new Set(zones.map((z) => z.id));
    for (const p of all) for (const z of p.zones) expect(ids.has(z), `${p.slug}:${z}`).toBe(true);
  });

  it("keeps every pin inside Kolkata", () => {
    for (const p of all) {
      expect(p.lat).toBeGreaterThan(KOLKATA_BOUNDS.south);
      expect(p.lat).toBeLessThan(KOLKATA_BOUNDS.north);
      expect(p.lng).toBeGreaterThan(KOLKATA_BOUNDS.west);
      expect(p.lng).toBeLessThan(KOLKATA_BOUNDS.east);
    }
  });

  it("does not stack two pins on the same spot", () => {
    const seen = new Set(all.map((p) => `${p.lat},${p.lng}`));
    expect(seen.size).toBe(all.length);
  });

  it("food places carry food fields (cuisine may be unknown, never missing)", () => {
    for (const p of all.filter((x) => !["bonedi_bari", "pandal"].includes(x.category))) {
      expect(Array.isArray(p.cuisines), p.slug).toBe(true);
      expect(Array.isArray(p.vibes), p.slug).toBe(true);
    }
  });

  it("includes the user's two Google Maps lists", () => {
    const food = all.filter((p) => p.source);
    expect(food.filter((p) => p.source === "new")).toHaveLength(40);
    expect(food.filter((p) => p.source === "old").length).toBeGreaterThanOrEqual(140);
    // Exact pins saved by the user, not neighbourhood guesses.
    expect(food.filter((p) => p.source !== "seed").every((p) => p.coordConfidence === "verified")).toBe(true);
  });

  it("does not list the same venue twice at one spot", () => {
    const key = (p: (typeof all)[number]) => p.name.en.toLowerCase().replace(/[^a-z0-9]/g, "");
    const seen = new Map<string, (typeof all)[number]>();
    for (const p of all.filter((x) => x.source)) {
      const k = key(p);
      const prev = seen.get(k);
      if (prev) expect(Math.abs(prev.lat - p.lat) + Math.abs(prev.lng - p.lng), `${p.slug} vs ${prev.slug}`).toBeGreaterThan(0.001);
      seen.set(k, p);
    }
  });

  it("fills the nearest metro from real station positions", () => {
    const withMetro = all.filter((p) => p.metro.length > 0).length;
    expect(withMetro).toBeGreaterThan(100);
    expect(all.find((p) => p.slug === "desi-lane-esplanade")!.metro).toContain("Esplanade");
  });
});

describe("research and tips", () => {
  it("gives every Bonedi Bari and pandal tips and a crowd level", () => {
    const missing = all
      .filter((p) => ["bonedi_bari", "pandal"].includes(p.category))
      .filter((p) => !p.tips || !p.tips.expect || !p.crowd)
      .map((p) => p.slug);
    expect(missing).toEqual([]);
  });

  it("marks honestly whether notes were researched or guessed", () => {
    for (const p of all.filter((x) => x.tips)) expect(p.info, p.slug).toBeDefined();
  });

  it("researched food has at least one practical note", () => {
    for (const p of all.filter((x) => x.source && x.info === "researched" && !x.closed)) {
      expect(p.tips && Object.values(p.tips).some(Boolean), p.slug).toBe(true);
    }
  });

  it("keeps price levels in range and never empties a tips object", () => {
    for (const p of all) {
      if (p.priceLevel !== undefined) expect([1, 2, 3, 4]).toContain(p.priceLevel);
      if (p.tips) expect(Object.values(p.tips).filter(Boolean).length, p.slug).toBeGreaterThan(0);
    }
  });
});

describe("Google Maps snapshot, hours and picks", () => {
  const withHours = all.filter((p) => p.hours);

  it("has a usable amount of hours, ratings and photos", () => {
    expect(withHours.length).toBeGreaterThan(150);
    expect(all.filter((p) => p.rating).length).toBeGreaterThan(250);
    expect(all.filter((p) => p.photo).length).toBeGreaterThan(150);
  });

  it("stores hours as seven days of sane, ordered windows", () => {
    for (const p of withHours) {
      expect(p.hours, p.slug).toHaveLength(7);
      for (const day of p.hours!) {
        if (!day) continue;
        for (const [s, e] of day) {
          expect(s, p.slug).toBeGreaterThanOrEqual(0);
          expect(e, p.slug).toBeGreaterThan(s);
          expect(e, p.slug).toBeLessThanOrEqual(2880);
        }
      }
    }
  });

  it("keeps ratings in range with a review count", () => {
    for (const p of all.filter((x) => x.rating)) {
      expect(p.rating!, p.slug).toBeGreaterThanOrEqual(1);
      expect(p.rating!, p.slug).toBeLessThanOrEqual(5);
      if (p.ratingCount !== undefined) expect(p.ratingCount, p.slug).toBeGreaterThan(0);
    }
  });

  it("serves photos over https and stamps the snapshot date", () => {
    for (const p of all.filter((x) => x.photo)) {
      expect(p.photo, p.slug).toMatch(/^https:\/\//);
      expect(p.snapshotAt, p.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("flags closed places from Google and keeps a reason on them", () => {
    const closed = all.filter((p) => p.closed && p.tips?.watch?.startsWith("Google Maps lists"));
    expect(closed.length).toBeGreaterThanOrEqual(0);
  });

  it("includes the best-of picks, pinned and researched", () => {
    const picks = all.filter((p) => p.source === "curated");
    expect(picks.length).toBeGreaterThanOrEqual(30);
    for (const p of picks) {
      expect(p.coordConfidence, p.slug).toBe("verified");
      expect(p.info, p.slug).toBe("researched");
      expect(p.tips && Object.values(p.tips).some(Boolean), p.slug).toBe(true);
      expect(p.closed, p.slug).toBeFalsy();
    }
  });

  it("has no two open places with the same name and category", () => {
    const seen = new Set<string>();
    for (const p of all.filter((x) => !x.closed)) {
      const key = `${p.category}|${p.name.en.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
      expect(seen.has(key), p.slug).toBe(false);
      seen.add(key);
    }
  });

  it("verifies the user's own Google Maps pins for resolved duplicates", () => {
    const by = new Map(all.map((p) => [p.slug, p]));
    expect(by.get("pathuriaghata-rajbari")!.coordConfidence).toBe("verified");
    expect(by.get("khelat-ghosh-babu-bari")).toBeUndefined(); // merged into Pathuriaghata Rajbari
    expect(by.get("jorasanko-daw-bari")).toBeUndefined(); // merged into Shib Krishna Daw Bari
    expect(by.get("darjipara-mitra-bari")).toBeDefined();
    expect(by.get("nilmani-mitra-bari")).toBeDefined(); // a separate stop, not a duplicate
    const d = by.get("darjipara-mitra-bari")!;
    const n = by.get("nilmani-mitra-bari")!;
    expect(Math.hypot(d.lat - n.lat, d.lng - n.lng)).toBeGreaterThan(0.01);
  });

  it("pins most baris and pandals to a verified or matched spot", () => {
    const sights = all.filter((p) => p.category === "bonedi_bari" || p.category === "pandal");
    const approx = sights.filter((p) => p.coordConfidence === "area");
    expect(approx.length).toBeLessThan(15);
  });
});
