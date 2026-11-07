import { expect, test, type Page } from "@playwright/test";
import { siteBase, siteProject } from "./helpers";

/**
 * W13 (DECISIONS.md D-SHOWCASE): the product's two official themes on the page, in every build.
 *
 *  A — the home's dusk sweep: the boundary moves with the scroll (the animated property at three
 *      positions); Night chart enters from the inline end (from the left in Hebrew); under reduced
 *      motion the still state shows both pictures whole, with no animation; the pictures are lazy.
 *  B — /product's slider: arrow keys, Home and End move the boundary; the value text in en and he;
 *      without JavaScript the frame rests at half and the input cannot take focus.
 *  C — each /product figure's "Survey | Night chart" control switches its picture to the other
 *      set, whose file is not requested before; the marks stay on the picture.
 *  D — /pilot's twin frames show both sets; the sweep's still state is twin frames too.
 */
const sets = ["survey", "night-chart"] as const;
const pageSet = () => {
  const { theme, scheme } = siteProject();
  return theme === "dark" || (theme === "auto" && scheme === "dark") ? "night-chart" : "survey";
};
const otherSet = () => (pageSet() === "survey" ? "night-chart" : "survey");

/** The served set of each shown picture under a selector. */
async function shown(page: Page, selector: string): Promise<string[]> {
  return page.evaluate((sel) => {
    return [...document.querySelectorAll<HTMLImageElement>(`${sel} .shot img`)]
      .filter((img) => img.getBoundingClientRect().width > 0)
      .map((img) => new URL(img.currentSrc || img.src).pathname.split("/")[2] ?? "");
  }, selector);
}

async function loadAll(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight / 2) {
      scrollTo(0, y);
      await new Promise((r) => requestAnimationFrame(r));
    }
  });
  await page.waitForLoadState("networkidle");
}

test.describe("A — the dusk sweep", () => {
  for (const locale of ["en", "he"] as const) {
    test(`${locale}: the boundary moves with the scroll, and night enters from the inline end`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(locale === "en" ? "/" : "/he/");
      const track = page.locator(".sweep .sweep-track");
      const night = page.locator(".sweep .sweep-night .shot");
      await expect(page.locator(".sweep .shot img")).toHaveCount(2);
      for (const img of await page.locator(".sweep .shot img").all())
        await expect(img).toHaveAttribute("loading", "lazy");
      const top = await track.evaluate((el) => el.getBoundingClientRect().top + scrollY);
      const height = await track.evaluate((el) => el.getBoundingClientRect().height);
      const values: number[] = [];
      const stageTops: number[] = [];
      for (const f of [0.15, 0.5, 0.85]) {
        await page.evaluate((y) => scrollTo(0, y), top + (height - 900) * f);
        await page.waitForTimeout(150);
        values.push(
          parseFloat(
            await night.evaluate((el) => getComputedStyle(el).getPropertyValue("--lc-dusk")),
          ),
        );
        stageTops.push(
          await page
            .locator(".sweep .sweep-stage")
            .evaluate((el) => Math.round(el.getBoundingClientRect().top)),
        );
      }
      expect(values[0]).toBeLessThan(values[1]!);
      expect(values[1]).toBeLessThan(values[2]!);
      // The stage stays put in the window while the track scrolls past.
      expect(new Set(stageTops).size, stageTops.join(", ")).toBe(1);
      // Night's mask opens from the right in English, from the left in Hebrew.
      const mask = await night.evaluate((el) => getComputedStyle(el).maskImage);
      expect(mask).toContain(locale === "en" ? "to left" : "to right");
    });
  }

  test("reduced motion: the still state — both pictures whole, no animation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/he/");
      const night = page.locator(".sweep .sweep-night .shot");
      expect(await night.evaluate((el) => getComputedStyle(el).maskImage)).toBe("none");
      expect(await night.evaluate((el) => el.getAnimations().length)).toBe(0);
      expect(
        await page.locator(".sweep .sweep-stage").evaluate((el) => getComputedStyle(el).position),
      ).toBe("static");
      // Twin frames: one under the other, neither covering the other.
      const [day, dusk] = await page
        .locator(".sweep figure")
        .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
      expect(dusk!.top).toBeGreaterThanOrEqual(day!.bottom);
      await page.locator(".sweep").scrollIntoViewIfNeeded();
      await loadAll(page);
      expect((await shown(page, ".sweep")).sort()).toEqual([...sets].sort());
    }
  });
});

