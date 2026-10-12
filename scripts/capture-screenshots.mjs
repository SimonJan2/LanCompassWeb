#!/usr/bin/env node
/**
 * Captures product screenshots from a locally running LanCompass demo estate.
 *
 *   LANCOMPASS_DEMO_URL=http://localhost:3010 \
 *   LANCOMPASS_DEMO_USER=... LANCOMPASS_DEMO_PASS=... \
 *   LANCOMPASS_CAPTURE_THEME=light npm run capture
 *
 * LANCOMPASS_CAPTURE_THEME: "light" (default, sits on the site's paper), "nightwire" (the
 * product's default dark theme) or "dark". LANCOMPASS_CAPTURE_DIR writes the PNGs to another
 * folder (for example media-library/screens/nightwire) instead of src/assets/screens.
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
const theme = process.env.LANCOMPASS_CAPTURE_THEME || "light";
/** Capture theme → the product's own pref value. "nightwire" is the product's default dark
 *  theme, stored as "cyberpunk" in lancompass:prefs. */
const productThemes = { light: "light", dark: "dark", nightwire: "cyberpunk" };
if (!(theme in productThemes)) {
  console.error(
    `capture: LANCOMPASS_CAPTURE_THEME must be one of ${Object.keys(productThemes).join(", ")} (got "${theme}").`,
  );
  process.exit(1);
}
const productTheme = productThemes[theme];
const colorScheme = theme === "light" ? "light" : "dark";
/** Where the PNGs go: the site's screens by default, or a library folder. */
const outRoot = process.env.LANCOMPASS_CAPTURE_DIR
  ? `${process.env.LANCOMPASS_CAPTURE_DIR.replace(/\/$/, "")}/`
  : fileURLToPath(new URL("../src/assets/screens/", import.meta.url));

/**
 * Screen key → product route and the element that proves it rendered. Optional steps,
 * all read-only (navigation and scrolling, never a click that changes state):
 *   follow   — open the first link on the page matching this selector (avoids hard-coding
 *              demo-estate ids);
 *   scrollTo — scroll this element to the top before the capture.
 */
const screens = [
  { key: "dashboard", path: "/", ready: "main" },
  { key: "ipam-tree", path: "/tree", ready: "main" },
  // A rack elevation: the first rack in the list (the demo estate's DC-A01).
  { key: "rack", path: "/racks", follow: 'a[href^="/racks/"]:has-text("DC-A01")', ready: "main" },
  // The observed layer: the review queue's ghost-link deep link opens the topology with
  // the Observed layer lifted in view state only (nothing is saved to the diagram).
  {
    key: "topology-observed",
    path: "/review",
    follow: 'a[href*="/topology?"][href*="focus=edge:obs-"]',
    ready: "main",
  },
  { key: "review", path: "/review", ready: "main" },
  // The demo estate carries no Deep Discovery identities; the Discovery inbox is the
  // screen where discovered hosts (and, with deep discovery on, their identity) land.
  { key: "deep-discovery", path: "/discovery", ready: "main" },
  { key: "nac", path: "/nac", ready: "main" },
  // The compliance report is a section of /reports.
  { key: "compliance", path: "/reports", scrollTo: "#report-compliance", ready: "main" },
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
      colorScheme,
    });
    await context.addInitScript(
      ([lang, mode]) => {
        try {
          const prefs = JSON.parse(localStorage.getItem("lancompass:prefs") || "{}");
          localStorage.setItem(
            "lancompass:prefs",
            // tourDone keeps the guided tour from opening over the screen (browser-only pref).
            JSON.stringify({
              ...prefs,
              theme: mode,
              language: lang,
              tourActive: false,
              tourDone: true,
            }),
          );
        } catch {
          /* first visit */
        }
      },
      [locale, productTheme],
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
        if (screen.follow) {
          const link = page.locator(screen.follow).first();
          await link.waitFor({ timeout: 15000 });
          const href = await link.getAttribute("href");
          await page.goto(new URL(href, base).toString(), {
            waitUntil: "networkidle",
            timeout: 30000,
          });
        }
        await page.locator(screen.ready).first().waitFor({ timeout: 15000 });
        if (screen.scrollTo) {
          const target = page.locator(screen.scrollTo).first();
          await target.waitFor({ timeout: 15000 });
          // Leave room for the product's sticky top bar above the section title.
          await target.evaluate((el) =>
            window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 72),
          );
        }
        await page.waitForTimeout(1200);
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
