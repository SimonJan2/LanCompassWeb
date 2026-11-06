import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { rendersDark, siteProject } from "./helpers";
import { storyboards } from "../scripts/record-video.mjs";

/**
 * The three video slots on the home page. A slot is "ready" when its recording exists in
 * public/media/<set>/ (src/lib/media.ts); until then it shows "coming soon". The expected
 * state comes from the files on disk, so recording a video flips its slot without a test
 * change. Nothing of a video loads before the slot is near the viewport. When captions turn
 * on, the page language's track is the one showing (src/scripts/site.ts), whatever the
 * browser prefers, and the visitor can still switch to the other.
 */

const slots = ["drift-review-queue", "documented-vs-observed", "hebrew-native"] as const;
const media = join(process.cwd(), "public", "media");
const recorded = (set: string, key: string) =>
  ["en", "he"].some((ui) => existsSync(join(media, set, `${key}.${ui}.webm`)));

/** The player the visitor sees: in auto, the one whose scheme matches. */
function visibleFrame(page: Page, key: string) {
  return page.locator(`figure[data-video="${key}"] .video-frame:visible`);
}

test.describe("video slots", () => {
  test("the lineup is the three videos, in order", async ({ page }) => {
    await page.goto("/");
    const keys = await page
      .locator("figure[data-video]")
      .evaluateAll((els) => els.map((el) => el.getAttribute("data-video")));
    expect(keys).toEqual([...slots]);
  });

  for (const key of slots) {
    test(`${key}: ready exactly when its recording exists, in this theme's set`, async ({
      page,
    }) => {
      // media.ts falls back to the other set, so any recording makes the slot ready.
      const ready = recorded("survey", key) || recorded("night-chart", key);
      expect(siteProject().dist).toBeTruthy();
      await page.goto("/");
      const figure = page.locator(`figure[data-video="${key}"]`);
      await expect(figure).toHaveAttribute("data-video-ready", ready ? "true" : "false");
      if (!ready) {
        await expect(figure.locator(".video-poster")).toBeVisible();
        return;
      }
      const frame = visibleFrame(page, key);
      await expect(frame).toHaveCount(1);
      const expectedSet = rendersDark() ? "night-chart" : "survey";
      // One player per slot (W5): an auto build lists both sets, the dark one behind a
      // prefers-color-scheme: dark <source>.
      if (recorded(expectedSet, key))
        await expect(frame).toHaveAttribute(
          "data-video-set",
          new RegExp(`(^| )${expectedSet}( |$)`),
        );
      if (siteProject().theme === "auto") {
        const media = await frame
          .locator("video source")
          .evaluateAll((els) => els.map((el) => el.getAttribute("media") ?? ""));
        expect(media).toEqual(["(prefers-color-scheme: dark)", ""]);
      }
      // Both caption tracks, neither marked default.
      const tracks = frame.locator("track[kind=captions]");
      await expect(tracks).toHaveCount(2);
      expect(await tracks.evaluateAll((t) => t.map((el) => el.getAttribute("srclang")))).toEqual([
        "en",
        "he",
      ]);
      expect(await frame.locator("track[default]").count()).toBe(0);
      await expect(frame.locator("video")).toHaveAttribute("preload", "none");
    });
  }

  test("the page locale picks the interface language; hebrew-native is always he", async ({
    page,
  }) => {
    for (const [path, ui] of [
      ["/", "en"],
      ["/he/", "he"],
    ] as const) {
      await page.goto(path);
      for (const key of slots) {
        const frames = page.locator(`figure[data-video="${key}"] .video-frame`);
        if ((await frames.count()) === 0) continue;
        for (const frame of await frames.all()) {
          const set = (await frame.getAttribute("data-video-set"))!.split(" ")[0]!;
          const want = key === "hebrew-native" ? "he" : ui;
          // A variant that was not recorded falls back to the other language (media.ts).
          if (existsSync(join(media, set, `${key}.${want}.webm`)))
            await expect(frame, `${path} ${key}`).toHaveAttribute("data-video-ui", want);
        }
      }
    }
  });

  test("each slot links to what the video shows: its steps on /videos/, in the page's language", async ({
    page,
  }) => {
    for (const [path, lang, videos] of [
      ["/", "en", "/videos/"],
      ["/he/", "he", "/he/videos/"],
    ] as const) {
      await page.goto(path);
      for (const key of slots) {
        const board = storyboards[key] as { title: Record<string, string> };
        const caption = page.locator(`figure[data-video="${key}"] figcaption`);
        await expect(caption, `${path} ${key}`).toContainText(board.title[lang]!);
        await expect(caption.locator("a.video-shows")).toHaveAttribute("href", `${videos}#${key}`);
      }
      await page.goto(videos);
      for (const key of slots) {
        const steps = (storyboards[key] as { steps: Record<string, string>[] }).steps;
        const items = page.locator(`section#${key} ol[data-video-steps] li`);
        await expect(items, `${videos} ${key}`).toHaveCount(steps.length);
        const texts = (await items.allTextContents()).map((t) => t.trim());
        expect(texts, `${videos} ${key}`).toEqual(steps.map((s) => s[lang]));
      }
    }
  });

  test("no video, poster or caption request before the slots are scrolled into view", async ({
    page,
  }) => {
    const early: string[] = [];
    let scrolled = false;
    page.on("request", (r) => {
      const path = new URL(r.url()).pathname;
      if (path.startsWith("/media/") && !scrolled) early.push(path);
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    expect(early).toEqual([]);
    scrolled = true;
  });

  test("a ready video plays in Chromium (currentTime advances)", async ({ page }) => {
    await page.goto("/");
    const figure = page.locator('figure[data-video="drift-review-queue"]');
    test.skip((await figure.getAttribute("data-video-ready")) !== "true", "no recording yet");
    const video = visibleFrame(page, "drift-review-queue").locator("video");
    await video.scrollIntoViewIfNeeded();
    await video.evaluate(async (v: HTMLVideoElement) => {
      v.muted = true;
      await v.play();
    });
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 15_000 })
      .toBeGreaterThan(0.2);
    // The recording that plays is the page's scheme's own: Night chart where the page renders
    // dark (a dark build, or auto under a dark scheme), Survey otherwise.
    const src = await video.evaluate((v: HTMLVideoElement) => v.currentSrc);
    expect(src).toContain(`/media/${rendersDark() ? "night-chart" : "survey"}/`);
  });
});