test.describe("B — the slider", () => {
  for (const locale of ["en", "he"] as const) {
    test(`${locale}: arrow keys, Home and End move the boundary; the value text follows`, async ({
      page,
    }) => {
      await page.goto(locale === "en" ? "/product/" : "/he/product/");
      const range = page.locator("[data-compare] input");
      const frame = page.locator("[data-compare]");
      const at = () => frame.evaluate((el) => getComputedStyle(el).getPropertyValue("--compare"));
      await expect(range).toBeEnabled();
      await expect(range).toHaveAttribute(
        "aria-label",
        locale === "en" ? "Compare Survey and Night chart" : "השוואה בין מיפוי למפת לילה",
      );
      await range.focus();
      await page.keyboard.press("End");
      expect(await at()).toBe("100%");
      await page.keyboard.press("Home");
      expect(await at()).toBe("0%");
      await expect(range).toHaveAttribute(
        "aria-valuetext",
        locale === "en" ? "Survey 0%, Night chart 100%" : "מיפוי 0%, מפת לילה 100%",
      );
      await page.keyboard.press(locale === "en" ? "ArrowRight" : "ArrowLeft");
      const v = await range.inputValue();
      expect(Number(v)).toBeGreaterThan(0);
      expect(await at()).toBe(`${v}%`);
      await expect(range).toHaveAttribute(
        "aria-valuetext",
        locale === "en"
          ? `Survey ${v}%, Night chart ${100 - Number(v)}%`
          : `מיפוי ${v}%, מפת לילה ${100 - Number(v)}%`,
      );
    });
  }

  test("the boundary follows the thumb: from the left in English, from the right in Hebrew", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const locale of ["en", "he"] as const) {
      await page.goto(locale === "en" ? "/product/" : "/he/product/");
      const frame = page.locator("[data-compare]");
      await frame.scrollIntoViewIfNeeded();
      const box = (await frame.boundingBox())!;
      // A press at a quarter of the frame's width from its left edge.
      await page.mouse.click(box.x + box.width / 4, box.y + box.height / 2);
      const value = Number(await page.locator("[data-compare] input").inputValue());
      // The thumb's value runs from the inline start: 25 in English, 75 in Hebrew.
      expect(Math.abs(value - (locale === "en" ? 25 : 75))).toBeLessThanOrEqual(3);
      // The boundary sits at that share from the same edge — so, in both, where the press was:
      // Night chart's mask is measured from the left in English and from the right in Hebrew.
      expect(await frame.evaluate((el) => getComputedStyle(el).getPropertyValue("--compare"))).toBe(
        `${value}%`,
      );
      const mask = await frame
        .locator(".shot + .shot")
        .evaluate((el) => getComputedStyle(el).maskImage);
      expect(mask).toContain(locale === "en" ? "to right" : "to left");
    }
  });

  test("without JavaScript the frame rests at half and the input takes no focus", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL: siteBase(),
    });
    const page = await context.newPage();
    await page.goto("/product/");
    const frame = page.locator("[data-compare]");
    expect(await frame.evaluate((el) => getComputedStyle(el).getPropertyValue("--compare"))).toBe(
      "50%",
    );
    await expect(page.locator("[data-compare] input")).toBeDisabled();
    await expect(page.locator("template[data-fig-sets]")).toHaveCount(1);
    await expect(page.locator(".fig .fig-sets")).toHaveCount(0);
    await context.close();
  });
});

test.describe("C — the switch on each figure", () => {
  test("each figure's control shows the other set; its file is not requested before", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const requested: string[] = [];
    page.on("request", (r) => requested.push(new URL(r.url()).pathname));
    await page.goto("/product/");
    const figures = page.locator(".fig");
    await expect(figures).toHaveCount(10);
    await expect(page.locator(".fig .fig-sets")).toHaveCount(10);
    for (const n of [1, 5]) {
      const fig = page.locator(`#fig-${n}`);
      await fig.scrollIntoViewIfNeeded();
      const img = fig.locator(".shot img");
      await expect(img).toHaveJSProperty("complete", true);
      const before = new URL(await img.evaluate((el: HTMLImageElement) => el.currentSrc)).pathname;
      expect(before).toContain(`/screens/${pageSet()}/`);
      const other = before.replace(pageSet(), otherSet());
      expect(requested, `${other} before the choice`).not.toContain(other);
      const pressed = fig.locator(".fig-sets button[aria-pressed='true']");
      await expect(pressed).toHaveAttribute("data-set", pageSet());
      await fig.locator(`.fig-sets button[data-set="${otherSet()}"]`).click();
      await expect
        .poll(() => img.evaluate((el: HTMLImageElement) => new URL(el.currentSrc).pathname))
        .toBe(other);
      await expect(pressed).toHaveAttribute("data-set", otherSet());
      // The marks stay on the picture.
      const marks = await fig.locator(".fig-layer .fig-a").count();
      expect(marks).toBeGreaterThan(0);
      // Back to the page's own set.
      await fig.locator(`.fig-sets button[data-set="${pageSet()}"]`).click();
      await expect
        .poll(() => img.evaluate((el: HTMLImageElement) => new URL(el.currentSrc).pathname))
        .toBe(before);
    }
  });
});

test.describe("D — twin frames", () => {
  for (const width of [1440, 390]) {
    test(`/pilot/ shows both sets of the design studio at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/pilot/", "/he/pilot/"]) {
        await page.goto(path);
        await page.locator(".twin").scrollIntoViewIfNeeded();
        await loadAll(page);
        expect((await shown(page, ".twin")).sort(), path).toEqual([...sets].sort());
        const [a, b] = await page
          .locator(".twin figure")
          .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
        // Both whole: the frames do not overlap.
        const apart =
          a!.right <= b!.left || b!.right <= a!.left || a!.bottom <= b!.top || b!.bottom <= a!.top;
        expect(apart, path).toBe(true);
      }
    });
  }
});
