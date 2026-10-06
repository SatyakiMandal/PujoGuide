import { expect, type Page } from "@playwright/test";

/** Console messages we expect to see when the machine is offline or a free public service is slow. */
const NOISE = /tile|Failed to load resource|osrm|open-meteo|ERR_|net::|NetworkError|CORS|fetch/i;

export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !NOISE.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

const isMobileWidth = (page: Page) => (page.viewportSize()?.width ?? 1280) < 1024;

/** On phones the panel is a bottom sheet that starts low. Drag its handle to the top snap point. */
export async function expandSheet(page: Page) {
  if (!isMobileWidth(page)) return;
  const handle = page.locator("[data-vaul-handle]");
  await expect(handle).toBeVisible();
  // The sheet slides in on load; wait for it to come to rest before dragging.
  const vh = page.viewportSize()!.height;
  await expect.poll(async () => (await handle.boundingBox())?.y ?? vh, { timeout: 10_000 }).toBeLessThan(vh - 40);
  await page.waitForTimeout(400);
  const box = (await handle.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - 40, { steps: 4 });
  await page.mouse.move(x, 60, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(500);
}

/** Opens the app and waits until the list is interactive. */
export async function openApp(page: Page, path = "/", opts: { expand?: boolean } = {}) {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  if (opts.expand !== false) await expandSheet(page);
}

export const isMobileProject = (name: string) => name.startsWith("phone") || name === "tablet" || name === "laptop-narrow";

/** The Plan tab button (role=tab) in the panel or sheet. */
export const planTab = (page: Page) => page.getByRole("tab", { name: /^Plan/ });
export const exploreTab = (page: Page) => page.getByRole("tab", { name: /^Explore/ });

/** Opens the auto-planner form (the default view of the Plan tab when no route exists). */
export async function openAutoPlanner(page: Page) {
  await planTab(page).click();
  await expect(page.getByRole("heading", { name: /Auto-Planner|Plan my day/ })).toBeVisible();
}
