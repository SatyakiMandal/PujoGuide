import { describe, expect, it } from "vitest";
import { legOptions, pickMode } from "../src/lib/route/estimate";
import { haversineKm } from "../src/lib/route/geo";
import { metroTrip } from "../src/lib/route/metroRoute";
import { optimiseOrder } from "../src/lib/route/optimise";
import type { Step } from "../src/lib/route/types";

// Real station positions (from OSM) used as test points.
const GIRISH_PARK = { lat: 22.58677, lng: 88.36288 };
const KALIGHAT = { lat: 22.51673, lng: 88.34581 };
const ESPLANADE = { lat: 22.56364, lng: 88.35117 };
const SECTOR_V = { lat: 22.58094, lng: 88.42902 };
const SATYAJIT_ROY = { lat: 22.48466, lng: 88.39268 }; // Orange Line
const JOKA = { lat: 22.45237, lng: 88.30185 }; // Purple Line, no link to Blue

const rides = (steps: Step[] = []) => steps.filter((s) => s.kind === "ride");

describe("metroTrip", () => {
  it("Girish Park → Kalighat is 10 stops on the Blue Line", () => {
    const t = metroTrip(GIRISH_PARK, KALIGHAT)!;
    expect(t.available).toBe(true);
    const r = rides(t.steps);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ line: "Blue Line", stops: 10 });
    expect(t.fare!.min).toBeGreaterThan(0);
  });

  it("Esplanade → Sector V rides the Green Line", () => {
    const t = metroTrip(ESPLANADE, SECTOR_V)!;
    expect(rides(t.steps).some((s) => s.kind === "ride" && s.line === "Green Line")).toBe(true);
  });

  it("transfers at Kavi Subhash to reach the Orange Line from the north", () => {
    const t = metroTrip(GIRISH_PARK, SATYAJIT_ROY)!;
    expect(t.steps!.some((s) => s.kind === "transfer" && s.at === "Kavi Subhash")).toBe(true);
    expect(rides(t.steps)).toHaveLength(2);
  });

  it("returns null when an end is far from any station", () => {
    expect(metroTrip({ lat: 22.7, lng: 88.2 }, KALIGHAT)).toBeNull();
  });

  it("does not connect lines that don't connect (Joka is Purple only)", () => {
    expect(metroTrip(JOKA, GIRISH_PARK)).toBeNull();
  });
});

describe("legOptions + pickMode", () => {
  const opts = { pujaNight: true };

  it("returns all five modes even with no router geometry (straight-line fallback)", () => {
    const o = legOptions(GIRISH_PARK, KALIGHAT, {}, opts);
    expect(o.map((x) => x.mode)).toEqual(["walk", "metro", "auto", "cab", "bike"]);
    expect(o.find((x) => x.mode === "auto")!.approx).toBe(true);
  });

  it("puja-night traffic makes road legs slower and cabs dearer", () => {
    const normal = legOptions(GIRISH_PARK, KALIGHAT, {}, { pujaNight: false });
    const night = legOptions(GIRISH_PARK, KALIGHAT, {}, opts);
    const pick = (l: typeof night, m: string) => l.find((x) => x.mode === m)!;
    expect(pick(night, "auto").minutes).toBeGreaterThan(pick(normal, "auto").minutes);
    expect(pick(night, "cab").fare!.max).toBeGreaterThan(pick(normal, "cab").fare!.max);
  });

  it("walks a short hop, but not a 9 km trip", () => {
    const near = { lat: GIRISH_PARK.lat + 0.004, lng: GIRISH_PARK.lng };
    expect(pickMode(legOptions(GIRISH_PARK, near, {}, opts))).toBe("walk");
    expect(pickMode(legOptions(GIRISH_PARK, KALIGHAT, {}, opts))).not.toBe("walk");
  });

  it("prefers the metro on a long north-south hop", () => {
    expect(pickMode(legOptions(GIRISH_PARK, KALIGHAT, {}, opts))).toBe("metro");
  });
});

describe("optimiseOrder", () => {
  const pts = [
    { lat: 22.5, lng: 88.3 },
    { lat: 22.9, lng: 88.3 },
    { lat: 22.55, lng: 88.3 },
    { lat: 22.8, lng: 88.3 },
    { lat: 22.6, lng: 88.3 },
  ];
  const len = (o: number[]) => o.slice(1).reduce((s, v, i) => s + haversineKm(pts[o[i]], pts[v]), 0);

  it("keeps the first stop and returns a permutation", () => {
    const o = optimiseOrder(pts);
    expect(o[0]).toBe(0);
    expect([...o].sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it("never lengthens the route, and fixes a zig-zag", () => {
    const given = [0, 1, 2, 3, 4];
    const o = optimiseOrder(pts);
    expect(len(o)).toBeLessThanOrEqual(len(given));
    expect(o).toEqual([0, 2, 4, 3, 1]);
  });

  it("leaves 1–3 stops alone", () => {
    expect(optimiseOrder(pts.slice(0, 3))).toEqual([0, 1, 2]);
  });
});
