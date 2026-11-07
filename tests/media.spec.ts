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

/** The screen sets (W3; W11): every key in Survey and Night chart, en and he — its whole window
 *  and each slot's crop — recorded in media-library/screens/ and served from public/screens/. */
const libraryDir = join(process.cwd(), "media-library", "screens");
const servedDir = join(process.cwd(), "public", "screens");
const slotTable = JSON.parse(
  readFileSync(join(process.cwd(), "src", "content", "screen-slots.json"), "utf8"),
) as {
  slots: Record<
    string,
    {
      keys: string[];
      crop: { width: number; height: number; serve: number; from?: string } | null;
      phone: { width: number; height: number; serve: number; from?: string } | null;
      full?: { width: number; height: number; serve: number };
    }
  >;
};
/** Every crop the slots ask for: { key, picture, width, height (CSS px), serve (px) }. W13: a
 *  picture with `from` is that slot's crop, reused (the same file, size and clip). */
const crops = Object.entries(slotTable.slots).flatMap(([slot, s]) =>
  s.keys.flatMap((key) => [
    ...(s.crop ? [{ key, ...s.crop, picture: s.crop.from ?? slot }] : []),
    ...(s.phone ? [{ key, ...s.phone, picture: s.phone.from ?? `${slot}-phone` }] : []),
  ]),
);
/** A WebP file's pixel size, from its header (as src/lib/screens.ts → webpSize). */
function webpSize(file: string): { width: number; height: number } {
  const b = readFileSync(file);
  const chunk = b.toString("ascii", 12, 16);
  if (chunk === "VP8 ")
    return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  if (chunk === "VP8L") {
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return { width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1 };
}
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

test.describe("screen sets on disk (W3, W11)", () => {
  test.beforeEach(() => {
    test.skip(siteProject().theme !== "light", "a source check: light project only");
  });
  type Clip = { x: number; y: number; width: number; height: number };
  type Anchor = { name: string; x: number; y: number; w: number; h: number };
  const record = JSON.parse(
    readFileSync(join(process.cwd(), "media-library", "screens", "CAPTURED.json"), "utf8"),
  ) as {
    sets: string[];
    locales: string[];
    undone?: string[];
    keys: Record<string, { clips?: Record<string, Record<string, Clip>> }>;
  };
  const anchors = JSON.parse(
    readFileSync(join(process.cwd(), "src", "content", "screen-anchors.json"), "utf8"),
  ) as Record<
    string,
    Record<string, Record<string, { clips: Record<string, Clip> } & Record<string, unknown>>>
  >;
  const undone = new Set(record.undone ?? []);
  const each = (fn: (set: string, locale: string) => void) => {
    for (const set of ["survey", "night-chart"]) for (const locale of ["en", "he"]) fn(set, locale);
  };

  test("only the survey and night-chart sets; no light or nightwire screen folder; no src/assets/screens", () => {
    expect(existsSync(join(process.cwd(), "src", "assets", "screens"))).toBe(false);
    expect(readdirSync(servedDir).sort()).toEqual(["night-chart", "survey"]);
    expect(
      readdirSync(libraryDir)
        .filter((f) => !f.endsWith(".json") && !f.endsWith(".md"))
        .sort(),
    ).toEqual(["night-chart", "survey"]);
    expect(record.sets).toEqual(["night-chart", "survey"]);
  });

  test("each of the fifteen keys has its whole window, 2,880 × 1,800, in both sets and locales (or is listed as undone)", () => {
    each((set, locale) => {
      for (const key of W3_KEYS) {
        if (undone.has(`${set}/${locale}/${key}`)) continue;
        const file = join(libraryDir, set, locale, `${key}.png`);
        expect(existsSync(file), `${set}/${locale}/${key}.png`).toBe(true);
        expect([pngSize(file).width, pngSize(file).height], file).toEqual([2880, 1800]);
      }
    });
  });

  test("every slot crop exists in both sets and locales, recorded and served, at its serve size", () => {
    each((set, locale) => {
      for (const c of crops) {
        if (undone.has(`${set}/${locale}/${c.key}`)) continue;
        const name = `${set}/${locale}/${c.key}.${c.picture}`;
        const png = join(libraryDir, set, locale, `${c.key}.${c.picture}.png`);
        const webp = join(servedDir, set, locale, `${c.key}.${c.picture}.webp`);
        expect(existsSync(png), `${name}.png`).toBe(true);
        expect(existsSync(webp), `${name}.webp`).toBe(true);
        const size = { width: c.serve, height: Math.round((c.serve * c.height) / c.width) };
        expect(pngSize(png), `${name}.png`).toEqual(size);
        expect(webpSize(webp), `${name}.webp`).toEqual(size);
      }
      // The whole windows the slots draw: the loop's, and each figure's "Open the full screen".
      for (const [slot, s] of Object.entries(slotTable.slots))
        for (const key of s.keys) {
          if (undone.has(`${set}/${locale}/${key}`)) continue;
          if (s.full)
            expect(webpSize(join(servedDir, set, locale, `${key}.${slot}.webp`)).width).toBe(
              s.full.serve,
            );
          if (slot === "figure")
            expect(webpSize(join(servedDir, set, locale, `${key}.webp`))).toEqual({
              width: 2880,
              height: 1800,
            });
        }
    });
  });

  test("every crop's clip is recorded, no wider than its slot's crop; every anchor lies inside its picture", () => {
    each((set, locale) => {
      for (const key of W3_KEYS) {
        if (undone.has(`${set}/${locale}/${key}`)) continue;
        const a = anchors[set]?.[locale]?.[key];
        expect(a, `${set}/${locale}/${key}`).toBeTruthy();
        for (const n of (a!["full"] ?? []) as Anchor[]) {
          expect(n.x + n.w, `${key} ${n.name}`).toBeLessThanOrEqual(2880);
          expect(n.y + n.h, `${key} ${n.name}`).toBeLessThanOrEqual(1800);
          expect(Math.min(n.x, n.y, n.w, n.h)).toBeGreaterThanOrEqual(0);
        }
      }
      for (const c of crops) {
        if (undone.has(`${set}/${locale}/${c.key}`)) continue;
        const a = anchors[set]![locale]![c.key]!;
        const clip = a.clips[c.picture];
        const name = `${set}/${locale}/${c.key}.${c.picture}`;
        expect(clip, name).toBeTruthy();
        expect([clip!.width, clip!.height], name).toEqual([c.width, c.height]);
        expect(clip!.x + clip!.width, `${name} inside the window`).toBeLessThanOrEqual(1440);
        expect(clip!.y + clip!.height, `${name} inside the window`).toBeLessThanOrEqual(900);
        expect(Math.min(clip!.x, clip!.y)).toBeGreaterThanOrEqual(0);
        expect(record.keys[c.key]?.clips?.[`${set}/${locale}`]?.[c.picture], name).toEqual(clip);
        for (const n of (a[c.picture] ?? []) as Anchor[]) {
          expect(n.x + n.w, `${name} ${n.name}`).toBeLessThanOrEqual(clip!.width * 2);
          expect(n.y + n.h, `${name} ${n.name}`).toBeLessThanOrEqual(clip!.height * 2);
          expect(Math.min(n.x, n.y, n.w, n.h)).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  test("no W3 focus crop is left (*.focus.png), and nothing in src/ names one", () => {
    const left: string[] = [];
    const walk = (dir: string) => {
      if (!existsSync(dir)) return;
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (/\.focus\.(png|webp)$/.test(e.name)) left.push(full);
        else if (/\.(astro|ts|json|mjs)$/.test(e.name) && full.includes("/src/"))
          if (readFileSync(full, "utf8").includes(".focus.png")) left.push(full);
      }
    };
    for (const dir of ["src", "public", "media-library"]) walk(join(process.cwd(), dir));
    expect(left).toEqual([]);
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
  /** The capture set a project's build shows (src/lib/screens.ts → screenSets). */
  const screenSet = () => (siteProject().theme === "dark" ? "night-chart" : "survey");
  const captured = (locale: string, key: string) =>
    existsSync(join(servedDir, screenSet(), locale, `${key}.news.webp`));

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
