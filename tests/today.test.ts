import { describe, expect, it } from "vitest";
import { festivalLine, nextRitual } from "../src/components/TodayStrip";

describe("festival line", () => {
  it("counts down to Mahalaya and Shashthi", () => {
    expect(festivalLine("2026-10-05")).toMatch(/Mahalaya in 5 days/);
    expect(festivalLine("2026-10-12")).toBe("Shashthi in 5 days.");
  });
  it("names the day and the next ritual during the festival", () => {
    expect(festivalLine("2026-10-19", 9 * 60 + 40)).toBe("Today is Ashtami. Next: Ashtami Pushpanjali (under way).");
    expect(festivalLine("2026-10-19", 10 * 60 + 20)).toBe("Today is Ashtami. Next: Sandhi Puja 10:28 am.");
    expect(festivalLine("2026-10-19", 10 * 60 + 40)).toBe("Today is Ashtami. Next: Sandhi Puja (under way).");
    expect(festivalLine("2026-10-19")).toBe("Today is Ashtami.");
  });
  it("has nothing to say once the day's rituals are over", () => {
    expect(nextRitual("2026-10-19", 23 * 60)).toBeNull();
    expect(nextRitual("2026-10-05", 600)).toBeNull();
  });
  it("wishes Shubho Bijoya after Dashami", () => {
    expect(festivalLine("2026-10-25")).toMatch(/Shubho Bijoya/);
  });
});
