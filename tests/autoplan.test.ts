import { describe, expect, it } from "vitest";
import placesJson from "../src/data/places.json";
import { defaultRequest, planDay, planDays, scheduleOf, slugsOf, sightScore, type PlanRequest } from "../src/lib/autoplan";
import { ritualsOn } from "../src/lib/calendar";
import { placeSchema, isFood } from "../src/lib/schema";

const all = placesJson.map((p) => placeSchema.parse(p));
const by = new Map(all.map((p) => [p.slug, p]));
const req = (o: Partial<PlanRequest> = {}): PlanRequest => ({ ...defaultRequest("saptami"), ...o });

describe("planDay invariants", () => {
  const cases: [string, PlanRequest][] = [
    ["default evening", req()],
    ["south, couple, quiet", req({ regions: ["south"], group: "couple", interests: ["quiet", "photogenic", "date"] })],
    ["north heritage day with lunch", req({ regions: ["north"], start: 10 * 60, end: 19 * 60, interests: ["heritage"], meals: { lunch: true, snack: true, dinner: false, supper: false } })],
    ["salt lake, packed", req({ regions: ["saltlake"], pace: "packed" })],
    ["family on Ashtami", req({ day: "ashtami", group: "family", regions: ["central"] })],
    ["late night Navami", req({ day: "navami", start: 19 * 60, end: 26 * 60, meals: { lunch: false, snack: false, dinner: true, supper: true } })],
  ];

  it.each(cases)("%s", (_name, r) => {
    const it = planDay(all, r);
    expect(it.stopCount).toBeGreaterThan(0);
    const slugs = slugsOf(it);
    expect(new Set(slugs).size).toBe(slugs.length);
    let prevDepart = r.start;
    for (const item of it.items) {
      const p = by.get(item.slug)!;
      expect(p, item.slug).toBeDefined();
      expect(p.closed).toBeFalsy();
      expect(item.arrive).toBeGreaterThanOrEqual(prevDepart);
      expect(item.depart).toBeGreaterThan(item.arrive);
      expect(item.depart).toBeLessThanOrEqual(r.end + 15);
      if (r.regions.length && item.kind === "stop") expect(r.regions).toContain(p.region);
      if (item.kind === "meal") expect(isFood(p.category)).toBe(true);
      else expect(["bonedi_bari", "pandal"]).toContain(p.category);
      prevDepart = item.depart;
    }
  });

  it("is deterministic", () => {
    expect(slugsOf(planDay(all, req({ regions: ["south"] })))).toEqual(slugsOf(planDay(all, req({ regions: ["south"] }))));
  });

  it("keeps stops close together (no zig-zagging across the city)", () => {
    const it = planDay(all, req({ regions: ["north"] }));
    const stops = it.items.filter((i) => i.kind === "stop");
    for (const s of stops.slice(1)) expect(s.travel!.minutes).toBeLessThan(45);
  });

  it("places meals inside their windows and honours the toggles", () => {
    const it = planDay(all, req({ start: 11 * 60, end: 22 * 60 + 30, meals: { lunch: true, snack: false, dinner: true, supper: false } }));
    const meals = it.items.filter((i) => i.kind === "meal");
    expect(meals.map((m) => m.meal)).not.toContain("snack");
    const lunch = meals.find((m) => m.meal === "lunch");
    if (lunch) {
      expect(lunch.arrive).toBeGreaterThanOrEqual(12 * 60);
      expect(lunch.arrive).toBeLessThanOrEqual(14 * 60 + 50);
    }
    const dinner = meals.find((m) => m.meal === "dinner");
    expect(dinner).toBeDefined();
    expect(dinner!.arrive).toBeGreaterThanOrEqual(19 * 60 + 45);
  });

  it("respects budget and diet for meals", () => {
    const it = planDay(all, req({ budget: 1, diet: "veg", meals: { lunch: true, snack: true, dinner: true, supper: false }, start: 11 * 60, end: 22 * 60 }));
    for (const m of it.items.filter((i) => i.kind === "meal")) {
      const p = by.get(m.slug)!;
      if (p.priceLevel) expect(p.priceLevel).toBeLessThanOrEqual(1);
      if (p.diet) expect(p.diet).toContain("veg");
    }
  });

  it("avoids what you tell it to avoid", () => {
    const first = planDay(all, req({ regions: ["south"] }));
    const skip = slugsOf(first).filter((s) => !isFood(by.get(s)!.category));
    const second = planDay(all, req({ regions: ["south"], avoid: skip }));
    for (const s of slugsOf(second)) expect(skip).not.toContain(s);
  });

  it("returns an honest empty plan when nothing fits", () => {
    const it = planDay(all, req({ start: 3 * 60, end: 3 * 60 + 25, regions: ["behala" as never] }));
    expect(it.stopCount).toBe(0);
    expect(it.notes.length).toBeGreaterThan(0);
  });
});

describe("group-aware ranking", () => {
  it("ranks extreme-crowd pandals lower for elders and families", () => {
    const extreme = all.find((p) => p.category === "pandal" && p.crowd === "extreme")!;
    const friends = sightScore(extreme, req({ group: "friends" })).score;
    expect(sightScore(extreme, req({ group: "elders" })).score).toBeLessThan(friends);
    expect(sightScore(extreme, req({ group: "family" })).score).toBeLessThan(friends);
  });

  it("prefers calm places when 'quiet' is chosen", () => {
    const low = all.find((p) => p.category === "pandal" && p.crowd === "low")!;
    const extreme = all.find((p) => p.category === "pandal" && p.crowd === "extreme")!;
    const r = req({ interests: ["quiet"] });
    expect(sightScore(low, r).score).toBeGreaterThan(sightScore(extreme, r).score);
  });
});

describe("ritual timing", () => {
  it("holds a stop for Pushpanjali or Sandhi Puja when asked", () => {
    const it = planDay(all, req({ day: "ashtami", start: 8 * 60, end: 14 * 60, interests: ["rituals"], regions: ["north"], meals: { lunch: false, snack: false, dinner: false, supper: false } }));
    const held = it.items.find((i) => i.ritual);
    expect(held).toBeDefined();
    expect(held!.arrive).toBeLessThanOrEqual(held!.ritual!.start + 5);
    expect(held!.depart).toBeGreaterThanOrEqual(Math.min(held!.ritual!.end, held!.ritual!.start + 60) - 1);
    expect(it.notes.join(" ")).toMatch(/approximate/i);
  });

  it("says so when no ritual falls inside the window", () => {
    const it = planDay(all, req({ day: "saptami", start: 14 * 60, end: 17 * 60, interests: ["rituals"] }));
    expect(it.items.find((i) => i.ritual)).toBeUndefined();
    expect(ritualsOn("saptami").length).toBeGreaterThan(0);
  });
});

describe("planDays", () => {
  it("never repeats a place across days and varies the area", () => {
    const { days } = planDays(all, { ...defaultRequest(), regions: [] }, ["saptami", "ashtami", "navami"]);
    const seen = new Set<string>();
    for (const d of days) {
      for (const i of d.items) {
        expect(seen.has(i.slug)).toBe(false);
        seen.add(i.slug);
      }
    }
    const regions = days.map((d) => by.get(d.items.find((i) => i.kind === "stop")!.slug)!.region);
    expect(new Set(regions).size).toBeGreaterThan(1);
  });

  it("exposes a schedule keyed by slug", () => {
    const it = planDay(all, req({ regions: ["south"] }));
    const sched = scheduleOf(it);
    expect(Object.keys(sched).length).toBe(it.items.length);
  });
});
