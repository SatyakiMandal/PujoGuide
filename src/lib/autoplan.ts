import { PUJA_CAL, pujaDay, ritualsOn, type PujaDayId, type Ritual } from "./calendar";
import { fmtClock, openDuring, weekdayOf } from "./hours";
import { legOptions, pickMode } from "./route/estimate";
import { DWELL_MIN } from "./route/dwell";
import { haversineKm } from "./route/geo";
import type { Mode, Point } from "./route/types";
import { isFood, type Crowd, type Place, type Region } from "./schema";

export const GROUPS = ["solo", "couple", "friends", "family", "elders"] as const;
export type Group = (typeof GROUPS)[number];

export const INTERESTS = ["heritage", "photogenic", "themes", "quiet", "foodie", "date", "rituals", "famous"] as const;
export type Interest = (typeof INTERESTS)[number];

export const PACES = ["relaxed", "normal", "packed"] as const;
export type Pace = (typeof PACES)[number];

export type Meals = { lunch: boolean; snack: boolean; dinner: boolean; supper: boolean };

export type PlanRequest = {
  day: PujaDayId;
  /** Minutes from midnight. */
  start: number;
  end: number;
  /** Empty = anywhere in the city. */
  regions: Region[];
  group: Group;
  interests: Interest[];
  /** Highest food price level you'll accept (1 cheap … 4 splurge). */
  budget: 1 | 2 | 3 | 4;
  diet: "any" | "veg";
  meals: Meals;
  pace: Pace;
  /** Slugs not to suggest (visited, or used on another day). */
  avoid?: string[];
  /** Where you are starting from; defaults to the first stop. */
  startFrom?: Point;
};

export const defaultRequest = (day: PujaDayId = "saptami"): PlanRequest => ({
  day,
  start: 16 * 60,
  end: 22 * 60 + 30,
  regions: [],
  group: "friends",
  interests: ["photogenic", "themes"],
  budget: 2,
  diet: "any",
  meals: { lunch: false, snack: true, dinner: true, supper: false },
  pace: "normal",
});

export type Item = {
  kind: "stop" | "meal";
  slug: string;
  arrive: number;
  depart: number;
  /** Getting here from the previous item (absent for the first). */
  travel?: { minutes: number; mode: Mode; km: number };
  /** Short reasons this was picked. */
  why: string[];
  warnings: string[];
  /** Set when this stop is held to catch a ritual (Pushpanjali, Sandhi Puja...). */
  ritual?: { label: string; start: number; end: number };
  meal?: "lunch" | "snack" | "dinner" | "supper";
};

export type Itinerary = {
  request: PlanRequest;
  items: Item[];
  /** Notes about the whole day (crowd, rituals, why something was left out). */
  notes: string[];
  stopCount: number;
  endsAt: number;
};

const SLOTS = [
  { id: "lunch", from: 12 * 60 + 15, to: 14 * 60 + 30, dwell: 55, label: "Lunch" },
  { id: "snack", from: 16 * 60 + 15, to: 17 * 60 + 45, dwell: 30, label: "Tea and a snack" },
  { id: "dinner", from: 19 * 60 + 45, to: 22 * 60, dwell: 60, label: "Dinner" },
  { id: "supper", from: 23 * 60, to: 25 * 60, dwell: 25, label: "Late supper" },
] as const;

const CROWD_NUM: Record<Crowd, number> = { low: 0, medium: 1, high: 2, extreme: 3 };
const QUEUE_MIN: Record<Crowd, number> = { low: 0, medium: 5, high: 15, extreme: 30 };
const PACE_DWELL = { relaxed: 1.3, normal: 1, packed: 0.8 } as const;
/** Weight of travel minutes against a stop's score when choosing the next stop. */
const TRAVEL_PENALTY = 0.045;

const isSight = (p: Place) => p.category === "bonedi_bari" || p.category === "pandal";

