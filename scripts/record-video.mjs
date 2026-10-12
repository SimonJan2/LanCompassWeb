#!/usr/bin/env node
/**
 * Records one product video from a locally running LanCompass demo estate.
 *
 *   LANCOMPASS_DEMO_URL=http://localhost:3010 \
 *   LANCOMPASS_DEMO_USER=... LANCOMPASS_DEMO_PASS=... \
 *   LANCOMPASS_CAPTURE_THEME=light|nightwire LANCOMPASS_VIDEO_UI=en|he \
 *   LANCOMPASS_VIDEO_DIR=media-library/videos/light-en \
 *   node scripts/record-video.mjs <key>
 *
 * Keys: drift-review-queue, documented-vs-observed, hebrew-native (always he UI).
 *
 * Read-only, like the screenshot script: it signs in, sets theme and language in this
 * browser's localStorage only, then navigates and scrolls. It never clicks a control that
 * changes state: no layer toggles (a toggle writes the saved diagram), approve, dismiss,
 * save, import, sync or enable. The Observed layer is shown only through the review
 * queue's own `focus=edge:obs-…` deep links, which lift it in view state.
 *
 * Writes <dir>/<key>.webm, a poster (.jpg) and captions in English and Hebrew
 * (.en.vtt, .he.vtt). Each scenario is a list of { seconds, en, he, run } steps, so the
 * captions are written from the same steps as the picture. Run it in the Playwright
 * container. Credentials only ever come from the environment.
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
const key = process.argv[2] || "";
const ui = key === "hebrew-native" || process.env.LANCOMPASS_VIDEO_UI === "he" ? "he" : "en";
const outDir = process.env.LANCOMPASS_VIDEO_DIR || "media-library/videos";
if (!user || !pass || !theme) {
  console.error("record: set LANCOMPASS_DEMO_USER, LANCOMPASS_DEMO_PASS and a valid theme.");
  process.exit(1);
}

/** Opens the n-th ghost link the review queue lists (a deep link, view state only). */
async function ghostLink(page, n) {
  await page.goto(`${base}/review`, { waitUntil: "networkidle" });
  const links = page.locator('a[href*="/topology?"][href*="focus=edge:obs-"]');
  const hrefs = [
    ...new Set(await links.evaluateAll((as) => as.map((a) => a.getAttribute("href")))),
  ];
  if (hrefs.length <= n) throw new Error(`the review queue lists ${hrefs.length} ghost links`);
  await page.goto(new URL(hrefs[n], base).toString(), { waitUntil: "networkidle" });
}

/** Scrolls the review queue until its first ghost link is in view. */
async function toGhostLinks(page) {
  await page.goto(`${base}/review`, { waitUntil: "networkidle" });
  const link = page.locator('a[href*="/topology?"][href*="focus=edge:obs-"]').first();
  await link.scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, -160);
}

/** Each step: what happens on screen, how long it stays, and its caption in both languages. */
const scenarios = {
  "drift-review-queue": [
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
      run: async (page) => ghostLink(page, 0),
    },
    {
      seconds: 5,
      en: "Back in the queue, you decide what is true: document it, or dismiss it.",
      he: "חוזרים לתור ומחליטים מה נכון: לתעד, או לדחות.",
      run: async (page) => {
        await page.goto(`${base}/review`, { waitUntil: "networkidle" });
      },
    },
  ],
  "documented-vs-observed": [
    {
      seconds: 6,
      en: "The review queue lists links seen on the wire that the documentation doesn't have.",
      he: "תור הסקירה מציג קישורים שנצפו ברשת ואין להם תיעוד.",
      run: toGhostLinks,
    },
    {
      seconds: 7,
      en: "The topology with the Observed layer on: the documented links, and a ghost link beside them.",
      he: "הטופולוגיה עם שכבת ״נצפה״: הקישורים המתועדים, ולידם קישור רפאים.",
      run: async (page) => ghostLink(page, 0),
    },
    {
      seconds: 6,
      en: "Another ghost link: a neighbour the switches report over LLDP or CDP, not in the record.",
      he: "עוד קישור רפאים: שכן שהמתגים מדווחים עליו ב־LLDP או ב־CDP, ואין לו תיעוד.",
      run: async (page) => ghostLink(page, 1),
    },
    {
      seconds: 6,
      en: "A third ghost link, in another part of the network.",
      he: "קישור רפאים שלישי, בחלק אחר של הרשת.",
      run: async (page) => ghostLink(page, 2),
    },
    {
      seconds: 5,
      en: "Back in the queue, you decide what to document.",
      he: "חוזרים לתור ומחליטים מה לתעד.",
      run: toGhostLinks,
    },
  ],
  "hebrew-native": [
    {
      seconds: 6,
      en: "The whole interface in Hebrew, laid out right to left.",
      he: "כל הממשק בעברית, בפריסה מימין לשמאל.",
      run: async (page) => {
        await page.goto(`${base}/`, { waitUntil: "networkidle" });
      },
    },
    {
      seconds: 7,
      en: "The prefix hierarchy, with Hebrew site names next to the addresses.",
      he: "היררכיית הקידומות, עם שמות אתרים בעברית לצד הכתובות.",
      run: async (page) => {
        await page.goto(`${base}/tree`, { waitUntil: "networkidle" });
        await glide(page, 300, 3);
      },
    },
    {
      seconds: 6,
      en: "A rack elevation, labelled in Hebrew.",
      he: "שרטוט ארון, עם תוויות בעברית.",
      run: async (page) => {
        await page.goto(`${base}/racks`, { waitUntil: "networkidle" });
        const href = await page
          .locator('a[href^="/racks/"]:has-text("DC-A01")')
          .first()
          .getAttribute("href");
        await page.goto(new URL(href, base).toString(), { waitUntil: "networkidle" });
      },
    },
    {
      seconds: 6,
      en: "The review queue. The interface ships in 24 languages, with full Hebrew and Arabic right to left.",
      he: "ותור הסקירה. הממשק זמין ב־24 שפות, עם עברית וערבית מלאות מימין לשמאל.",
      run: async (page) => {
        await page.goto(`${base}/review`, { waitUntil: "networkidle" });
      },
    },
  ],
};

const steps = scenarios[key];
if (!steps) {
  console.error(`record: unknown key "${key}"; use one of ${Object.keys(scenarios).join(", ")}.`);
  process.exit(1);
}

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
