import { expect, test } from "@playwright/test";
import { openApp, watchErrors } from "./helpers";

test("loads the map and the places list without errors", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible();
  await expect(page.getByRole("button", { name: /Bonedi Baris/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /Pandals/ })).toHaveAttribute("aria-pressed", "true");
  // Food is off by default, so only baris and pandals are listed.
  await expect(page.getByRole("button", { name: /Cafes/ })).toHaveAttribute("aria-pressed", "false");
  expect(errors).toEqual([]);
});

test("search finds a place and opens its detail with hours and ritual timings", async ({ page }) => {
  await openApp(page);
  await page.getByPlaceholder(/Search pandals/).fill("Pathuriaghata");
  await page.getByRole("button", { name: /Pathuriaghata Rajbari/ }).first().click();
  await expect(page.getByRole("heading", { name: "Pathuriaghata Rajbari" })).toBeVisible();
  await expect(page.getByText("Puja day timings (approximate)")).toBeVisible();
  await expect(page.getByText(/Sandhi Puja timing is from Belur Math/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to route" })).toBeVisible();
});

test("merged duplicates appear once and under their alias", async ({ page }) => {
  await openApp(page);
  await page.getByPlaceholder(/Search pandals/).fill("Khelat");
  await expect(page.getByRole("button", { name: /^Pathuriaghata Rajbari/ })).toHaveCount(1);
  await page.getByPlaceholder(/Search pandals/).fill("Mudiali Park");
  await expect(page.getByRole("button", { name: /^Mudiali Club/ })).toHaveCount(1);
});

test("deep link ?place= opens the place", async ({ page }) => {
  await page.goto("/?place=mudiali-club");
  await expect(page.getByRole("heading", { name: "Mudiali Club" })).toBeVisible();
});

test("a food place shows rating and opening hours from the Google Maps snapshot", async ({ page }) => {
  await page.goto("/?place=flurys");
  await expect(page.getByRole("heading", { name: "Flurys" })).toBeVisible();
  await expect(page.getByLabel("Hours and ratings")).toBeVisible();
  await expect(page.getByRole("table")).toContainText("Mon");
  await expect(page.getByLabel(/Rated \d\.\d out of 5/)).toBeVisible();
});

test("places Google lists as closed are not offered", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: /Restaurants/ }).click();
  await page.getByPlaceholder(/Search pandals/).fill("Soul - The Sky Lounge");
  await expect(page.getByRole("button", { name: /^Soul - The Sky Lounge/ })).toHaveCount(0);
});

test("filters: highlight vs filter mode changes the shown count", async ({ page }) => {
  await openApp(page);
  const count = async () => Number((await page.getByText(/\d+ of \d+ shown/).innerText()).match(/^(\d+)/)![1]);
  const before = await count();
  await page.getByRole("button", { name: /Filters/ }).click();
  await page.getByRole("button", { name: "Salt Lake" }).first().click();
  await page.getByRole("radio", { name: "Filter" }).click();
  await expect.poll(count).toBeLessThan(before);
});
