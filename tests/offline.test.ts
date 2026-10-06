import { describe, expect, it } from "vitest";
import { precacheKolkataMapTiles } from "../src/lib/offlineTileCacher";

describe("offline map tile caching (Puja Day Mode)", () => {
  it("handles environment check when window/caches is not available or mocked", async () => {
    const res = await precacheKolkataMapTiles();
    expect(res).toBeDefined();
    expect(typeof res.success).toBe("boolean");
  });
});