/** The "pujo" (baris + pandals) score for one place under this request. Higher = better fit. */
export function sightScore(p: Place, r: PlanRequest, arrive?: number): { score: number; why: string[] } {
  let s = 1;
  const why: string[] = [];
  const has = (t: string) => p.tags.includes(t);
  const crowd = CROWD_NUM[p.crowd ?? "medium"];
  const calmGroup = r.group === "family" || r.group === "elders";
  const eveningPeak = pujaDay(r.day).crowd === "extreme";

  const add = (n: number, reason?: string) => {
    s += n;
    if (reason) why.push(reason);
  };
  for (const i of r.interests) {
    if (i === "heritage" && (has("heritage") || p.category === "bonedi_bari")) add(1, "heritage house");
    if (i === "photogenic" && has("photogenic")) add(1, "photogenic");
    if (i === "themes" && (has("theme") || p.category === "pandal")) add(has("theme") ? 1 : 0.4, has("theme") ? "themed pandal" : undefined);
    if (i === "quiet" && (has("quiet") || crowd <= 1)) add(has("quiet") ? 1 : 0.5, "calm");
    if (i === "date" && (has("date") || has("photogenic") || has("quiet"))) add(0.8, "good for two");
    if (i === "famous" && crowd >= 2) add(1, "a big name");
    if (i === "rituals" && p.category === "bonedi_bari") add(0.8, "family ritual house");
  }
  if (r.group === "family" && has("family")) add(0.7, "family friendly");
  if (r.group === "couple" && has("date")) s += 0.5;
  if (r.group === "friends" && has("theme")) s += 0.4;
  if (calmGroup) s -= crowd >= 3 ? 1.6 : crowd === 2 ? 0.5 : 0;
  if (r.interests.includes("quiet")) s -= crowd >= 3 ? 1.2 : crowd === 2 ? 0.4 : 0;
  if (!calmGroup && !r.interests.includes("quiet") && crowd >= 3 && eveningPeak) s -= 0.2;

  if (arrive !== undefined) {
    if (p.category === "pandal" && arrive < 12 * 60) s -= 0.3;
    if (p.category === "pandal" && arrive >= 18 * 60 && arrive <= 23 * 60 && !r.interests.includes("quiet")) s += 0.3;
    if (p.category === "bonedi_bari" && arrive > 18 * 60) s -= 0.6;
    if (p.category === "bonedi_bari" && arrive >= 9 * 60 && arrive <= 17 * 60) s += 0.2;
  }
  if (p.coordConfidence === "area") s -= 0.15;
  return { score: s, why: [...new Set(why)].slice(0, 3) };
}

export function mealScore(p: Place, slot: (typeof SLOTS)[number]["id"], r: PlanRequest, km: number): number {
  let s = 1;
  const has = (t: string) => p.tags.includes(t);
  const cu = p.cuisines ?? [];
  const vb = p.vibes ?? [];
  s -= km * 0.55;
  if (p.rating) s += (p.rating - 4) * 1.1;
  if (p.ratingCount && p.ratingCount > 300) s += 0.2;
  if (p.info === "researched") s += 0.4;
  if (p.coordConfidence === "verified") s += 0.1;

  if (slot === "lunch") {
    if (p.category === "restaurant") s += 0.8;
    if (cu.some((c) => ["bengali", "biryani", "mughlai", "north_indian", "chinese"].includes(c))) s += 0.6;
    if (p.category === "cafe") s -= 0.2;
  } else if (slot === "snack") {
    if (p.category === "cafe" || p.category === "sweets" || p.category === "street_food") s += 0.7;
    if (cu.some((c) => ["coffee", "bakery", "dessert", "mishti", "street_food", "rolls"].includes(c))) s += 0.5;
    if (p.category === "restaurant") s -= 0.3;
  } else if (slot === "dinner") {
    if (p.category === "restaurant") s += 0.8;
    if (vb.includes("bar") && r.group !== "family" && r.group !== "elders") s += 0.2;
  } else {
    if (p.openLate || vb.includes("late_night")) s += 1;
    if (p.category === "street_food" || cu.includes("rolls") || cu.includes("biryani")) s += 0.6;
  }
  if (r.interests.includes("foodie") && (has("foodie") || p.info === "researched")) s += 0.5;
  if ((r.interests.includes("date") || r.group === "couple") && (has("date") || vb.includes("aesthetic"))) s += 0.5;
  if (r.interests.includes("heritage") && (has("heritage") || vb.includes("heritage"))) s += 0.5;
  if (r.group === "family" && (has("family") || vb.includes("family"))) s += 0.5;
  if (r.group === "elders" && (has("quiet") || vb.includes("family"))) s += 0.3;
  if (r.group === "friends" && (vb.includes("adda") || vb.includes("bar"))) s += 0.3;
  return s;
}

type Ctx = {
  r: PlanRequest;
  weekday: number;
  sights: Place[];
  food: Place[];
  night: (minute: number) => boolean;
  cache: Map<string, { minutes: number; mode: Mode; km: number }>;
};