/** Turns captions on the way a browser does under a "captions on" preference: it shows the
 *  track in the browser's own language (navigator.language), which here is the other one. */
function captionsOnByPreference(page: Page, key: string) {
  return visibleFrame(page, key)
    .locator("video")
    .evaluate((v: HTMLVideoElement) => {
      const want = navigator.language.slice(0, 2);
      for (const t of Array.from(v.textTracks)) if (t.language === want) t.mode = "showing";
    });
}

const showing = (page: Page, key: string) =>
  visibleFrame(page, key)
    .locator("video")
    .evaluate(
      (v: HTMLVideoElement) =>
        Array.from(v.textTracks)
          .filter((t) => t.mode === "showing")
          .map((t) => t.language)
          .join(",") || "none",
    );

for (const [path, pageLang, browserLocale] of [
  ["/", "en", "he-IL"],
  ["/he/", "he", "en-US"],
] as const) {
  test.describe(`caption language on ${path} with the browser in ${browserLocale}`, () => {
    test.use({ locale: browserLocale });

    for (const key of slots) {
      test(`${key}: the page's track shows, and the visitor's switch stays`, async ({ page }) => {
        await page.goto(path);
        const figure = page.locator(`figure[data-video="${key}"]`);
        test.skip((await figure.getAttribute("data-video-ready")) !== "true", "no recording yet");
        const video = visibleFrame(page, key).locator("video");
        await video.scrollIntoViewIfNeeded();
        await video.evaluate(async (v: HTMLVideoElement) => {
          v.muted = true;
          await v.play();
        });
        await captionsOnByPreference(page, key);
        await expect.poll(() => showing(page, key)).toBe(pageLang);
        // The visitor picks the other language in the menu: no fight, it stays.
        await video.evaluate((v: HTMLVideoElement) => {
          for (const t of Array.from(v.textTracks))
            t.mode = t.language === document.documentElement.lang ? "disabled" : "showing";
        });
        await page.waitForTimeout(400);
        expect(await showing(page, key)).toBe(pageLang === "en" ? "he" : "en");
      });
    }
  });
}

