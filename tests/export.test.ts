import { describe, expect, it } from "vitest";
import placesJson from "../src/data/places.json";
import { googleMapsLinks, legLink, shareUrl, wholeRouteMode } from "../src/lib/route/export";
import { placeSchema } from "../src/lib/schema";

const all = placesJson.map((p) => placeSchema.parse(p));

describe("googleMapsLinks", () => {
  const take = (n: number) => all.slice(0, n);

  it("needs at least two stops", () => {
    expect(googleMapsLinks(take(1))).toEqual([]);
  });

  it("uses origin, destination and waypoints, with names for approximate pins", () => {
    const approx = all.filter((p) => p.coordConfidence === "area").slice(0, 4);
    expect(approx).toHaveLength(4);
    const [url] = googleMapsLinks(approx);
    const q = new URL(url).searchParams;
    expect(q.get("origin")).toBe(`${approx[0].name.en}, Kolkata`);
    expect(q.get("destination")).toBe(`${approx[3].name.en}, Kolkata`);
    expect(q.get("waypoints")!.split("|")).toHaveLength(2);
  });

  it("uses exact coordinates for verified pins", () => {
    const verified = all.filter((p) => p.coordConfidence === "verified").slice(0, 3);
    const [url] = googleMapsLinks(verified);
    const q = new URL(url).searchParams;
    expect(q.get("origin")).toMatch(/^-?\d+\.\d+,-?\d+\.\d+$/);
  });

  it("splits long plans into overlapping parts of at most 11 points", () => {
    const links = googleMapsLinks(take(23));
    expect(links).toHaveLength(3);
    const dest = (u: string) => new URL(u).searchParams.get("destination");
    const orig = (u: string) => new URL(u).searchParams.get("origin");
    expect(dest(links[0])).toBe(orig(links[1]));
    expect(dest(links[1])).toBe(orig(links[2]));
    for (const l of links) {
      const q = new URL(l).searchParams;
      expect((q.get("waypoints")?.split("|").length ?? 0) + 2).toBeLessThanOrEqual(11);
    }
  });
});

describe("shareUrl", () => {
  it("encodes the stops as a comma list", () => {
    expect(shareUrl("https://x.test", ["a", "b"])).toBe("https://x.test/?route=a,b");
  });
});

describe("leg links and travel mode", () => {
  it("opens a single leg in the chosen mode", () => {
    const [a, b] = all.filter((p) => p.coordConfidence === "verified");
    expect(new URL(legLink(a, b, "metro")).searchParams.get("travelmode")).toBe("transit");
    expect(new URL(legLink(a, b, "walk")).searchParams.get("travelmode")).toBe("walking");
    expect(new URL(legLink(a, b, "cab")).searchParams.get("travelmode")).toBe("driving");
  });

  it("marks the whole route as walking only when nearly every leg is a walk", () => {
    expect(wholeRouteMode(["walk", "walk", "walk", "walk", "auto"])).toBe("walking");
    expect(wholeRouteMode(["walk", "auto", "metro"])).toBeUndefined();
    expect(wholeRouteMode([])).toBeUndefined();
  });

  it("adds travelmode to the multi-stop link when asked", () => {
    const stops = all.filter((p) => p.coordConfidence === "verified").slice(0, 4);
    expect(new URL(googleMapsLinks(stops, "walking")[0]).searchParams.get("travelmode")).toBe("walking");
    expect(new URL(googleMapsLinks(stops)[0]).searchParams.has("travelmode")).toBe(false);
  });
});
