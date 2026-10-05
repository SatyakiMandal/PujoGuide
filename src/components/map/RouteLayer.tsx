"use client";

import { useTheme } from "next-themes";
import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import { MODE_META } from "@/lib/route/modeMeta";
import { useLegs } from "@/lib/route/useLegs";

/** Draws each leg of the plan in its chosen mode's colour (walks dashed). Lives inside a MapLibre <Map>. */
export function RouteLayer() {
  const legs = useLegs();
  const { resolvedTheme } = useTheme();
  const halo = resolvedTheme === "dark" ? "#141110" : "#ffffff";

  const data = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: legs
        .filter((l) => l.option.path.length > 1)
        .map((l) => ({
          type: "Feature" as const,
          properties: { color: MODE_META[l.chosen].color, walk: l.chosen === "walk" },
          geometry: { type: "LineString" as const, coordinates: l.option.path },
        })),
    }),
    [legs],
  );

  if (!data.features.length) return null;
  return (
    <Source id="route" type="geojson" data={data}>
      <Layer
        id="route-casing"
        type="line"
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{ "line-color": halo, "line-width": ["interpolate", ["linear"], ["zoom"], 10, 6, 16, 11] }}
      />
      <Layer
        id="route-line"
        type="line"
        filter={["!", ["get", "walk"]]}
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{ "line-color": ["get", "color"], "line-width": ["interpolate", ["linear"], ["zoom"], 10, 3.5, 16, 7] }}
      />
      <Layer
        id="route-walk"
        type="line"
        filter={["get", "walk"]}
        layout={{ "line-cap": "butt", "line-join": "round" }}
        paint={{
          "line-color": ["get", "color"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 3.5, 16, 7],
          "line-dasharray": [1.2, 1.4],
        }}
      />
    </Source>
  );
}
