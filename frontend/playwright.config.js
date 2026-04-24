import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for Miron frontend smoke tests.
 *
 * Usage:
 *   npm install --save-dev @playwright/test
 *   npx playwright install --with-deps chromium
 *   npm run test:e2e              # against preview build (vite preview)
 *   PW_TARGET=prod npm run test:e2e  # against the Vercel deployment
 *
 * The config starts `vite preview` on :4173 when PW_TARGET is unset, so a
 * developer can run the suite locally without spinning up anything by hand.
 * CI should set PW_TARGET=prod (or equivalent) and point PW_BASE_URL at the
 * deployed URL to get cross-environment coverage.
 */

const DEV_PORT = 4173;
const LOCAL_BASE = `http://127.0.0.1:${DEV_PORT}`;

const target = (process.env.PW_TARGET || "local").toLowerCase();
const baseURL =
  process.env.PW_BASE_URL ||
  (target === "prod"
    ? "https://mironintelligence.vercel.app"
    : LOCAL_BASE);

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 13"] },
      testIgnore: /api\.spec\.js$/,
    },
  ],
  webServer:
    target === "local"
      ? {
          command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${DEV_PORT}`,
          url: LOCAL_BASE,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        }
      : undefined,
});
