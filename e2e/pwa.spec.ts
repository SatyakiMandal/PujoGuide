import { expect, test } from "@playwright/test";
import { openApp } from "./helpers";

test("manifest is valid and installable", async ({ page, request }) => {
  await page.goto("/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBeTruthy();
  const res = await request.get(href!);
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m.name).toBeTruthy();
  expect(m.display).toMatch(/standalone|fullscreen|minimal-ui/);
  expect(m.start_url).toBeTruthy();
  const sizes = (m.icons as { sizes: string }[]).map((i) => i.sizes);
  expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  for (const icon of m.icons as { src: string }[]) expect((await request.get(icon.src)).ok()).toBe(true);
});

test("service worker takes control and the app shell loads offline", async ({ page, context }) => {
  await openApp(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Reload once so the worker controls the page and caches the shell.
  await page.reload();
  await expect(page.getByText(/\d+ of \d+ shown/)).toBeVisible();
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: /PujoGuide/ })).toBeVisible();
  await expect(page.getByText(/\d+ of \d+ shown/)).toBeVisible();
  // Saved data still works offline: open a place straight from the bundled data.
  await page.goto("/?place=flurys");
  await expect(page.getByRole("heading", { name: "Flurys" })).toBeVisible();
  await context.setOffline(false);
});

test("a planned route is kept offline", async ({ page, context }) => {
  await page.goto("/?route=deshapriya-park,maddox-square");
  await expect(page.getByText("Maddox Square")).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("tab", { name: /^Plan/ })).toContainText("2");
  await context.setOffline(false);
});
