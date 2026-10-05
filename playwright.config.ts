import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

/**
 * Runs against a production build (`npm run test:e2e` builds first), because the service worker and
 * performance only behave like the real thing there. Uses the Chrome already installed on the machine.
 */
const chrome = { channel: "chrome" as const };

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  retries: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e-report" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...chrome,
  },
  projects: [
    { name: "desktop-light", use: { ...devices["Desktop Chrome"], ...chrome, viewport: { width: 1280, height: 800 }, colorScheme: "light" } },
    { name: "desktop-dark", use: { ...devices["Desktop Chrome"], ...chrome, viewport: { width: 1280, height: 800 }, colorScheme: "dark" } },
    { name: "laptop-narrow", use: { ...devices["Desktop Chrome"], ...chrome, viewport: { width: 1024, height: 640 }, colorScheme: "light" } },
    { name: "tablet", use: { ...devices["Desktop Chrome"], ...chrome, viewport: { width: 768, height: 1024 }, hasTouch: true, colorScheme: "light" } },
    { name: "phone-light", use: { ...devices["Pixel 7"], ...chrome, colorScheme: "light" } },
    { name: "phone-dark", use: { ...devices["Pixel 7"], ...chrome, colorScheme: "dark" } },
    { name: "phone-small", use: { ...devices["Pixel 7"], ...chrome, viewport: { width: 360, height: 640 }, colorScheme: "light" } },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
