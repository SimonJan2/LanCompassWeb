#!/usr/bin/env node
/**
 * Runs Lighthouse CI (lighthouserc.json) with Playwright's Chromium, so no
 * system Chrome is needed.
 *
 *   npm run lhci                    the light site: expects `npm run build` to have produced
 *                                   dist/ with the default PUBLIC_SITE_URL (http://localhost:4321)
 *   LHCI_THEME=dark npm run lhci    builds dist-lhci-dark with PUBLIC_SITE_THEME=dark and runs
 *   LHCI_THEME=auto npm run lhci    the same four URLs and the same budgets against it
 */
import { execFileSync, spawnSync } from "node:child_process";
import { chromium } from "@playwright/test";

const theme = (process.env.LHCI_THEME || "light").trim().toLowerCase();
const env = { ...process.env, CHROME_PATH: process.env.CHROME_PATH || chromium.executablePath() };

if (theme !== "light") {
  const outDir = `dist-lhci-${theme}`;
  console.log(`lhci: building ${outDir} (PUBLIC_SITE_THEME=${theme})`);
  execFileSync("npx", ["astro", "build"], {
    stdio: "inherit",
    env: {
      ...process.env,
      PUBLIC_SITE_THEME: theme,
      PUBLIC_SITE_URL: "http://localhost:4321",
      ASTRO_OUT_DIR: outDir,
    },
  });
  // lighthouserc.json's preview server inherits this and serves the themed build.
  env.ASTRO_OUT_DIR = outDir;
}

const result = spawnSync("npx", ["lhci", "autorun"], { stdio: "inherit", env });
process.exit(result.status ?? 1);
