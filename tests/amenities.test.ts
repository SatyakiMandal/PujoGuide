import { describe, expect, it } from "vitest";
import { findNearestAmenity, findNearbyAmenities, getAmenities } from "../src/lib/amenities";

describe("amenities module", () => {
  it("loads amenities dataset and filters by type", () => {
    const all = getAmenities();
    expect(all.length).toBeGreaterThan(20);

    const toilets = getAmenities("toilet");
    expect(toilets.length).toBeGreaterThan(5);
    expect(toilets.every((t) => t.type === "toilet")).toBe(true);

    const police = getAmenities("police_booth");
    expect(police.length).toBeGreaterThan(3);
    expect(police.every((p) => p.type === "police_booth")).toBe(true);
  });

  it("finds the nearest amenity to a given coordinate", () => {
    // Shyambazar 5-point crossing (22.6001, 88.3702)
    const result = findNearestAmenity(22.6001, 88.3702, "toilet");
    expect(result).not.toBeNull();
    expect(result?.distanceKm).toBeLessThan(0.2);
    expect(result?.amenity.id).toBe("toilet-shyambazar");
  });

  it("finds nearby amenities within a specified radius", () => {
    // College Square (22.5742, 88.3631)
    const nearby = findNearbyAmenities(22.5742, 88.3631, 1.5);
    expect(nearby.length).toBeGreaterThan(0);
    expect(nearby[0].distanceKm).toBeLessThan(1.5);
  });
});
