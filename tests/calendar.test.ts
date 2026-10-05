import { describe, expect, it } from "vitest";
import { PUJA_CAL, PUJA_DAY_IDS, pujaDay, pujaDayByDate, ritualClash, ritualsOn } from "../src/lib/calendar";
import { weekdayOf } from "../src/lib/hours";

describe("Puja calendar 2026", () => {
  it("runs Shashthi to Dashami on consecutive dates", () => {
    expect(PUJA_CAL.map((d) => d.id)).toEqual([...PUJA_DAY_IDS]);
    expect(PUJA_CAL.map((d) => d.date)).toEqual(["2026-10-17", "2026-10-18", "2026-10-19", "2026-10-20", "2026-10-21"]);
  });

  it("labels each day with the right weekday", () => {
    const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (const d of PUJA_CAL) expect(names[weekdayOf(d.date)]).toBe(d.weekday);
  });

  it("puts Sandhi Puja on Ashtami at the published Belur Math time", () => {
    const sandhi = ritualsOn("ashtami").find((r) => r.kind === "sandhi")!;
    expect(sandhi.start).toBe(10 * 60 + 28);
    expect(sandhi.end).toBe(11 * 60 + 16);
    expect(ritualsOn("saptami").some((r) => r.kind === "sandhi")).toBe(false);
  });

  it("keeps every ritual window sane", () => {
    for (const d of PUJA_CAL) {
      for (const r of d.rituals) {
        expect(r.end).toBeGreaterThan(r.start);
        expect(r.start).toBeGreaterThanOrEqual(0);
        expect(r.end).toBeLessThanOrEqual(24 * 60);
      }
    }
  });

  it("filters rituals by place kind and detects clashes", () => {
    expect(ritualsOn("dashami", "baris").some((r) => r.kind === "bisarjan")).toBe(false);
    expect(ritualsOn("dashami", "pandals").some((r) => r.kind === "bisarjan")).toBe(true);
    expect(ritualClash("ashtami", 10 * 60 + 30, 11 * 60)?.kind).toBeDefined();
    expect(ritualClash("ashtami", 13 * 60, 14 * 60)).toBeNull();
  });

  it("looks up days by date", () => {
    expect(pujaDayByDate("2026-10-20")?.id).toBe("navami");
    expect(pujaDayByDate("2026-10-22")).toBeUndefined();
    expect(pujaDay("ashtami").crowd).toBe("extreme");
  });
});
