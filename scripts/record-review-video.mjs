#!/usr/bin/env node
/**
 * Records the "drift review queue" video from a locally running LanCompass demo estate.
 *
 *   LANCOMPASS_DEMO_URL=http://localhost:3010 \
 *   LANCOMPASS_DEMO_USER=... LANCOMPASS_DEMO_PASS=... \
 *   LANCOMPASS_CAPTURE_THEME=light LANCOMPASS_VIDEO_UI=en \
 *   LANCOMPASS_VIDEO_DIR=public/media node scripts/record-review-video.mjs
 *
 * Read-only, like the screenshot script: it signs in, sets theme and language in this
 * browser's localStorage only, scrolls the review queue, opens one ghost link on the
 * topology through the review queue's own deep link (the Observed layer is lifted in view
 * state only), and returns. It never approves, dismisses or edits anything.
 *
 * Writes <dir>/drift-review-queue.webm, a poster (.jpg) and captions in English and Hebrew
 * (.en.vtt, .he.vtt) timed to the same steps. Run it in the Playwright container.
 */
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const base = (process.env.LANCOMPASS_DEMO_URL || "http://localhost:3010").replace(/\/$/, "");
const user = process.env.LANCOMPASS_DEMO_USER || "";
const pass = process.env.LANCOMPASS_DEMO_PASS || "";
const theme = { light: "light", dark: "dark", nightwire: "cyberpunk" }[
  process.env.LANCOMPASS_CAPTURE_THEME || "light"
];
const ui = process.env.LANCOMPASS_VIDEO_UI === "he" ? "he" : "en";
const outDir = process.env.LANCOMPASS_VIDEO_DIR || "public/media";
const key = "drift-review-queue";
if (!user || !pass || !theme) {
  console.error("record: set LANCOMPASS_DEMO_USER, LANCOMPASS_DEMO_PASS and a valid theme.");
  process.exit(1);
}

/** Each step: what happens on screen, how long it stays, and its caption in both languages. */
const steps = [
  {
    seconds: 5,
    en: "The review queue: every place where the documentation and the network disagree.",
    he: "תור הסקירה: כל מקום שבו התיעוד והרשת לא תואמים.",
    run: async (page) => {
      await page.goto(`${base}/review`, { waitUntil: "networkidle" });
    },
  },
  {
    seconds: 6,
    en: "Findings are grouped by kind: IP requests, config compliance, SSH host keys, NAC.",
    he: "הממצאים מקובצים לפי סוג: בקשות IP, תאימות תצורה, מפתחות SSH, NAC.",
    run: async (page) => glide(page, 700, 4),
  },
  {
    seconds: 6,
    en: "Each row says why it was flagged, and links to the device or the link it concerns.",
    he: "כל שורה מסבירה למה סומנה, ומקשרת לרכיב או לקישור שהיא נוגעת בו.",
    run: async (page) => glide(page, 700, 4),
  },
  {
    seconds: 7,
    en: "A ghost link: seen on the wire, missing from the documented topology.",
    he: "קישור רפאים: נצפה ברשת, וחסר בטופולוגיה המתועדת.",
    run: async (page) => {
      await page.goto(`${base}/review`, { waitUntil: "networkidle" });
      const link = page.locator('a[href*="/topology?"][href*="focus=edge:obs-"]').first();
      const href = await link.getAttribute("href");
      await page.goto(new URL(href, base).toString(), { waitUntil: "networkidle" });
    },
  },
  {
    seconds: 5,
    en: "Back in the queue, you decide what is true: document it, or dismiss it.",
    he: "חוזרים לתור ומחליטים מה נכון: לתעד, או לדחות.",
    run: async (page) => {
      await page.goto(`${base}/review`, { waitUntil: "networkidle" });
    },
  },
];

/** A slow, even scroll, so the video reads calmly. */
async function glide(page, distance, seconds) {
  const frames = seconds * 30;
  for (let i = 0; i < frames; i++) {
    await page.mouse.wheel(0, distance / frames);
    await page.waitForTimeout(1000 / 30);
  }
}

const stamp = (s) => {
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = (s % 60).toFixed(3).padStart(6, "0");
  return `${h}:${m}:${sec}`;
};

const browser = await chromium.launch();
await mkdir(outDir, { recursive: true });
const tmp = join(outDir, ".recording");
try {
  // Sign in first, in a context that is not recorded.
  const auth = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const login = await auth.newPage();
  await login.goto(`${base}/login`, { waitUntil: "networkidle" });
  await login
    .locator('input[name="username"], input[autocomplete="username"], input[type="text"]')
    .first()
    .fill(user);
  await login.locator('input[type="password"]').first().fill(pass);
  await Promise.all([
    login.waitForLoadState("networkidle"),
    login.locator('button[type="submit"]').first().click(),
  ]);
  await login.waitForTimeout(1500);
  if (login.url().includes("/login")) throw new Error("sign-in failed");
  const storageState = await auth.storageState();
  await auth.close();

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    locale: ui === "he" ? "he-IL" : "en-US",
    colorScheme: theme === "light" ? "light" : "dark",
    storageState,
    recordVideo: { dir: tmp, size: { width: 1280, height: 720 } },
  });
  await context.addInitScript(
    ([lang, mode]) => {
      const prefs = JSON.parse(localStorage.getItem("lancompass:prefs") || "{}");
      localStorage.setItem(
        "lancompass:prefs",
        JSON.stringify({
          ...prefs,
          theme: mode,
          language: lang,
          tourActive: false,
          tourDone: true,
        }),
      );
    },
    [ui, theme],
  );
  const page = await context.newPage();
  const cues = [];
  const started = Date.now();
  for (const [index, step] of steps.entries()) {
    const from = (Date.now() - started) / 1000;
    const stepStart = Date.now();
    await step.run(page);
    if (index === 0)
      await page.screenshot({ path: join(outDir, `${key}.jpg`), type: "jpeg", quality: 82 });
    const left = step.seconds * 1000 - (Date.now() - stepStart);
    if (left > 0) await page.waitForTimeout(left);
    cues.push({ from, to: (Date.now() - started) / 1000, en: step.en, he: step.he });
  }
  const video = page.video();
  await context.close();
  await rename(await video.path(), join(outDir, `${key}.webm`));
  for (const lang of ["en", "he"]) {
    const body = cues
      .map((c, i) => `${i + 1}\n${stamp(c.from)} --> ${stamp(c.to)}\n${c[lang]}\n`)
      .join("\n");
    await writeFile(join(outDir, `${key}.${lang}.vtt`), `WEBVTT\n\n${body}`);
  }
  console.log(`record: wrote ${outDir}/${key}.{webm,jpg,en.vtt,he.vtt} (${ui} UI)`);
} finally {
  await rm(tmp, { recursive: true, force: true });
  await browser.close();
}
