#!/usr/bin/env node
/**
 * Captures product screenshots from a locally running LanCompass demo estate.
 *
 *   LANCOMPASS_DEMO_URL=http://localhost:3010 \
 *   LANCOMPASS_DEMO_USER=... LANCOMPASS_DEMO_PASS=... npm run capture
 *
 * Read-only: it signs in, sets the theme and language in this browser's
 * localStorage only ("lancompass:prefs"), visits each screen and saves a 2×
 * PNG to src/assets/screens/<locale>/<screen>.png. It never clicks anything
 * that changes data or settings. Missing screens are reported, not faked.
 * Run it in the Playwright container (see README.md).
 */
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const base = (process.env.LANCOMPASS_DEMO_URL || "http://localhost:3010").replace(/\/$/, "");
const user = process.env.LANCOMPASS_DEMO_USER || "";
const pass = process.env.LANCOMPASS_DEMO_PASS || "";
const outRoot = fileURLToPath(new URL("../src/assets/screens/", import.meta.url));

/** Screen key → product route and the element that proves it rendered. */
const screens = [
  { key: "dashboard", path: "/", ready: "main" },
  { key: "ipam-tree", path: "/tree", ready: "main" },
  { key: "rack", path: "/racks", ready: "main" },
  { key: "topology-observed", path: "/topology", ready: "main" },
  { key: "review", path: "/review", ready: "main" },
  { key: "deep-discovery", path: "/services", ready: "main" },
  { key: "nac", path: "/nac", ready: "main" },
  { key: "compliance", path: "/reports", ready: "main" }, // compliance report lives under Reports
];
const locales = ["en", "he"];

function fail(message) {
  console.error(`capture: ${message}`);
  console.error(
    `capture: missing — ${locales.flatMap((l) => screens.map((s) => `${l}/${s.key}`)).join(", ")}`,
  );
  process.exit(1);
}

if (!user || !pass)
  fail("LANCOMPASS_DEMO_USER and LANCOMPASS_DEMO_PASS must be set; nothing captured.");

const browser = await chromium.launch();
const captured = [];
const missing = [];
try {
  for (const locale of locales) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      locale: locale === "he" ? "he-IL" : "en-US",
      reducedMotion: "reduce",
    });
    await context.addInitScript(
      ([lang]) => {
        try {
          const prefs = JSON.parse(localStorage.getItem("lancompass:prefs") || "{}");
          localStorage.setItem(
            "lancompass:prefs",
            JSON.stringify({ ...prefs, theme: "dark", language: lang }),
          );
        } catch {
          /* first visit */
        }
      },
      [locale],
    );
    const page = await context.newPage();
    await page.goto(`${base}/login`, { waitUntil: "networkidle" });
    if (page.url().includes("/login")) {
      await page
        .locator('input[name="username"], input[autocomplete="username"], input[type="text"]')
        .first()
        .fill(user);
      await page.locator('input[type="password"]').first().fill(pass);
      await Promise.all([
        page.waitForLoadState("networkidle"),
        page.locator('button[type="submit"]').first().click(),
      ]);
      await page.waitForTimeout(1500);
      if (page.url().includes("/login"))
        fail(`sign-in failed for locale ${locale}; nothing captured.`);
    }
    await mkdir(`${outRoot}${locale}`, { recursive: true });
    for (const screen of screens) {
      try {
        const response = await page.goto(`${base}${screen.path}`, {
          waitUntil: "networkidle",
          timeout: 30000,
        });
        if (!response || response.status() >= 400 || page.url().includes("/login"))
          throw new Error(`HTTP ${response?.status()}`);
        await page.locator(screen.ready).first().waitFor({ timeout: 15000 });
        await page.waitForTimeout(800);
        const file = `${outRoot}${locale}/${screen.key}.png`;
        await page.screenshot({ path: file, fullPage: false });
        captured.push(`${locale}/${screen.key}`);
      } catch (error) {
        missing.push(`${locale}/${screen.key} (${error.message})`);
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(`capture: captured ${captured.length}: ${captured.join(", ") || "none"}`);
if (missing.length) {
  console.log(`capture: missing ${missing.length}: ${missing.join(", ")}`);
  process.exitCode = 2;
}
console.log("capture: review every image for non-demo data before committing.");