type Hop = { minutes: number; mode: Mode; km: number };

function travel(ctx: Ctx, a: Place | Point, b: Place, at: number): Hop {
  const aKey = "slug" in a ? a.slug : `${a.lat},${a.lng}`;
  const night = ctx.night(at);
  const key = `${aKey}>${b.slug}|${night ? "n" : "d"}`;
  const hit = ctx.cache.get(key);
  if (hit) return hit;
  const opts = legOptions(a, b, {}, { pujaNight: night });
  const mode = pickMode(opts);
  const o = opts.find((x) => x.mode === mode)!;
  const slow = pujaDay(ctx.r.day).slowdown;
  // pujaNight already folds in the evening road factor; scale the rest of the day by the day's own crowd.
  const minutes = Math.max(2, Math.round(o.minutes * (night ? 1 : 1 + (slow - 1) * 0.4)));
  const out = { minutes, mode, km: o.km };
  ctx.cache.set(key, out);
  return out;
}

function dwellFor(p: Place, ctx: Ctx, at: number): number {
  const base = DWELL_MIN[p.category] * PACE_DWELL[ctx.r.pace];
  if (!isSight(p)) return Math.round(base);
  const queue = QUEUE_MIN[p.crowd ?? "medium"] * (at >= 17 * 60 ? 1 : 0.4) * (pujaDay(ctx.r.day).crowd === "extreme" ? 1.2 : 1);
  return Math.round(base + queue * (ctx.r.pace === "relaxed" ? 1 : ctx.r.pace === "normal" ? 0.8 : 0.5));
}

const inRegions = (p: Place, regions: Region[]) => regions.length === 0 || regions.includes(p.region);

function pickMeal(ctx: Ctx, slot: (typeof SLOTS)[number], from: Place | Point, time: number, used: Set<string>) {
  const r = ctx.r;
  let best: { p: Place; score: number; t: Hop } | null = null;
  for (const maxKm of [2.5, 6.0]) {
    for (const p of ctx.food) {
      if (used.has(p.slug) || p.closed) continue;
      if (p.priceLevel && p.priceLevel > r.budget) continue;
      if (r.diet === "veg" && p.diet && !p.diet.includes("veg")) continue;
      const km = haversineKm(from, p);
      if (km > maxKm) continue;
      const t = travel(ctx, from, p, time);
      const arrive = time + t.minutes;
      if (arrive > slot.to + 20) continue;
      if (!openDuring(p, ctx.weekday, arrive, arrive + Math.min(slot.dwell, 30))) continue;
      const score = mealScore(p, slot.id, r, km);
      if (!best || score > best.score || (score === best.score && p.slug < best.p.slug)) best = { p, score, t };
    }
    if (best) break;
  }
  return best;
}

