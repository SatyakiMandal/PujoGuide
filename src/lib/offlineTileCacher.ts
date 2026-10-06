/**
/**
 * Utility to pre-cache Kolkata map tiles for offline use ("Puja Day Mode").
 * Converts Lat/Lng bounding box to XYZ tile coordinates and fetches CARTO light/dark styles and tiles.
 */

const STYLE_LIGHT = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
const STYLE_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

function lon2tile(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function lat2tile(lat: number, zoom: number): number {
  return Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
      Math.pow(2, zoom),
  );
}

export type CacheProgress = {
  total: number;
  completed: number;
  percent: number;
  status: "idle" | "caching" | "done" | "error";
};

export async function precacheKolkataMapTiles(
  onProgress?: (p: CacheProgress) => void,
): Promise<{ success: boolean; cachedTilesCount: number }> {
  if (typeof window === "undefined" || !("caches" in window)) {
    return { success: false, cachedTilesCount: 0 };
  }

  try {
    const cache = await caches.open("pujoguide-tiles-v1");

    // Pre-cache styles
    await Promise.all([
      cache.add(STYLE_LIGHT).catch(() => null),
      cache.add(STYLE_DARK).catch(() => null),
    ]);

    // Kolkata bounds: South 22.46, North 22.64, West 88.29, East 88.45
    const zooms = [12, 13, 14];
    const urls: string[] = [];

    const subdomains = ["a", "b", "c", "d"];

    for (const z of zooms) {
      const minX = lon2tile(88.29, z);
      const maxX = lon2tile(88.45, z);
      const minY = lat2tile(22.64, z);
      const maxY = lat2tile(22.46, z);

      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          const sub = subdomains[(x + y) % subdomains.length];
          // CARTO raster fallback / vector tile URLs
          urls.push(`https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`);
          urls.push(`https://${sub}.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`);
        }
      }
    }

    let completed = 0;
    const total = urls.length;

    onProgress?.({ total, completed: 0, percent: 0, status: "caching" });

    // Fetch in batches of 6 concurrent connections
    const batchSize = 6;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (url) => {
          try {
            const hit = await cache.match(url);
            if (!hit) {
              const res = await fetch(url, { mode: "cors" });
              if (res.ok) await cache.put(url, res);
            }
          } catch {
            /* ignore individual tile failures */
          } finally {
            completed++;
            onProgress?.({
              total,
              completed,
              percent: Math.min(100, Math.round((completed / total) * 100)),
              status: "caching",
            });
          }
        }),
      );
    }

    onProgress?.({ total, completed: total, percent: 100, status: "done" });
    return { success: true, cachedTilesCount: completed };
  } catch (err) {
    console.error("Failed to precache tiles:", err);
    onProgress?.({ total: 0, completed: 0, percent: 0, status: "error" });
    return { success: false, cachedTilesCount: 0 };
  }
}
