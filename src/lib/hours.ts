import type { Category, Hours, Place } from "./schema";

export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export type Win = [number, number];

const MIN_DAY = 1440;

/** "6 am" / "11" / "12:30 pm" -> minutes, with an optional meridian to inherit. */
function parseClock(raw: string, inherit?: "am" | "pm"): { min: number; mer?: "am" | "pm" } | null {
  const m = raw.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  const mer = (m[3] as "am" | "pm" | undefined) ?? inherit;
  let h = Number(m[1]) % 12;
  if (mer === "pm") h += 12;
  else if (!mer && Number(m[1]) === 12) h = 12;
  return { min: h * 60 + Number(m[2] ?? 0), mer };
}

/** One range such as "12–9 pm", "6 am–11 pm" or "10 am–1 am". */
export function parseRange(text: string): Win | null {
  const parts = text.split(/\s*[–—-]\s*/);
  if (parts.length !== 2) return null;
  const end = parseClock(parts[1]);
  if (!end) return null;
  const start = parseClock(parts[0], end.mer);
  if (!start) return null;
  let s = start.min;
  let e = end.min;
  // "11–2 pm" means 11 am to 2 pm: the start inherited "pm" but would land after the end.
  if (!/(am|pm)/i.test(parts[0]) && s >= e && s - 720 >= 0 && e + MIN_DAY > s) s -= 720;
  if (e === 0) e = MIN_DAY; // "12 am" as a closing time is midnight
  if (e <= s) e += MIN_DAY;
  return [s, e];
}

/** One Google row such as "Monday12–9 pm", "Sunday4–9 pm", "Tuesday12–3 pm, 7–11 pm", "Friday Closed". */
export function parseDayRow(row: string): { day: number; wins: Win[] | null } | null {
  const day = DAY_NAMES.findIndex((d) => row.startsWith(d));
  if (day < 0) return null;
  // Google appends an icon glyph from a private-use font (U+E14D) to each row.
  const rest = row.slice(DAY_NAMES[day].length).replace(/[-]/g, "").replace(/\s+/g, " ").trim();
  if (/^closed/i.test(rest)) return { day, wins: null };
  if (/open 24 hours/i.test(rest)) return { day, wins: [[0, MIN_DAY]] };
  const wins: Win[] = [];
  for (const piece of rest.split(/\s*,\s*/)) {
    const w = parseRange(piece);
    if (!w) return null;
    wins.push(w);
  }
  return { day, wins: wins.length ? wins : null };
}

/** Seven Google rows -> Hours, or null if any row can't be understood. */
export function parseGoogleHours(rows: string[]): Hours | null {
  const out: Hours = Array.from({ length: 7 }, () => null);
  const seen = new Set<number>();
  for (const row of rows) {
    const r = parseDayRow(row);
    if (!r) return null;
    out[r.day] = r.wins;
    seen.add(r.day);
  }
  return seen.size === 7 ? out : null;
}

/** Monday-first weekday (0-6) of an ISO date, independent of the machine's timezone. */
export function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/**
 * What we assume when no listed hours exist. Pandals run late on Puja nights; baris are family
 * homes best seen in daylight and early evening.
 */
export const TYPICAL: Record<Category, Win[]> = {
  pandal: [[9 * 60, 26 * 60]],
  bonedi_bari: [[8 * 60, 21 * 60]],
  cafe: [[10 * 60, 22 * 60 + 30]],
  restaurant: [[12 * 60, 23 * 60]],
  sweets: [[9 * 60, 21 * 60]],
  street_food: [[16 * 60, 22 * 60]],
};

export type HoursBasis = "listed" | "typical";

export function windowsOn(place: Pick<Place, "hours" | "category">, weekday: number): { wins: Win[]; basis: HoursBasis } {
  if (place.hours) return { wins: place.hours[weekday] ?? [], basis: "listed" };
  return { wins: TYPICAL[place.category], basis: "typical" };
}

