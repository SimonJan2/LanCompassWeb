#!/usr/bin/env node
/**
 * Runs Lighthouse CI (lighthouserc.json) with Playwright's Chromium, so no
 * system Chrome is needed. Expects `npm run build` to have produced dist/
 * with the default PUBLIC_SITE_URL (http://localhost:4321).
 */
import { spawnSync } from "node:child_process";
import { chromium } from "@playwright/test";

const chromePath = process.env.CHROME_PATH || chromium.executablePath();
const result = spawnSync("npx", ["lhci", "autorun"], {
  stdio: "inherit",
  env: { ...process.env, CHROME_PATH: chromePath },
});
process.exit(result.status ?? 1);
