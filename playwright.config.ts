import { defineConfig, devices } from "@playwright/test";

/**
 * Two static builds are served (both made by `npm run pretest`):
 *   - dist-test       on :4321 — every PUBLIC_* flag empty except the contact email (the default site)
 *   - dist-test-flags on :4322 — docs, GitHub and form endpoint all set
 */
export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 1 : 0,
  workers: process.env["CI"] ? 2 : 4,
  reporter: process.env["CI"] ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4321",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npx astro preview --port 4321 --host 127.0.0.1 --ignore-lock",
      url: "http://127.0.0.1:4321/",
      env: { ASTRO_OUT_DIR: "dist-test" },
      reuseExistingServer: !process.env["CI"],
      timeout: 60_000,
    },
    {
      command: "npx astro preview --port 4322 --host 127.0.0.1 --ignore-lock",
      url: "http://127.0.0.1:4322/",
      env: { ASTRO_OUT_DIR: "dist-test-flags" },
      reuseExistingServer: !process.env["CI"],
      timeout: 60_000,
    },
  ],
});