/** The W3 screen sets: every key in Survey and Night chart, en and he, full and focus crop. */
const screensDir = join(process.cwd(), "src", "assets", "screens");
const W3_KEYS = [
  "dashboard",
  "ipam-tree",
  "rack",
  "topology-observed",
  "review",
  "nac",
  "compliance",
  "discovery-queue",
  "map-ages",
  "ask-the-map",
  "design-studio",
  "rack-studio",
  "ip-plan",
  "licence",
  "gallery",
];
/** A PNG's width and height, from its IHDR chunk. */
function pngSize(file: string): { width: number; height: number } {
  const b = readFileSync(file);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

test.describe("screen sets on disk (W3)", () => {
  test.beforeEach(() => {
    test.skip(siteProject().theme !== "light", "a source check: light project only");
  });
  const record = JSON.parse(
    readFileSync(join(process.cwd(), "media-library", "screens", "CAPTURED.json"), "utf8"),
  ) as { sets: string[]; locales: string[]; undone?: string[]; keys: Record<string, unknown> };
  const anchors = JSON.parse(
    readFileSync(join(process.cwd(), "src", "content", "screen-anchors.json"), "utf8"),
  ) as Record<
    string,
    Record<
      string,
      Record<
        string,
        {
          clip: { x: number; y: number; width: number; height: number };
          full: { name: string; x: number; y: number; w: number; h: number }[];
          focus: { name: string; x: number; y: number; w: number; h: number }[];
        }
      >
    >
  >;

  test("only the survey and night-chart sets; no light or nightwire screen folder", () => {
    expect(readdirSync(screensDir).sort()).toEqual(["night-chart", "survey"]);
    expect(
      readdirSync(join(process.cwd(), "media-library", "screens"))
        .filter((f) => !f.endsWith(".json"))
        .sort(),
    ).toEqual(["night-chart", "survey"]);
    expect(record.sets).toEqual(["night-chart", "survey"]);
  });

  test("each of the fifteen keys exists in both sets and both locales, full and crop (or is listed as undone)", () => {
    const undone = new Set(record.undone ?? []);
    for (const set of ["survey", "night-chart"])
      for (const locale of ["en", "he"])
        for (const key of W3_KEYS) {
          if (undone.has(`${set}/${locale}/${key}`)) continue;
          for (const file of [`${key}.png`, `${key}.focus.png`])
            expect(
              existsSync(join(screensDir, set, locale, file)),
              `${set}/${locale}/${file}`,
            ).toBe(true);
        }
  });

  test("full windows are 2,880 × 1,800; crops are at least 1,520 wide", () => {
    for (const set of ["survey", "night-chart"])
      for (const locale of ["en", "he"])
        for (const file of readdirSync(join(screensDir, set, locale)).filter((f) =>
          f.endsWith(".png"),
        )) {
          const { width, height } = pngSize(join(screensDir, set, locale, file));
          if (file.endsWith(".focus.png")) {
            expect(width, file).toBeGreaterThanOrEqual(1520);
            expect(height, file).toBeGreaterThanOrEqual(950);
          } else expect([width, height], `${set}/${locale}/${file}`).toEqual([2880, 1800]);
        }
  });

  test("every crop has its clip recorded, and every anchor lies inside its image", () => {
    for (const set of ["survey", "night-chart"])
      for (const locale of ["en", "he"])
        for (const key of W3_KEYS) {
          const a = anchors[set]?.[locale]?.[key];
          expect(a, `${set}/${locale}/${key}`).toBeTruthy();
          const crop = pngSize(join(screensDir, set, locale, `${key}.focus.png`));
          expect([a!.clip.width * 2, a!.clip.height * 2]).toEqual([crop.width, crop.height]);
          for (const n of a!.full) {
            expect(n.x + n.w, `${key} ${n.name}`).toBeLessThanOrEqual(2880);
            expect(n.y + n.h, `${key} ${n.name}`).toBeLessThanOrEqual(1800);
            expect(Math.min(n.x, n.y, n.w, n.h)).toBeGreaterThanOrEqual(0);
          }
          for (const n of a!.focus) {
            expect(n.x + n.w, `${key} ${n.name} (crop)`).toBeLessThanOrEqual(crop.width);
            expect(n.y + n.h, `${key} ${n.name} (crop)`).toBeLessThanOrEqual(crop.height);
            expect(Math.min(n.x, n.y, n.w, n.h)).toBeGreaterThanOrEqual(0);
          }
        }
  });

  test("the retired deep-discovery key appears nowhere in src/", () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (/\.(astro|ts|json|mdx|css|mjs)$/.test(e.name))
          if (readFileSync(full, "utf8").includes("deep-discovery")) hits.push(full);
      }
    };
    walk(join(process.cwd(), "src"));
    expect(hits).toEqual([]);
  });
});

test.describe("screen slots", () => {
  /** The capture set a project's build shows (src/lib/screens.ts → findScreen). */
  const screenSet = () => (siteProject().theme === "dark" ? "night-chart" : "survey");
  const captured = (locale: string, key: string) =>
    [`${key}.png`, `${key}.focus.png`].some((f) =>
      existsSync(join(process.cwd(), "src", "assets", "screens", screenSet(), locale, f)),
    );

  for (const [path, locale] of [
    ["/", "en"],
    ["/he/", "he"],
  ] as const) {
    test(`${path}: a key without a capture renders the placeholder frame with its alt text`, async ({
      page,
    }) => {
      await page.goto(path);
      const keys = await page
        .locator("#whats-new .shot[data-screen]")
        .evaluateAll((els) => els.map((el) => el.getAttribute("data-screen")!));
      expect(keys).toEqual(["map-ages", "ask-the-map", "design-studio"]);
      for (const key of keys) {
        const frame = page.locator(`#whats-new .shot[data-screen="${key}"]`);
        if (captured(locale, key)) {
          await expect(frame).toHaveAttribute("data-captured", "true");
          await expect(frame.locator("img")).toHaveAttribute("alt", /\S/);
        } else {
          await expect(frame).toHaveAttribute("data-captured", "false");
          const placeholder = frame.locator(".shot-placeholder[role=img]");
          await expect(placeholder).toHaveCount(1);
          await expect(placeholder).toHaveAttribute("aria-label", /\S{3,}/);
          await expect(frame.locator("img")).toHaveCount(0);
        }
      }
    });
  }
});

