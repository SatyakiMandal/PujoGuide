import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { openApp, openAutoPlanner } from "./helpers";

/** Serious and critical WCAG A/AA problems fail the test; the report names the rule and element. */
async function scan(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    // The map canvas is an image of tiles; its own attribution links are third-party.
    .exclude(".maplibregl-map")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = bad.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
  expect(summary, `${label}: ${summary.join("\n")}`).toEqual([]);
}

test("explore view", async ({ page }) => {
  await openApp(page);
  await scan(page, "explore");
});

test("place detail with hours card", async ({ page }) => {
  await page.goto("/?place=flurys");
  await expect(page.getByLabel("Hours and ratings")).toBeVisible();
  await scan(page, "detail");
});

test("sight detail with ritual timings", async ({ page }) => {
  await page.goto("/?place=pathuriaghata-rajbari");
  await expect(page.getByText("Puja day timings (approximate)")).toBeVisible();
  await scan(page, "sight detail");
});

test("filters panel", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: /Filters/ }).click();
  await scan(page, "filters");
});

test("auto-planner form and results", async ({ page }) => {
  await openApp(page);
  await openAutoPlanner(page);
  await scan(page, "planner form");
  await page.getByRole("button", { name: "Plan my day" }).click();
  await expect(page.getByRole("region", { name: /plan$/ })).toBeVisible();
  await scan(page, "planner results");
});

test("plan view with a route", async ({ page }) => {
  await page.goto("/?route=deshapriya-park,maddox-square,singhi-park");
  await expect(page.getByText("Singhi Park")).toBeVisible();
  await scan(page, "route");
});

test("keyboard: tabs and chips are reachable and operable", async ({ page }) => {
  await openApp(page);
  await page.getByRole("tab", { name: /^Plan/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Plan my day" })).toBeVisible();
  const chip = page.getByRole("button", { name: /Navami/ });
  await chip.focus();
  await page.keyboard.press("Space");
  await expect(chip).toHaveAttribute("aria-pressed", "true");
});
