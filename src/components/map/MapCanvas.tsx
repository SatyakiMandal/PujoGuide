"use client";

import dynamic from "next/dynamic";

const KEY = process.env.NEXT_PUBLIC_GMAPS_KEY;

/** The map engines are large. Load them after the panel is interactive, behind a placeholder of the same size. */
const placeholder = () => <div aria-hidden className="size-full bg-surface2" />;
const FreeMapCanvas = dynamic(() => import("./FreeMapCanvas").then((m) => m.FreeMapCanvas), { ssr: false, loading: placeholder });
const GoogleMapCanvas = dynamic(() => import("./GoogleMapCanvas").then((m) => m.GoogleMapCanvas), { ssr: false, loading: placeholder });

/**
 * Google Maps when a key is configured, otherwise the free OpenStreetMap-based map.
 * Both read the same store, so everything else in the app is provider-agnostic.
 */
export function MapCanvas() {
  return KEY ? <GoogleMapCanvas apiKey={KEY} /> : <FreeMapCanvas />;
}
