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
  test("the lineup is the three read-only videos, in order", async ({ page }) => {
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
      const ready = recorded("light", key) || recorded("nightwire", key);
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
      const expectedSet = rendersDark() ? "nightwire" : "light";
      if (recorded(expectedSet, key))
        await expect(frame).toHaveAttribute("data-video-set", expectedSet);
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
          const set = (await frame.getAttribute("data-video-set"))!;
          const want = key === "hebrew-native" ? "he" : ui;
          // A variant that was not recorded falls back to the other language (media.ts).
          if (existsSync(join(media, set, `${key}.${want}.webm`)))
            await expect(frame, `${path} ${key}`).toHaveAttribute("data-video-ui", want);
        }
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

test.describe("recordings on disk", () => {
  const files = (ext: string) =>
    ["light", "nightwire"].flatMap((set) =>
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

  test("every slot is recorded in both sets, for each interface language it shows", () => {
    for (const set of ["light", "nightwire"])
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
