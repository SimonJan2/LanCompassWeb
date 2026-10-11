import { expect, test } from "@playwright/test";
import { pages } from "./helpers";

const hebrew = pages.filter((p) => p.dir === "rtl");

test.describe("right-to-left", () => {
  for (const p of hebrew) {
    test(`${p.path}: no horizontal overflow at 390px`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(p.path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test(`${p.path}: Latin text inside Hebrew is bidi-isolated`, async ({ page }) => {
      await page.goto(p.path);
      const leaks = await page.evaluate(() => {
        const isolated =
          "bdi, code, kbd, samp, [dir], [lang='en'], svg, [translate='no'], script, style, title";
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const bad: string[] = [];
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const text = node.textContent ?? "";
          if (!/[A-Za-z]/.test(text)) continue;
          const parent = node.parentElement;
          if (!parent || parent.closest(isolated)) continue;
          // Only text the user can see.
          if (parent.closest("[hidden], [aria-hidden='true'], dialog:not([open])")) continue;
          bad.push(text.trim().slice(0, 80));
        }
        return bad;
      });
      expect(leaks).toEqual([]);
    });
  }

  test("directional icons mirror; logos, the compass and screenshots do not", async ({ page }) => {
    await page.goto("/he/");
    const arrows = page.locator('svg[data-icon="arrow"]');
    expect(await arrows.count()).toBeGreaterThan(0);
    for (const arrow of await arrows.all()) {
      const t = await arrow.evaluate((el) => getComputedStyle(el).transform);
      expect(t).toMatch(/^matrix\(-1, 0, 0, 1/);
    }
    for (const selector of [".compass-mark", ".shot", ".drift-stage", ".logo-word"]) {
      for (const el of await page.locator(selector).all()) {
        const t = await el.evaluate((e) => getComputedStyle(e).transform);
        expect(t, selector).toBe("none");
      }
    }
    await expect(page.locator(".drift-stage")).toHaveAttribute("dir", "ltr");
    await expect(page.locator(".logo-word").first()).toHaveAttribute("dir", "ltr");
  });

  test("arrows are not mirrored in English", async ({ page }) => {
    await page.goto("/");
    const t = await page
      .locator('svg[data-icon="arrow"]')
      .first()
      .evaluate((el) => getComputedStyle(el).transform);
    expect(t).toBe("none");
  });
});