test.describe("recordings on disk", () => {
  const files = (ext: string) =>
    ["survey", "night-chart"].flatMap((set) =>
      readdirSync(join(media, set))
        .filter((f) => f.endsWith(ext))
        .map((f) => join(set, f)),
    );
  const cues = (vtt: string) =>
    vtt
      .split(/\n\n+/)
      .filter((block) => block.includes("-->"))
      .map((block) =>
        block
          .split("\n")
          .slice(block.split("\n")[0]!.includes("-->") ? 1 : 2)
          .join(" "),
      );

  test.beforeEach(() => {
    test.skip(siteProject().theme !== "light", "a source check: light project only");
  });

  test("only the survey and night-chart sets; no light or nightwire folder (W5)", () => {
    const sets = readdirSync(media, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
    expect(sets).toEqual(["night-chart", "survey"]);
    const library = join(process.cwd(), "media-library", "videos");
    const folders = readdirSync(library, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
    expect(folders).toEqual(["night-chart-en", "night-chart-he", "survey-en", "survey-he"]);
  });

  test("every Hebrew cue starts with a Hebrew letter or U+200F, so it reads right to left", () => {
    const vtts = files(".he.vtt");
    expect(vtts.length).toBe(10);
    for (const file of vtts)
      for (const cue of cues(readFileSync(join(media, file), "utf8")))
        expect(cue, file).toMatch(/^[‏א-ת]/);
  });

  test("every slot is recorded in both sets, for each interface language it shows", () => {
    for (const set of ["survey", "night-chart"])
      for (const key of slots)
        for (const ui of key === "hebrew-native" ? ["he"] : ["en", "he"])
          for (const ext of ["webm", "webp", "en.vtt", "he.vtt"])
            expect(
              existsSync(join(media, set, `${key}.${ui}.${ext}`)),
              `${set}/${key}.${ui}.${ext}`,
            ).toBe(true);
  });

  test("caption files: English has no Hebrew, Hebrew has Hebrew in every cue, one cue per step and card", () => {
    const vtts = files(".vtt");
    expect(vtts.length).toBeGreaterThan(0);
    for (const file of vtts) {
      const text = readFileSync(join(media, file), "utf8");
      const key = file.split("/")[1]!.split(".")[0] as keyof typeof storyboards;
      const list = cues(text);
      if (file.endsWith(".en.vtt")) expect(text, file).not.toMatch(/[\u0590-\u05FF]/);
      else for (const cue of list) expect(cue, file).toMatch(/[\u0590-\u05FF]/);
      expect(text, `${file} names its storyboard`).toContain(`NOTE storyboard ${key}:`);
      expect(list.length, file).toBe(storyboards[key].steps.length + 2);
    }
  });

  test("each recording plays, runs 25–46 s and is at most 10 MB (10,000,000 bytes)", async ({
    page,
  }) => {
    const webms = files(".webm");
    expect(webms.length).toBe(10);
    await page.goto("/");
    for (const file of webms) {
      expect(statSync(join(media, file)).size, file).toBeLessThanOrEqual(10_000_000);
      const duration = await page.evaluate(async (src) => {
        const v = document.createElement("video");
        v.muted = true;
        v.preload = "auto";
        v.src = src;
        await new Promise((ok, fail) => {
          v.onloadedmetadata = ok;
          v.onerror = fail;
        });
        // A recorded WebM may not carry its duration; seeking past the end finds it.
        const seek = (t: number) =>
          new Promise((ok) => {
            v.onseeked = ok;
            v.currentTime = t;
          });
        if (v.duration === Infinity) await seek(1e6);
        const length = Number.isFinite(v.duration) ? v.duration : v.currentTime;
        await seek(0);
        await v.play();
        await new Promise((ok) => setTimeout(ok, 500));
        const advanced = v.currentTime > 0.1;
        v.pause();
        return advanced ? length : -1;
      }, `/media/${file}`);
      expect(duration, file).toBeGreaterThanOrEqual(25);
      expect(duration, file).toBeLessThanOrEqual(46);
    }
  });
});
