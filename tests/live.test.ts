import { describe, expect, it, vi } from "vitest";
import placesJson from "../src/data/places.json";
import { fetchGoogleLive, periodsToHours } from "../src/lib/live/google";
import { merge } from "../src/lib/live/useLive";
import { placeSchema } from "../src/lib/schema";

const place = placeSchema.parse(placesJson.find((p) => p.category === "cafe")!);

describe("periodsToHours", () => {
  it("converts Google's Sunday-first periods into Monday-first windows", () => {
    const h = periodsToHours([
      { open: { day: 1, hour: 10 }, close: { day: 1, hour: 22 } },
      { open: { day: 0, hour: 12 }, close: { day: 0, hour: 20, minute: 30 } },
    ])!;
    expect(h[0]).toEqual([[600, 1320]]); // Monday
    expect(h[6]).toEqual([[720, 1230]]); // Sunday
    expect(h[1]).toBeNull();
  });

  it("carries a window past midnight", () => {
    const h = periodsToHours([{ open: { day: 5, hour: 18 }, close: { day: 6, hour: 1 } }])!;
    expect(h[4]).toEqual([[1080, 1500]]);
  });

  it("handles always-open and missing data", () => {
    expect(periodsToHours([{ open: { day: 0, hour: 0 } }])![3]).toEqual([[0, 1440]]);
    expect(periodsToHours(undefined)).toBeUndefined();
  });
});

describe("fetchGoogleLive", () => {
  it("does nothing without a key", async () => {
    const f = vi.fn();
    expect(await fetchGoogleLive(place, "", f as never)).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it("sends a field-masked, location-biased request and parses the reply", async () => {
    const f = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        places: [
          {
            rating: 4.6,
            userRatingCount: 321,
            businessStatus: "OPERATIONAL",
            photos: [{ name: "places/x/photos/y" }],
            regularOpeningHours: { periods: [{ open: { day: 2, hour: 9 }, close: { day: 2, hour: 17 } }] },
          },
        ],
      }),
    }));
    const info = await fetchGoogleLive(place, "KEY", f as never);
    expect(info).toMatchObject({ rating: 4.6, ratingCount: 321, source: "google" });
    expect(info!.photo).toContain("places/x/photos/y/media");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://places.googleapis.com/v1/places:searchText");
    expect((init.headers as Record<string, string>)["X-Goog-FieldMask"]).toContain("regularOpeningHours");
    expect(JSON.parse(init.body as string).locationBias.circle.center.latitude).toBeCloseTo(place.lat);
  });

  it("returns null on an error reply", async () => {
    const f = vi.fn(async () => ({ ok: false, json: async () => ({}) }));
    expect(await fetchGoogleLive(place, "KEY", f as never)).toBeNull();
  });
});

describe("merge", () => {
  it("prefers live data and falls back to the snapshot", () => {
    const snap = { ...place, rating: 4.1, ratingCount: 10, snapshotAt: "2026-10-05" };
    expect(merge(snap, null)).toMatchObject({ rating: 4.1, freshness: "snapshot" });
    const live = merge(snap, { rating: 4.7, source: "google", fetchedAt: "now", status: "CLOSED_PERMANENTLY" });
    expect(live).toMatchObject({ rating: 4.7, freshness: "live", closed: true });
    expect(merge({ ...place, rating: undefined, hours: undefined, photo: undefined }, null).freshness).toBe("none");
  });
});
