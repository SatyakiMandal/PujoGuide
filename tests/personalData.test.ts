import { describe, expect, it } from "vitest";
import { generateBackupJSON, restoreBackupJSON } from "../src/lib/personalData";
import { useUI } from "../src/store/ui";

describe("personalData module", () => {
  it("generates a valid backup JSON structure", () => {
    useUI.getState().toggleSaved("baghbazar-sarbojanin");
    useUI.getState().setNote("baghbazar-sarbojanin", "Meet at Gate 2");

    const jsonStr = generateBackupJSON();
    expect(jsonStr).toContain("baghbazar-sarbojanin");
    expect(jsonStr).toContain("Meet at Gate 2");

    const parsed = JSON.parse(jsonStr);
    expect(parsed.version).toBe(1);
    expect(parsed.saved).toContain("baghbazar-sarbojanin");
  });

  it("restores user data from a valid JSON backup string", () => {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      saved: ["college-square"],
      visited: ["ahiritola-sarbojanin"],
      notes: { "college-square": "Go for Pushpanjali at 10 AM" },
      route: { stops: ["college-square", "ahiritola-sarbojanin"] },
    };

    const res = restoreBackupJSON(JSON.stringify(backup));
    expect(res.success).toBe(true);

    const state = useUI.getState();
    expect(state.saved).toContain("college-square");
    expect(state.visited).toContain("ahiritola-sarbojanin");
    expect(state.notes["college-square"]).toBe("Go for Pushpanjali at 10 AM");
  });
});