/** Plans one day: stops in order, with meal breaks, ritual timings and honest warnings. */
export function planDay(allPlaces: Place[], r: PlanRequest): Itinerary {
  const day = pujaDay(r.day);
  const avoid = new Set(r.avoid ?? []);
  const ctx: Ctx = {
    r,
    weekday: weekdayOf(day.date),
    sights: allPlaces.filter((p) => isSight(p) && !p.closed && !avoid.has(p.slug) && inRegions(p, r.regions)),
    food: allPlaces.filter((p) => isFood(p.category) && !p.closed && !avoid.has(p.slug) && inRegions(p, r.regions.length ? widen(r.regions) : [])),
    night: (m) => m >= 17 * 60 && (day.crowd === "extreme" || day.crowd === "high"),
    cache: new Map(),
  };
  const notes: string[] = [];
  const items: Item[] = [];
  const used = new Set<string>();
  const doneMeals = new Set<string>();
  let time = r.start;
  let cur: Place | Point | null = r.startFrom ?? null;

  if (day.crowd === "extreme") notes.push(`${day.name} is the busiest day: expect queues, and allow extra time between stops.`);
  if (r.group === "elders" || r.group === "family") notes.push("Crowded pandals are ranked lower for your group, and walking legs are kept short.");

  // A ritual to catch (only if the day's window covers it).
  let hold: { place: Place; ritual: Ritual } | null = null;
  if (r.interests.includes("rituals")) {
    const ritual = ritualsOn(r.day).find(
      (x) => (x.kind === "pushpanjali" || x.kind === "sandhi" || x.kind === "kumari") && x.end > r.start + 20 && x.start < r.end - 30,
    );
    if (ritual) {
      const pool = ctx.sights
        .filter((p) => (ritual.at === "both" || (ritual.at === "baris" ? p.category === "bonedi_bari" : p.category === "pandal")))
        .map((p) => ({ p, s: sightScore(p, r, ritual.start).score - (cur ? haversineKm(cur, p) * 0.4 : 0) }))
        .sort((a, b) => b.s - a.s || (a.p.slug < b.p.slug ? -1 : 1));
      if (pool[0]) hold = { place: pool[0].p, ritual };
    } else {
      notes.push("No Pushpanjali or Sandhi Puja falls inside your time window, so none is scheduled.");
    }
  }

  const pickSlot = () => SLOTS.find((s) => r.meals[s.id] && !doneMeals.has(s.id) && time >= s.from + 15 && time < s.to && r.end >= s.from + 40);

  let guard = 0;
  while (guard++ < 40) {
    if (time >= r.end - 15) break;

    // Ritual hold: go now if travelling any later would miss the start.
    if (hold && !used.has(hold.place.slug)) {
      const t = cur ? travel(ctx, cur, hold.place, time) : { minutes: 0, mode: "walk" as Mode, km: 0 };
      const mustLeave = hold.ritual.start - 15 - t.minutes;
      if (time >= mustLeave - 5) {
        const arrive = Math.max(time + t.minutes, r.start);
        const depart = Math.max(arrive + 20, Math.min(hold.ritual.end, hold.ritual.start + 60, r.end));
        const w: string[] = [];
        if (arrive > hold.ritual.start) w.push(`You may reach after ${fmtClock(hold.ritual.start)}, when this ritual begins.`);
        items.push({
          kind: "stop",
          slug: hold.place.slug,
          arrive,
          depart,
          travel: cur ? t : undefined,
          why: [`Held for ${hold.ritual.label}`, ...sightScore(hold.place, r, arrive).why].slice(0, 3),
          warnings: w,
          ritual: { label: hold.ritual.label, start: hold.ritual.start, end: hold.ritual.end },
        });
        used.add(hold.place.slug);
        cur = hold.place;
        time = depart;
        notes.push(`${hold.ritual.label} (${fmtClock(hold.ritual.start)}–${fmtClock(hold.ritual.end)}) is an approximate guide. Confirm the exact time with the club.`);
        continue;
      }
    }

    const slot = pickSlot();
    if (slot) {
      const from = cur ?? ctx.sights[0];
      if (from) {
        const m = pickMeal(ctx, slot, from, time, used);
        if (m) {
          doneMeals.add(slot.id);
          const arrive = time + m.t.minutes;
          const depart = arrive + Math.round(slot.dwell * PACE_DWELL[r.pace]);
          items.push({
            kind: "meal",
            slug: m.p.slug,
            arrive,
            depart,
            travel: cur ? m.t : undefined,
            meal: slot.id,
            why: [slot.label, ...(m.p.rating ? [`${m.p.rating.toFixed(1)}★`] : []), ...(m.p.info === "researched" ? ["checked picks"] : [])],
            warnings: [],
          });
          used.add(m.p.slug);
          cur = m.p;
          time = depart;
          continue;
        }
        notes.push(`No suitable ${slot.label.toLowerCase()} place found near your route within your budget and diet.`);
      }
    }

    // Next sight: best score per minute of travel, that fits the day.
    let best: { p: Place; value: number; arrive: number; depart: number; t: Hop; why: string[] } | null = null;
    for (const p of ctx.sights) {
      if (used.has(p.slug)) continue;
      const t: Hop = cur ? travel(ctx, cur, p, time) : { minutes: 0, mode: "walk", km: 0 };
      const arrive = time + t.minutes;
      const depart = arrive + dwellFor(p, ctx, arrive);
      if (depart > r.end + 10) continue;
      if (!openDuring(p, ctx.weekday, arrive, Math.min(depart, arrive + 20))) continue;
      // Leave enough time to still reach the ritual hold.
      if (hold && !used.has(hold.place.slug)) {
        const back = travel(ctx, p, hold.place, depart).minutes;
        if (depart + back > hold.ritual.start - 10) continue;
      }
      const { score, why } = sightScore(p, r, arrive);
      let value = score - t.minutes * TRAVEL_PENALTY;
      if ((r.group === "elders" || r.group === "family") && t.mode === "walk" && t.minutes > 15) value -= 1;
      if (!best || value > best.value + 1e-9 || (Math.abs(value - best.value) < 1e-9 && p.slug < best.p.slug)) {
        best = { p, value, arrive, depart, t, why };
      }
    }
    if (!best) {
      // Nothing else fits before the ritual: wait for it rather than give up.
      if (hold && !used.has(hold.place.slug)) {
        const t = cur ? travel(ctx, cur, hold.place, time) : { minutes: 0 };
        time = Math.max(time, hold.ritual.start - 15 - t.minutes);
        continue;
      }
      break;
    }
    const w: string[] = [];
    const crowd = best.p.crowd ?? "medium";
    if ((crowd === "extreme" || crowd === "high") && best.arrive >= 17 * 60) w.push("Expect a long queue at this hour.");
    if (best.p.coordConfidence === "area") w.push("Pin is approximate. Check the exact spot in Maps.");
    const why = [...best.why];
    if (cur && best.t.minutes <= 12) why.push(`${best.t.minutes} min from the last stop`);
    items.push({ kind: "stop", slug: best.p.slug, arrive: best.arrive, depart: best.depart, travel: cur ? best.t : undefined, why: why.slice(0, 3), warnings: w });
    used.add(best.p.slug);
    cur = best.p;
    time = best.depart;
  }

  // Skipped ritual hold, e.g. nothing could reach it.
  if (hold && !used.has(hold.place.slug)) {
    notes.push(`Could not fit ${hold.ritual.label} into this route. Try an earlier start.`);
  }
  if (!items.some((i) => i.kind === "stop")) {
    notes.push("Nothing fit the time window. Widen the area, move the start earlier or allow a later finish.");
  }
  return { request: r, items, notes: [...new Set(notes)], stopCount: items.filter((i) => i.kind === "stop").length, endsAt: items.length ? items[items.length - 1].depart : r.start };
}

