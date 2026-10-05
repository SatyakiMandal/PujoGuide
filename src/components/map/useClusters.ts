import { useMemo } from "react";
import Supercluster from "supercluster";
import type { Place } from "@/lib/schema";

export type View = { zoom: number; bounds: [number, number, number, number] };

/**
 * Cluster one group of places for the current map view. Below `maxZoom` places collapse into
 * count bubbles; with `minPoints: 1` even a lone place is a bubble (so food only appears as an
 * individual icon once you zoom in).
 */
export function useClusters(
  places: Place[],
  view: View | null,
  opts: { radius: number; maxZoom: number; minPoints?: number },
) {
  const { radius, maxZoom, minPoints } = opts;
  const index = useMemo(() => {
    const sc = new Supercluster<{ id: string }>({ radius, maxZoom, minPoints: minPoints ?? 2 });
    sc.load(
      places.map((p) => ({
        type: "Feature" as const,
        properties: { id: p.id },
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
      })),
    );
    return sc;
  }, [places, radius, maxZoom, minPoints]);

  const items = useMemo(() => (view ? index.getClusters(view.bounds, Math.round(view.zoom)) : []), [index, view]);
  const byId = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  return { index, items, byId };
}
