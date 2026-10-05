import type { Crowd } from "./schema";

/**
 * Festival calendar for 2026 (IST). Tithi times from published panchangs; Belur Math's programme gives
 * Kumari Puja 9:00 am and Sandhi Puja 10:28–11:16 am on Mahashtami (Mon 19 Oct).
 * Pandal-level timings (Pushpanjali etc.) differ by club: treat every ritual window here as a guide,
 * not a schedule, and confirm with the club or your local panjika.
 */
export const PUJA_DAY_IDS = ["shashthi", "saptami", "ashtami", "navami", "dashami"] as const;
export type PujaDayId = (typeof PUJA_DAY_IDS)[number];

export type RitualKind = "pushpanjali" | "kumari" | "sandhi" | "arati" | "dhunuchi" | "sindoor" | "bisarjan" | "bodhon";

export type Ritual = {
  kind: RitualKind;
  label: string;
  /** Minutes from midnight. */
  start: number;
  end: number;
  /** Where it happens: at the big pandals, family houses (baris), or both. */
  at: "pandals" | "baris" | "both";
  note: string;
};

export type PujaDay = {
  id: PujaDayId;
  name: string;
  /** ISO date. */
  date: string;
  weekday: string;
  /** Rough pandal-crowd multiplier on the evening (1 = ordinary Puja evening). */
  crowd: Crowd;
  /** How much the road traffic and footfall slow you down (feeds the planner's travel time). */
  slowdown: number;
  theme: string;
  rituals: Ritual[];
};

const h = (hr: number, min = 0) => hr * 60 + min;

export const PUJA_CAL: PujaDay[] = [
  {
    id: "shashthi",
    name: "Shashthi",
    date: "2026-10-17",
    weekday: "Sat",
    crowd: "medium",
    slowdown: 1.1,
    theme: "Bodhon and the first look",
    rituals: [
      { kind: "bodhon", label: "Bodhon & Amantran", start: h(17), end: h(19), at: "both", note: "The goddess is welcomed in the evening. Many pandals open to visitors from now." },
    ],
  },
  {
    id: "saptami",
    name: "Saptami",
    date: "2026-10-18",
    weekday: "Sun",
    crowd: "high",
    slowdown: 1.25,
    theme: "Kolaboukou snaan, then the baris",
    rituals: [
      { kind: "pushpanjali", label: "Saptami Pushpanjali", start: h(9), end: h(11, 30), at: "both", note: "Morning anjali; club timings vary, usually between 9 and 11:30." },
      { kind: "arati", label: "Evening arati", start: h(18), end: h(20), at: "both", note: "Dhak and dhunuchi, best at houses like Pathuriaghata." },
      { kind: "dhunuchi", label: "Dhunuchi nach", start: h(19), end: h(20), at: "baris", note: "Pathuriaghata Rajbari's dhunuchi nach is around 7 pm." },
    ],
  },
  {
    id: "ashtami",
    name: "Ashtami",
    date: "2026-10-19",
    weekday: "Mon",
    crowd: "extreme",
    slowdown: 1.45,
    theme: "Pushpanjali, Kumari Puja and Sandhi Puja",
    rituals: [
      { kind: "pushpanjali", label: "Ashtami Pushpanjali", start: h(8, 30), end: h(10, 15), at: "both", note: "The main anjali, before Sandhi Puja. Clubs usually fix 8:30 to 10:15; arrive 30 minutes early." },
      { kind: "kumari", label: "Kumari Puja", start: h(9), end: h(10), at: "both", note: "Belur Math holds it at 9 am; other places vary." },
      { kind: "sandhi", label: "Sandhi Puja", start: h(10, 28), end: h(11, 16), at: "both", note: "The 48-minute junction of Ashtami and Navami (Belur Math: 10:28 to 11:16 am). Lamps and 108 diyas." },
      { kind: "arati", label: "Evening arati", start: h(18), end: h(20), at: "both", note: "Crowds peak after dark." },
    ],
  },
  {
    id: "navami",
    name: "Navami",
    date: "2026-10-20",
    weekday: "Tue",
    crowd: "extreme",
    slowdown: 1.45,
    theme: "The biggest night",
    rituals: [
      { kind: "pushpanjali", label: "Navami Pushpanjali", start: h(9), end: h(11, 30), at: "both", note: "Navami ends about 12:50 pm, so the anjali is done by late morning." },
      { kind: "arati", label: "Evening arati", start: h(18), end: h(20), at: "both", note: "Many pandals stay open past 2 am tonight." },
    ],
  },
  {
    id: "dashami",
    name: "Dashami",
    date: "2026-10-21",
    weekday: "Wed",
    crowd: "high",
    slowdown: 1.3,
    theme: "Sindoor khela and Bisarjan",
    rituals: [
      { kind: "sindoor", label: "Boron & Sindoor khela", start: h(9, 30), end: h(13), at: "both", note: "Married women apply sindoor to the goddess and each other. Dashami tithi runs to about 2:11 pm." },
      { kind: "bisarjan", label: "Bisarjan processions", start: h(15), end: h(23), at: "pandals", note: "Immersion starts in the afternoon, with roads closing toward the ghats. Timings follow each club." },
    ],
  },
];

export const pujaDay = (id: PujaDayId) => PUJA_CAL.find((d) => d.id === id)!;
export const pujaDayByDate = (iso: string) => PUJA_CAL.find((d) => d.date === iso);

/** Rituals on a day, optionally only those relevant to a kind of place. */
export function ritualsOn(id: PujaDayId, at?: "pandals" | "baris"): Ritual[] {
  return pujaDay(id).rituals.filter((r) => !at || r.at === "both" || r.at === at);
}

/** The ritual (if any) whose window overlaps [from, to] on this day. */
export function ritualClash(id: PujaDayId, from: number, to: number, at?: "pandals" | "baris"): Ritual | null {
  return ritualsOn(id, at).find((r) => from < r.end && to > r.start) ?? null;
}
