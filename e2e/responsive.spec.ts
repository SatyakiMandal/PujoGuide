import { expect, test } from "@playwright/test";
import { openApp, planTab } from "./helpers";

test("no horizontal scroll and the panel fits the viewport", async ({ page }) => {
  await openApp(page);
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  expect(sw).toBeLessThanOrEqual(cw);
});

test("touch targets in the tab bar are at least 40px", async ({ page }) => {
  await openApp(page);
  for (const name of [/^Explore/, /^Plan/]) {
    const box = await page.getByRole("tab", { name }).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(40);
  }
});

test("theme follows the system and can be toggled", async ({ page }, info) => {
  await openApp(page);
  const dark = info.project.name.includes("dark");
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const first = await bg();
  expect(first === "rgb(20, 17, 16)").toBe(dark);
  await page.getByRole("button", { name: /theme|dark mode|light mode/i }).first().click();
  await expect.poll(bg).not.toBe(first);
});

test("planner form is usable at this size", async ({ page }) => {
  await openApp(page);
  await planTab(page).click();
  const submit = page.getByRole("button", { name: "Plan my day" });
  await submit.scrollIntoViewIfNeeded();
  await expect(submit).toBeVisible();
  const box = await submit.boundingBox();
  const vw = page.viewportSize()!.width;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(vw);
});

test("screenshots of the main states", async ({ page }, info) => {
  await openApp(page);
  await page.screenshot({ path: `e2e-report/shots/${info.project.name}-explore.png` });
  await planTab(page).click();
  await page.screenshot({ path: `e2e-report/shots/${info.project.name}-plan.png` });
});
