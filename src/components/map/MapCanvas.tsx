"use client";

import { FreeMapCanvas } from "./FreeMapCanvas";
import { GoogleMapCanvas } from "./GoogleMapCanvas";

const KEY = process.env.NEXT_PUBLIC_GMAPS_KEY;

/**
 * Google Maps when a key is configured, otherwise the free OpenStreetMap-based map.
 * Both read the same store, so everything else in the app is provider-agnostic.
 */
export function MapCanvas() {
  return KEY ? <GoogleMapCanvas apiKey={KEY} /> : <FreeMapCanvas />;
}
