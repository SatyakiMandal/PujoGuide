import amenitiesRaw from "@/data/amenities.json";
import { haversineKm } from "./route/geo";
import { type Amenity, type AmenityType, amenitySchema } from "./schema";

const AMENITIES: Amenity[] = (amenitiesRaw as unknown[]).map((a) => amenitySchema.parse(a));

export function getAmenities(type?: AmenityType): Amenity[] {
  if (!type) return AMENITIES;
  return AMENITIES.filter((a) => a.type === type);
}

export function findNearestAmenity(
  lat: number,
  lng: number,
  type?: AmenityType,
): { amenity: Amenity; distanceKm: number } | null {
  const pool = getAmenities(type);
  if (pool.length === 0) return null;

  let nearest: Amenity | null = null;
  let minKm = Infinity;

  for (const a of pool) {
    const km = haversineKm({ lat, lng }, { lat: a.lat, lng: a.lng });
    if (km < minKm) {
      minKm = km;
      nearest = a;
    }
  }

  return nearest ? { amenity: nearest, distanceKm: minKm } : null;
}

export function findNearbyAmenities(
  lat: number,
  lng: number,
  maxKm = 3.0,
  type?: AmenityType,
): { amenity: Amenity; distanceKm: number }[] {
  const pool = getAmenities(type);
  const results: { amenity: Amenity; distanceKm: number }[] = [];

  for (const a of pool) {
    const km = haversineKm({ lat, lng }, { lat: a.lat, lng: a.lng });
    if (km <= maxKm) {
      results.push({ amenity: a, distanceKm: km });
    }
  }

  return results.sort((a, b) => a.distanceKm - b.distanceKm);
}

export const AMENITY_LABELS: Record<AmenityType, { label: string; icon: string; color: string }> = {
  toilet: { label: "Public Restroom", icon: "🚽", color: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  water: { label: "Drinking Water", icon: "🚰", color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" },
  police_booth: { label: "Police Assistance Desk", icon: "👮", color: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  first_aid: { label: "First Aid & Medical Post", icon: "🏥", color: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
};
