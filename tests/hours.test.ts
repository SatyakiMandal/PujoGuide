import { describe, expect, it } from "vitest";
import {
  fmtClock,
  fmtWindows,
  nextOpening,
  openAt,
  openDuring,
  parseDayRow,
  parseGoogleHours,
  parseRange,
  parseTimeInput,
  toTimeInput,
  weekdayOf,
} from "../src/lib/hours";

describe("parseRange", () => {
  it.each([
    ["12–9 pm", [720, 1260]],
    ["6 am–11 pm", [360, 1380]],
    ["9–11 pm", [1260, 1380]],
    ["11–2 pm", [660, 840]],
    ["10 am–1 am", [600, 1500]],
    ["10 am–12 am", [600, 1440]],
    ["12:30–3 pm", [750, 900]],
    ["4–9 pm", [960, 1260]],
  ])("%s", (text, want) => {
    expect(parseRange(text)).toEqual(want);
  });

  it("rejects nonsense", () => {
    expect(parseRange("soon")).toBeNull();
    expect(parseRange("9 pm")).toBeNull();
  });
});

describe("parseDayRow / parseGoogleHours", () => {
  it("handles split shifts, closed and 24 hours", () => {
    expect(parseDayRow("Tuesday12–3 pm, 7–11 pm")).toEqual({ day: 1, wins: [[720, 900], [1140, 1380]] });
    expect(parseDayRow("Monday Closed")).toEqual({ day: 0, wins: null });
    expect(parseDayRow("Sunday Open 24 hours")).toEqual({ day: 6, wins: [[0, 1440]] });
  });

  it("ignores the private-use icon glyph Google appends to each row", () => {
    expect(parseDayRow("Monday6 am–11 pm")).toEqual({ day: 0, wins: [[360, 1380]] });
    expect(parseDayRow("Friday12–11 pm")).toEqual({ day: 4, wins: [[720, 1380]] });
  });

  it("ignores the private-use icon glyph Google appends to each row", () => {
    expect(parseDayRow("Monday6 am–11 pm")).toEqual({ day: 0, wins: [[360, 1380]] });
    expect(parseDayRow("Friday12–11 pm")).toEqual({ day: 4, wins: [[720, 1380]] });
  });

  it("needs all seven days", () => {
    const rows = ["Monday6 am–11 pm", "Tuesday6 am–11 pm", "Wednesday6 am–11 pm", "Thursday6 am–11 pm", "Friday6 am–11 pm", "Saturday6 am–11 pm"];
    expect(parseGoogleHours(rows)).toBeNull();
    const full = parseGoogleHours([...rows, "Sunday4–9 pm"])!;
    expect(full[6]).toEqual([[960, 1260]]);
    expect(full[0]).toEqual([[360, 1380]]);
  });

  it("returns null for a row it cannot read", () => {
    expect(parseGoogleHours(["Monday??"])).toBeNull();
  });
});

describe("weekdayOf", () => {
  it("matches the 2026 festival days", () => {
    expect(weekdayOf("2026-10-17")).toBe(5); // Saturday, Shashthi
    expect(weekdayOf("2026-10-19")).toBe(0); // Monday, Ashtami
    expect(weekdayOf("2026-10-21")).toBe(2); // Wednesday, Dashami
  });
});

describe("openAt / openDuring", () => {
  const late = { category: "restaurant" as const, hours: [[[720, 1560]], null, [[720, 1380]], [[720, 1380]], [[720, 1380]], [[720, 1380]], [[720, 1380]]] as never };

  it("is open inside a window and closed outside", () => {
    expect(openAt(late, 0, 800).open).toBe(true);
    expect(openAt(late, 0, 700).open).toBe(false);
  });

  it("counts hours that run past midnight on the next morning", () => {
    expect(openAt(late, 1, 30).open).toBe(true); // Monday's window ends 2 am Tuesday
    expect(openAt(late, 1, 200).open).toBe(false);
  });

  it("is closed all day when the weekday is null", () => {
    expect(openAt(late, 1, 800).open).toBe(false);
  });

  it("requires the whole visit to fit", () => {
    expect(openDuring(late, 2, 1300, 1370)).toBe(true);
    expect(openDuring(late, 2, 1350, 1420)).toBe(false);
  });

  it("falls back to typical hours and says so", () => {
    const a = openAt({ category: "pandal" }, 0, 22 * 60);
    expect(a).toMatchObject({ open: true, basis: "typical" });
    expect(openAt({ category: "bonedi_bari" }, 0, 22 * 60).open).toBe(false);
  });

  it("finds the next opening", () => {
    expect(nextOpening(late, 0, 600)).toBe(720);
    expect(nextOpening(late, 0, 1000)).toBeNull();
  });
});

describe("formatting", () => {
  it("formats clocks and windows", () => {
    expect(fmtClock(0)).toBe("12 am");
    expect(fmtClock(750)).toBe("12:30 pm");
    expect(fmtClock(1500)).toBe("1 am");
    expect(fmtWindows([[720, 1260]])).toBe("12 pm – 9 pm");
    expect(fmtWindows(null)).toBe("Closed");
    expect(fmtWindows([[0, 1440]])).toBe("Open 24 hours");
  });

  it("round-trips time inputs", () => {
    expect(parseTimeInput("19:30")).toBe(1170);
    expect(toTimeInput(1170)).toBe("19:30");
    expect(parseTimeInput("x")).toBeNull();
  });
});

import { openStatus } from "../src/lib/hours";

describe("openStatus", () => {
  const cafe = { category: "cafe" as const, hours: [[[600, 1320]], [[600, 1320]], null, [[600, 1320]], [[600, 1320]], [[600, 1320]], [[600, 1320]]] as never };
  it("describes listed hours", () => {
    expect(openStatus(cafe, 0, 700)).toMatchObject({ tone: "open", text: "Open · closes 10 pm" });
    expect(openStatus(cafe, 0, 500)).toMatchObject({ tone: "closed", text: "Closed · opens 10 am" });
    expect(openStatus(cafe, 2, 700)).toMatchObject({ tone: "closed", text: "Closed today" });
    expect(openStatus(cafe, 0, 1400)).toMatchObject({ tone: "closed", text: "Closed for the day" });
  });
  it("is honest when hours are only assumed", () => {
    expect(openStatus({ category: "pandal" }, 0, 20 * 60).tone).toBe("unknown");
    expect(openStatus({ category: "pandal" }, 0, 20 * 60).text).toMatch(/Usually/);
  });
});
