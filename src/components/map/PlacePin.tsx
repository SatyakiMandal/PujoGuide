import { PlaceIcon } from "@/lib/placeIcon";
import { CATEGORY_META } from "@/lib/categories";
import type { Place } from "@/lib/schema";

export type PinState = "default" | "match" | "dim" | "selected";

/** The visual pin, shared by every map provider. Styling lives in globals.css (.pin). */
export function PlacePin({ place, state, stop, visited }: { place: Place; state: PinState; stop?: number; visited?: boolean }) {
  const meta = CATEGORY_META[place.category];
  return (
    <div
      className="pin"
      data-state={state}
      style={{ ["--pin" as string]: `var(${meta.cssVar})` }}
      title={place.name.en}
    >
      <PlaceIcon place={place} size={20} />
      {visited && stop === undefined && <span className="pin-visited">✓</span>}
      {stop !== undefined && <span className="pin-stop">{stop}</span>}
    </div>
  );
}
