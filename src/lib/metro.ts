import raw from "@/data/metro.json";

export type MetroStation = { name: string; lat: number; lng: number; line: string };
export type MetroLine = {
  id: string;
  name: string;
  color: string;
  stations: { name: string; lat: number; lng: number }[];
  segments: number[][][];
};

export const metroLines = raw.lines as MetroLine[];
export const metroSource = raw.source;

export const metroLinesGeoJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: metroLines.flatMap((l) =>
    l.segments.map((coords) => ({
      type: "Feature" as const,
      properties: { color: l.color, line: l.id },
      geometry: { type: "LineString" as const, coordinates: coords },
    })),
  ),
};

export const metroStationsGeoJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: metroLines.flatMap((l) =>
    l.stations.map((s) => ({
      type: "Feature" as const,
      properties: { name: s.name, color: l.color, line: l.id },
      geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
    })),
  ),
};
