import { describe, expect, it } from "vitest";
import { useUI } from "../src/store/ui";
import { applyFilters, defaultFilters } from "../src/lib/filter";
import places from "../src/data/places.json";
import { formattedShareText, shareUrl } from "../src/lib/route/export";
import { generateQRCodeSVG } from "../src/lib/qrcode";
import type { Place } from "../src/lib/schema";

describe("Saved and Visited personal storage & filter bypass", () => {
  it("toggles saved and visited places correctly", () => {
    const slug = "bagbazar-sarbojanin";
    const store = useUI.getState();

    if (store.saved.includes(slug)) store.toggleSaved(slug);
    expect(useUI.getState().saved).not.toContain(slug);

    store.toggleSaved(slug);
    expect(useUI.getState().saved).toContain(slug);

    store.toggleSaved(slug);
    expect(useUI.getState().saved).not.toContain(slug);
  });

  it("bypasses default category layer filter when personal filter is active", () => {
    // Find a food place whose category is "cafe" or "restaurant"
    const cafe = (places as Place[]).find((p) => p.category === "cafe")!;
    expect(cafe).toBeDefined();

    const mine = { saved: new Set([cafe.slug]), visited: new Set<string>() };
    // Default layers only include bonedi_bari and pandal
    const filterSavedState = { ...defaultFilters, personal: "saved" as const };

    const { visible, matched } = applyFilters(places as Place[], filterSavedState, null, mine);

    expect(visible.map((p) => p.slug)).toContain(cafe.slug);
    expect(matched.has(cafe.id)).toBe(true);
  });
});

describe("QR Code generation & share text formatting", () => {
  it("generates a valid SVG string with error correction for a route payload", () => {
    const url = shareUrl("https://pujoguide.com", ["bagbazar-sarbojanin", "college-square"]);
    const svg = generateQRCodeSVG(url);

    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox="0 0');
    expect(svg).toContain("<path d=");
    expect(svg.length).toBeGreaterThan(100);
  });

  it("formats a shareable WhatsApp text with stop count and PujoGuide URL", () => {
    const testPlaces = (places as Place[]).slice(0, 3);
    const formatted = formattedShareText("https://pujoguide.com", testPlaces);

    expect(formatted).toContain("My Pujo 2026 Plan (3 stops)");
    expect(formatted).toContain("1. Hathkhola Dutta Bari");
    expect(formatted).toContain("Open route on PujoGuide:");
    expect(formatted).toContain("https://pujoguide.com/?route=");
  });
});

describe("Route editing and stop operations", () => {
  it("allows adding, inserting, reordering and clearing route stops", () => {
    const store = useUI.getState();
    store.clearRoute();
    expect(useUI.getState().route.stops).toEqual([]);

    store.addStop("bagbazar-sarbojanin");
    store.addStop("college-square");
    expect(useUI.getState().route.stops).toEqual(["bagbazar-sarbojanin", "college-square"]);

    store.insertStop("santosh-mitra-square", "bagbazar-sarbojanin");
    expect(useUI.getState().route.stops).toEqual(["bagbazar-sarbojanin", "santosh-mitra-square", "college-square"]);

    store.removeStop("santosh-mitra-square");
    expect(useUI.getState().route.stops).toEqual(["bagbazar-sarbojanin", "college-square"]);

    store.clearRoute();
    expect(useUI.getState().route.stops).toEqual([]);
  });
});
