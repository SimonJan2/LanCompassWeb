import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { layOutInFull, siteProject } from "./helpers";

/**
 * W13 (DECISIONS.md D-SWITCH): the site's two-state light/dark switch, in auto builds only.
 *
 *  - light and dark builds: no switch, no `data-js`, and the switch's code dropped from the build;
 *  - auto builds, under both system schemes: one switch in the header and one in the mobile menu,
 *    named for the opposite of the scheme on screen, in English and Hebrew, at least 24 × 24 px;
 *  - a press renders the other scheme; `lc-theme` is stored only when it differs from the system's
 *    scheme, and pressing again (the system's scheme) removes it;
 *  - the override holds across navigation and a reload. It is applied when the site's module runs
 *    (the brief's fallback, step 3: a blocking boot script cost two pages their LCP budget), so no
 *    script blocks the first paint: no <script> in <head> but the JSON-LD data;
 *  - another tab follows (the `storage` event); storage that throws still switches the page;
 *  - under an override on the opposite system, every product picture is from the override's set
 *    (the showcase's fixed-set frames aside) and a video that has not played plays the override's
 *    recording; a playing video keeps playing through a switch;
 *  - under an override on the opposite system, axe (WCAG 2.2 AA, as tests/a11y.spec.ts) finds
 *    nothing on the eleven URLs Lighthouse audits (390 and 1,440 px) and 20 more pages (1,440 px).
 */
const NAMES = {
  en: { toDark: "Switch to dark theme", toLight: "Switch to light theme" },
  he: { toDark: "מעבר למצב כהה", toLight: "מעבר למצב בהיר" },
} as const;
const PAPER = "rgb(244, 241, 234)";
const NIGHT = "rgb(23, 28, 60)";

const dataTheme = (page: Page) => page.evaluate(() => document.documentElement.dataset["theme"]);
const background = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const stored = (page: Page) => page.evaluate(() => localStorage.getItem("lc-theme"));
const headerSwitch = (page: Page) => page.locator(".header-actions > [data-theme-switch]");

/** axe's tags, as tests/a11y.spec.ts: WCAG 2.0, 2.1 and 2.2 A and AA, and best practice. */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
/** The eleven URLs Lighthouse audits (lighthouserc.json). */
const AUDITED = [
  "/",
  "/product/",
  "/he/",
  "/he/product/",
  "/verify/",
  "/he/verify/",
  "/changelog/0.7.0/",
  "/docs/",
  "/docs/topology/",
  "/pilot/",
  "/licensing/",
];
/** Twenty more: the other main pages in both languages, the release notes, docs in Hebrew. */
const MORE = [
  "/videos/",
  "/security/",
  "/contact/",
  "/accessibility/",
  "/privacy/",
  "/he/videos/",
  "/he/security/",
  "/he/pilot/",
  "/he/licensing/",
  "/he/contact/",
  "/he/accessibility/",
  "/he/privacy/",
  "/changelog/",
  "/he/changelog/",
  "/he/changelog/0.7.0/",
  "/he/docs/",
  "/he/docs/topology/",
  "/docs/racks/",
  "/he/docs/racks/",
  "/404.html",
];

/** The system's scheme in this project, and the other one. */
function schemes() {
  const system = siteProject().scheme;
  const other = system === "dark" ? "light" : "dark";
  return { system, other, otherSet: other === "dark" ? "night-chart" : "survey" };
}

