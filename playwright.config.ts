import { defineConfig, devices } from "@playwright/test";

/**
 * Four static builds are served (all made by `npm run pretest`, scripts/build-test.mjs):
 *   - dist-test       on :4321 — light; every PUBLIC_* flag empty except the contact email
 *   - dist-test-flags on :4322 — light; docs, GitHub and form endpoint all set
 *   - dist-test-dark  on :4323 — PUBLIC_SITE_THEME=dark (form endpoint set)
 *   - dist-test-auto  on :4324 — PUBLIC_SITE_THEME=auto (form endpoint set)
 *
 * Projects: `light` runs every spec against the light builds, exactly as in W1.1. `dark`,
 * `auto-dark` and `auto-light` run the theme-sensitive specs again against the dark and auto
 * builds, the auto build under both emulated colour schemes. Specs read the project's
 * metadata (tests/helpers.ts → siteProject) rather than being copied.
 */
const port = (p: number) => `http://127.0.0.1:${p}`;
const themed = [
  "routes",
  "a11y",
  "rtl",
  "motion",
  "origins",
  "content",
  "hebrew",
  "identity",
  "theme",
  "media",
].map((name) => `${name}.spec.ts`);

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
    baseURL: port(4321),
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "light",
      use: { baseURL: port(4321), colorScheme: "light" },
      metadata: { theme: "light", scheme: "light", dist: "dist-test" },
    },
    // Against the Docker image only the light project runs (container.spec reads DOCKER_BASE_URL).
    ...(process.env["DOCKER_BASE_URL"]
      ? []
      : [
          {
            name: "dark",
            testMatch: themed,
            use: { baseURL: port(4323), colorScheme: "dark" as const },
            metadata: { theme: "dark", scheme: "dark", dist: "dist-test-dark" },
          },
          {
            name: "auto-dark",
            testMatch: themed,
            use: { baseURL: port(4324), colorScheme: "dark" as const },
            metadata: { theme: "auto", scheme: "dark", dist: "dist-test-auto" },
          },
          {
            name: "auto-light",
            testMatch: themed,
            use: { baseURL: port(4324), colorScheme: "light" as const },
            metadata: { theme: "auto", scheme: "light", dist: "dist-test-auto" },
          },
        ]),
  ],
  // Against the Docker image (DOCKER_BASE_URL) the container is the server; the
  // preview builds are neither needed nor built in that job.
  webServer: process.env["DOCKER_BASE_URL"]
    ? []
    : [
        ["dist-test", 4321],
        ["dist-test-flags", 4322],
        ["dist-test-dark", 4323],
        ["dist-test-auto", 4324],
      ].map(([dir, p]) => ({
        command: `npx astro preview --port ${p} --host 127.0.0.1 --ignore-lock`,
        url: `${port(p as number)}/`,
        env: { ASTRO_OUT_DIR: String(dir) },
        reuseExistingServer: !process.env["CI"],
        timeout: 60_000,
      })),
});