/** Food near the chosen regions: a region's plan may eat a little over the boundary. */
function widen(regions: Region[]): Region[] {
  const set = new Set<Region>(regions);
  if (set.has("north")) set.add("central");
  if (set.has("south")) set.add("central");
  if (set.has("central")) {
    set.add("north");
    set.add("south");
  }
  return [...set];
}

export type MultiDay = { days: Itinerary[]; notes: string[] };

/**
 * Plans several festival days in a row. Places used on one day are skipped on the next. With no
 * region chosen, each day takes the part of the city with the most still-unseen good stops, so you
 * don't zigzag across Kolkata.
 */
export function planDays(allPlaces: Place[], base: Omit<PlanRequest, "day">, days: PujaDayId[]): MultiDay {
  const out: Itinerary[] = [];
  const avoid = new Set(base.avoid ?? []);
  const notes: string[] = [];
  const usedRegions: Region[] = [];
  for (const id of days) {
    let regions = base.regions;
    if (regions.length === 0) {
      const probe = defaultFor(base, id);
      const per = new Map<Region, number[]>();
      for (const p of allPlaces.filter((x) => isSight(x) && !x.closed && !avoid.has(x.slug))) {
        const arr = per.get(p.region) ?? [];
        arr.push(sightScore(p, probe).score);
        per.set(p.region, arr);
      }
      let bestRegion: Region | null = null;
      let bestVal = -Infinity;
      for (const [reg, arr] of per) {
        const top = arr.sort((a, b) => b - a).slice(0, 7).reduce((s, v) => s + v, 0);
        const penalty = usedRegions.includes(reg) ? 1.5 : 0;
        if (top - penalty > bestVal) {
          bestVal = top - penalty;
          bestRegion = reg;
        }
      }
      regions = bestRegion ? [bestRegion] : [];
    }
    const it = planDay(allPlaces, { ...base, day: id, regions, avoid: [...avoid] });
    it.items.forEach((i) => avoid.add(i.slug));
    if (regions[0]) usedRegions.push(regions[0]);
    out.push(it);
  }
  return { days: out, notes };
}

const defaultFor = (base: Omit<PlanRequest, "day">, day: PujaDayId): PlanRequest => ({ ...base, day });

export const slugsOf = (it: Itinerary) => it.items.map((i) => i.slug);
export const scheduleOf = (it: Itinerary) =>
  Object.fromEntries(it.items.map((i) => [i.slug, { arrive: i.arrive, depart: i.depart }]));

export const PUJA_DAY_LIST = PUJA_CAL;