test.describe("the light/dark switch (W13)", () => {
  test("light and dark builds have no switch and none of its code", async ({ page }) => {
    test.skip(siteProject().theme === "auto", "light and dark builds");
    for (const path of ["/", "/he/product/", "/contact/"]) {
      await page.goto(path);
      await expect(page.locator("[data-theme-switch]")).toHaveCount(0);
      await expect(page.locator("html")).not.toHaveAttribute("data-js", /.*/);
      // The site's module carries no switch code (`lc-theme` would be in it).
      const src = await page.locator('script[src*="BaseLayout"]').getAttribute("src");
      expect(await (await page.request.get(src!)).text()).not.toContain("lc-theme");
    }
  });

  test("/privacy/ names what the switch keeps, in the builds that have it", async ({ page }) => {
    const auto = siteProject().theme === "auto";
    for (const [path, sentence] of [
      [
        "/privacy/",
        "If you use the light/dark switch, this browser keeps your choice in its local storage (lc-theme); it is never sent to us, and clearing the site’s data removes it.",
      ],
      [
        "/he/privacy/",
        "אם תשתמשו במתג שמחליף בין מצב בהיר למצב כהה, הדפדפן הזה ישמור את הבחירה שלכם באחסון המקומי שלו (lc-theme); היא לא נשלחת אלינו אף פעם, ומחיקת נתוני האתר בדפדפן מוחקת אותה.",
      ],
    ] as const) {
      await page.goto(path);
      const text = await page.evaluate(() => document.body.innerText);
      if (auto) expect(text, path).toContain(sentence);
      else expect(text, path).not.toContain("lc-theme");
      // The two statements agree: nothing kept to track you, the switch's choice aside.
      expect(text, path).not.toMatch(/no local storage|לא משתמש באחסון מקומי/);
    }
  });

  test.describe("auto builds", () => {
    test.beforeEach(() => {
      test.skip(siteProject().theme !== "auto", "auto builds only");
    });

    test("a switch in the header and in the mobile menu, named for the other scheme, in en and he", async ({
      page,
    }) => {
      const { system } = schemes();
      for (const locale of ["en", "he"] as const) {
        await page.goto(locale === "en" ? "/" : "/he/");
        await expect(page.locator("html")).toHaveAttribute("data-js", "");
        const name = system === "dark" ? NAMES[locale].toLight : NAMES[locale].toDark;
        const other = system === "dark" ? NAMES[locale].toDark : NAMES[locale].toLight;
        await expect(headerSwitch(page)).toHaveCount(1);
        await expect(page.locator("dialog[data-menu-sheet] [data-theme-switch]")).toHaveCount(1);
        await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
        await expect(page.getByRole("button", { name: other, exact: true })).toHaveCount(0);
        await expect(headerSwitch(page)).toHaveAttribute("type", "button");
        const box = (await headerSwitch(page).boundingBox())!;
        expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(24);
      }
    });

    test("a press renders the other scheme and stores it; pressing again forgets it", async ({
      page,
    }) => {
      const { system, other } = schemes();
      await page.goto("/");
      expect(await dataTheme(page)).toBe("auto");
      expect(await background(page)).toBe(system === "dark" ? NIGHT : PAPER);
      await headerSwitch(page).click();
      expect(await dataTheme(page)).toBe(other);
      expect(await background(page)).toBe(other === "dark" ? NIGHT : PAPER);
      expect(await stored(page)).toBe(other);
      // The name now offers the system's scheme back.
      await expect(
        page.getByRole("button", {
          name: system === "dark" ? NAMES.en.toDark : NAMES.en.toLight,
          exact: true,
        }),
      ).toBeVisible();
      await headerSwitch(page).click();
      expect(await dataTheme(page)).toBe("auto");
      expect(await stored(page)).toBeNull();
      expect(await background(page)).toBe(system === "dark" ? NIGHT : PAPER);
    });

    test("the override holds across navigation and a reload, applied by the site's module", async ({
      page,
    }) => {
      const { other } = schemes();
      await page.goto("/");
      await headerSwitch(page).click();
      for (const path of ["/he/product/", "/docs/topology/"]) {
        await page.goto(path);
        // Applied when the module runs: by DOMContentLoaded (the fallback's step 3).
        expect(await dataTheme(page), path).toBe(other);
        expect(await background(page), path).toBe(other === "dark" ? NIGHT : PAPER);
      }
      await page.reload({ waitUntil: "domcontentloaded" });
      expect(await dataTheme(page)).toBe(other);
    });

    test("no script blocks the first paint: <head> holds only the JSON-LD data", async ({
      page,
    }) => {
      for (const path of ["/", "/he/", "/docs/topology/"]) {
        await page.goto(path);
        const head = await page
          .locator("head script")
          .evaluateAll((els) => els.map((el) => el.getAttribute("type") ?? "classic"));
        expect(head, path).toEqual(["application/ld+json"]);
      }
    });

    test("another tab follows the switch (the storage event)", async ({ page, context }) => {
      const { other } = schemes();
      await page.goto("/");
      const second = await context.newPage();
      await second.goto("/product/");
      await headerSwitch(page).click();
      await expect.poll(() => dataTheme(second)).toBe(other);
      await headerSwitch(page).click();
      await expect.poll(() => dataTheme(second)).toBe("auto");
      await second.close();
    });

    test("storage that throws still switches the page", async ({ page }) => {
      const { other } = schemes();
      await page.addInitScript(() => {
        Object.defineProperty(window, "localStorage", {
          get() {
            throw new DOMException("blocked", "SecurityError");
          },
        });
      });
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("data-js", "");
      await headerSwitch(page).click();
      expect(await dataTheme(page)).toBe(other);
      expect(await background(page)).toBe(other === "dark" ? NIGHT : PAPER);
    });

    test("under an override, the product's pictures and videos are from its set", async ({
      page,
    }) => {
      const { other, otherSet } = schemes();
      await page.addInitScript((value) => localStorage.setItem("lc-theme", value), other);
      await page.setViewportSize({ width: 1440, height: 900 });
      for (const path of ["/", "/product/", "/he/"]) {
        await page.goto(path);
        await page.addStyleTag({ content: "* { content-visibility: visible !important; }" });
        await page.evaluate(async () => {
          for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight / 2) {
            scrollTo(0, y);
            await new Promise((r) => requestAnimationFrame(r));
          }
        });
        await page.waitForLoadState("networkidle");
        // Every product picture outside the showcase (whose frames show a fixed set).
        const sources = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLImageElement>(".shot img")]
            .filter((img) => !img.closest(".sweep, .compare, .twin"))
            .filter((img) => img.getBoundingClientRect().width > 0)
            .map((img) => new URL(img.currentSrc).pathname),
        );
        expect(sources.length, path).toBeGreaterThan(0);
        for (const s of sources) expect(s, path).toContain(`/screens/${otherSet}/`);
        if (path === "/") {
          // A video that has not played plays the override's recording; its poster is the
          // override's too. (No metadata is fetched before a play: the controls stay as the pure
          // build's.)
          const videos = page.locator("figure[data-video] video");
          await expect(videos).toHaveCount(3);
          for (const v of await videos.all()) {
            expect(await v.evaluate((el: HTMLVideoElement) => el.readyState)).toBe(0);
            await v.evaluate(async (el: HTMLVideoElement) => {
              el.muted = true;
              await el.play().catch(() => undefined);
            });
            await expect
              .poll(() => v.evaluate((el: HTMLVideoElement) => el.currentSrc))
              .toContain(`/media/${otherSet}/`);
            await expect.poll(() => v.evaluate((el: HTMLVideoElement) => el.paused)).toBe(false);
            await v.evaluate((el: HTMLVideoElement) => el.pause());
          }
          const posters = await page.evaluate(() =>
            [...document.querySelectorAll<HTMLImageElement>(".video-poster-img")].map(
              (img) => new URL(img.currentSrc).pathname,
            ),
          );
          for (const p of posters) expect(p).toContain(`/media/${otherSet}/`);
        }
      }
    });

    test("a playing video keeps playing through a switch", async ({ page }) => {
      await page.goto("/");
      const video = page.locator("figure[data-video] video").first();
      await video.scrollIntoViewIfNeeded();
      const before = await video.evaluate(async (v: HTMLVideoElement) => {
        v.muted = true;
        await v.play();
        await new Promise((r) => setTimeout(r, 400));
        return v.currentSrc;
      });
      await headerSwitch(page).click();
      const after = await video.evaluate(async (v: HTMLVideoElement) => {
        const t = v.currentTime;
        await new Promise((r) => setTimeout(r, 600));
        return { src: v.currentSrc, paused: v.paused, moved: v.currentTime > t };
      });
      expect(after).toEqual({ src: before, paused: false, moved: true });
    });

    // Contrast at rest, as tests/a11y.spec.ts: reduced motion turns the scroll reveal off.
    for (const [label, paths, widths] of [
      ["the eleven audited URLs", AUDITED, [390, 1440]],
      ["20 more pages", MORE, [1440]],
    ] as const) {
      test(`axe finds nothing under an override on the opposite system: ${label}`, async ({
        page,
      }) => {
        test.setTimeout(240_000);
        const { other } = schemes();
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.addInitScript((value) => localStorage.setItem("lc-theme", value), other);
        const failures: string[] = [];
        for (const width of widths) {
          await page.setViewportSize({ width, height: 900 });
          for (const path of paths) {
            await page.goto(path);
            await expect(page.locator("html"), path).toHaveAttribute("data-theme", other);
            await layOutInFull(page);
            const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
            for (const v of results.violations) {
              const nodes = v.nodes.map((n) => n.target.join(" ")).join(", ");
              failures.push(`${path} at ${width}px — ${v.id}: ${nodes}`);
            }
          }
        }
        expect(failures).toEqual([]);
      });
    }
  });
});