/** Windows that are open at `minute` on `weekday`, counting hours that spill over from the previous night. */
export function openAt(
  place: Pick<Place, "hours" | "category">,
  weekday: number,
  minute: number,
): { open: boolean; basis: HoursBasis; closesAt?: number } {
  const today = windowsOn(place, weekday);
  for (const [s, e] of today.wins) if (minute >= s && minute < e) return { open: true, basis: today.basis, closesAt: e };
  const prev = windowsOn(place, (weekday + 6) % 7);
  for (const [s, e] of prev.wins) {
    if (e > MIN_DAY && minute + MIN_DAY >= s && minute + MIN_DAY < e) {
      return { open: true, basis: prev.basis, closesAt: e - MIN_DAY };
    }
  }
  return { open: false, basis: today.basis };
}

/** True if the place is open for the whole of [from, to] (a visit). */
export function openDuring(place: Pick<Place, "hours" | "category">, weekday: number, from: number, to: number): boolean {
  const a = openAt(place, weekday, from);
  if (!a.open) return false;
  return a.closesAt === undefined || a.closesAt >= to || (a.closesAt < from && a.closesAt + MIN_DAY >= to);
}

/** The next time on this day (>= minute) the place opens, if any. */
export function nextOpening(place: Pick<Place, "hours" | "category">, weekday: number, minute: number): number | null {
  const { wins } = windowsOn(place, weekday);
  const next = wins.map(([s]) => s).filter((s) => s >= minute).sort((a, b) => a - b)[0];
  return next ?? null;
}

export function fmtClock(minute: number): string {
  const m = ((minute % MIN_DAY) + MIN_DAY) % MIN_DAY;
  const h24 = Math.floor(m / 60);
  const mm = m % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}${mm ? `:${String(mm).padStart(2, "0")}` : ""} ${h24 < 12 ? "am" : "pm"}`;
}

export function fmtWindows(wins: Win[] | null): string {
  if (!wins || wins.length === 0) return "Closed";
  if (wins.length === 1 && wins[0][0] === 0 && wins[0][1] >= MIN_DAY) return "Open 24 hours";
  return wins.map(([s, e]) => `${fmtClock(s)} – ${fmtClock(e)}`).join(", ");
}

/** "7:30 pm" -> 1170 for the planner's time inputs ("19:30" from <input type=time>). */
export function parseTimeInput(v: string): number | null {
  const m = v.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function toTimeInput(minute: number): string {
  const m = ((minute % MIN_DAY) + MIN_DAY) % MIN_DAY;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** "Closed Monday" style hint when the listed hours show a closed weekday (used for Puja-day warnings). */
export function closedOn(place: Pick<Place, "hours">, weekday: number): boolean {
  return !!place.hours && (place.hours[weekday] === null || place.hours[weekday]!.length === 0);
}

export type OpenStatus = { tone: "open" | "closed" | "unknown"; text: string; basis: HoursBasis };

/** One line for lists and the detail card: "Open · closes 11 pm", "Closed · opens 12 pm", "Closed today". */
export function openStatus(place: Pick<Place, "hours" | "category">, weekday: number, minute: number): OpenStatus {
  const a = openAt(place, weekday, minute);
  if (a.open) {
    const closes = a.closesAt !== undefined ? fmtClock(a.closesAt) : null;
    if (a.basis === "typical") return { tone: "unknown", text: closes ? `Usually open until ${closes}` : "Usually open", basis: a.basis };
    return { tone: "open", text: closes ? `Open · closes ${closes}` : "Open", basis: a.basis };
  }
  if (a.basis === "typical") return { tone: "unknown", text: "Usually closed at this hour", basis: a.basis };
  const next = nextOpening(place, weekday, minute);
  if (next !== null) return { tone: "closed", text: `Closed · opens ${fmtClock(next)}`, basis: a.basis };
  return { tone: "closed", text: closedOn(place, weekday) ? "Closed today" : "Closed for the day", basis: a.basis };
}
