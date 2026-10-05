export type Mode = "walk" | "metro" | "auto" | "cab" | "bike";
export const MODES: Mode[] = ["walk", "metro", "auto", "cab", "bike"];

export type LngLat = [number, number];
export type Point = { lat: number; lng: number };

/** Geometry + figures from the public OSRM router (or a straight-line fallback). */
export type Routed = { km: number; minutes: number; path: LngLat[]; approx: boolean };

export type Step =
  | { kind: "walk"; minutes: number; to: string }
  | { kind: "ride"; line: string; color: string; from: string; to: string; stops: number; minutes: number }
  | { kind: "transfer"; at: string; minutes: number };

export type LegOption = {
  mode: Mode;
  available: boolean;
  /** Why it's unavailable or worth a warning. */
  note?: string;
  minutes: number;
  km: number;
  /** Rough rupee range; null when we have no sensible estimate. */
  fare: { min: number; max: number } | null;
  path: LngLat[];
  steps?: Step[];
  approx: boolean;
};

export type RouteOptions = {
  /** Festive-evening congestion on roads and crowds on footpaths. */
  pujaNight: boolean;
};
