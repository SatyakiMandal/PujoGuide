import { Jeep, Motorcycle, PersonSimpleWalk, Taxi, TrainSimple, type Icon } from "@phosphor-icons/react";
import type { Mode } from "./types";

export const MODE_META: Record<Mode, { label: string; icon: Icon; color: string; dashed?: boolean }> = {
  walk: { label: "Walk", icon: PersonSimpleWalk, color: "#2f7d46", dashed: true },
  metro: { label: "Metro", icon: TrainSimple, color: "#4b4fd1" },
  auto: { label: "Auto", icon: Jeep, color: "#9a6400" },
  cab: { label: "Cab", icon: Taxi, color: "#4a4a52" },
  bike: { label: "Bike", icon: Motorcycle, color: "#9340c0" },
};

export const fmtMin = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ""}`.trim());

export const fmtFare = (f: { min: number; max: number } | null) =>
  !f ? "–" : f.max === 0 ? "Free" : f.min === f.max ? `₹${f.min}` : `₹${f.min}–${f.max}`;
