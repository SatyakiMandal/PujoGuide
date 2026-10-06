import { expect, test } from "@playwright/test";
import { exploreTab, openApp, openAutoPlanner, planTab, watchErrors } from "./helpers";

test("auto-planner builds a timed day, loads it as the route and offers a Google Maps link", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await openAutoPlanner(page);

  await page.getByRole("button", { name: /Ashtami/ }).click();
  await page.getByRole("button", { name: /Saptami/ }).click(); // the default day: leave Ashtami only
  await page.getByRole("button", { name: "South", exact: true }).click();
  await page.getByRole("button", { name: "Plan my day" }).click();

  await expect(page.getByRole("region", { name: /Ashtami plan/ })).toBeVisible();
  await expect(page.getByText(/\d+ stops/)).toBeVisible();
  await page.getByRole("button", { name: /Use this plan/ }).click();

  // The route now lives in the Plan tab with planned times and a Google Maps hand-off.
  await expect(page.getByText(/Ashtami.* plan,/)).toBeVisible();
  const maps = page.getByRole("link", { name: /Google Maps/ }).first();
  await expect(maps).toHaveAttribute("href", /google\.com\/maps\/dir\/\?api=1/);
  await expect(maps).toHaveAttribute("target", "_blank");
  await expect(page.getByRole("button", { name: /Optimise order/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test("catching a ritual holds a stop for Pushpanjali on Ashtami", async ({ page }) => {
  await openApp(page);
  await openAutoPlanner(page);
  await page.getByRole("button", { name: /Ashtami/ }).click();
  await page.getByRole("button", { name: /Saptami/ }).click(); // deselect the default, leaving Ashtami only
  await page.locator('input[type="time"]').first().fill("08:00");
  await page.locator('input[type="time"]').nth(1).fill("14:00");
  await page.getByRole("button", { name: "Catch a ritual" }).click();
  await page.getByRole("button", { name: "Plan my day" }).click();
  await expect(page.getByText(/Pushpanjali|Sandhi Puja/).first()).toBeVisible();
  await expect(page.getByText(/approximate guide/)).toBeVisible();
});

test("multi-day planning gives each day its own section without repeats", async ({ page }) => {
  await openApp(page);
  await openAutoPlanner(page);
  await page.getByRole("button", { name: /Ashtami/ }).click();
  await page.getByRole("button", { name: /Navami/ }).click();
  await page.getByRole("button", { name: /Plan 3 days/ }).click(); // Saptami (default) + Ashtami + Navami
  await expect(page.getByRole("region", { name: /plan$/ })).toHaveCount(3);
  const names = await page.getByRole("region", { name: /plan$/ }).locator("li button.truncate").allInnerTexts();
  expect(new Set(names).size).toBe(names.length);
});

test("'find another' swaps a stop out", async ({ page }) => {
  await openApp(page);
  await openAutoPlanner(page);
  await page.getByRole("button", { name: "Plan my day" }).click();
  const first = page.getByRole("region", { name: /plan$/ }).locator("li button.truncate").nth(1);
  const name = await first.innerText();
  await page.getByRole("button", { name: new RegExp(`Not ${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) }).click();
  await expect(page.getByRole("region", { name: /plan$/ }).getByText(name, { exact: true })).toHaveCount(0);
});

test("manual route: add stops from detail, reorder tools and the share link", async ({ page }) => {
  await openApp(page, "/?place=deshapriya-park");
  await page.getByRole("button", { name: "Add to route" }).click();
  await page.getByRole("button", { name: /All places/ }).click();
  await page.getByPlaceholder(/Search pandals/).fill("Maddox");
  await page.getByRole("button", { name: "Add Maddox Square Durga Pujo to route" }).or(page.getByRole("button", { name: /Add Maddox Square.* to route/ })).click();
  await planTab(page).click();
  await expect(page.getByText("Deshapriya Park", { exact: true })).toBeVisible();
  await expect(page.getByText(/^Maddox Square/)).toBeVisible();
  await page.getByRole("button", { name: /Copy link/ }).click();
  await exploreTab(page).click();
});

test("route survives a reload", async ({ page }) => {
  await openApp(page, "/?place=deshapriya-park");
  await page.getByRole("button", { name: "Add to route" }).click();
  await page.reload();
  // The deep link reopens the place; go back to the list to see the tab bar.
  await page.getByRole("button", { name: /All places/ }).click();
  await expect(planTab(page)).toContainText("1");
});

test("shared ?route= link restores a plan", async ({ page }) => {
  await page.goto("/?route=deshapriya-park,maddox-square,singhi-park");
  await expect(page.getByText("Singhi Park")).toBeVisible();
  await expect(planTab(page)).toContainText("3");
});
