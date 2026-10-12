import { existsSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { rendersDark, siteProject } from "./helpers";

/**
 * The three video slots on the home page. A slot is "ready" when its recording exists in
 * public/media/<set>/ (src/lib/media.ts); until then it shows "coming soon". The expected
 * state comes from the files on disk, so recording a video flips its slot without a test
 * change. Nothing of a video loads before the slot is near the viewport.
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
