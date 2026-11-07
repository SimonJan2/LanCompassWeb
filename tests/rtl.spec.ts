import { expect, test } from "@playwright/test";
import { pages, sectionPages } from "./helpers";

// W8: the release-note pages too.
const hebrew = [...pages, ...sectionPages].filter((p) => p.dir === "rtl");

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
        // W10: `[dir]` matched <html dir="rtl"> itself, so this guard skipped every text node
        // and passed vacuously since W1; only an element that sets a direction other than the
        // page's isolates. The operator's English TODO markers go before going public.
        const isolated =
          "bdi, code, kbd, samp, pre, [dir='ltr'], [dir='auto'], [lang='en'], svg, [translate='no'], script, style, title, .todo-operator";
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

  // W9: the Hebrew docs. The articles are the product's text, isolated by its own marks
  // (U+2066…U+2069), which this site keeps; the site's chrome around them follows its own rule.
  const heDocs = ["/he/docs/", "/he/docs/first-run/", "/he/docs/topology/", "/he/docs/api-tokens/"];
  for (const path of heDocs) {
    test(`${path}: every pre and code reads left to right; no overflow at 390px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      const rtlCode = await page.evaluate(() =>
        Array.from(document.querySelectorAll("main pre, main code"))
          .filter((el) => getComputedStyle(el).direction !== "ltr")
          .map((el) => (el.textContent ?? "").slice(0, 40)),
      );
      expect(rtlCode).toEqual([]);
      // The chrome (header, the guides, the version line, "On this page", the pager, the
      // footer): Latin isolated in markup, as on every other page.
      const leaks = await page.evaluate(() => {
        const isolated =
          "bdi, code, kbd, samp, pre, [dir='ltr'], [dir='auto'], [lang='en'], svg, [translate='no'], script, style, title";
        const bad: string[] = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const text = n.textContent ?? "";
          if (!/[A-Za-z]/.test(text)) continue;
          const parent = n.parentElement;
          if (!parent || parent.closest(isolated)) continue;
          if (parent.closest(".docs-prose")) continue;
          if (parent.closest("[hidden], [aria-hidden='true'], dialog:not([open])")) continue;
          bad.push(text.trim().slice(0, 80));
        }
        return bad;
      });
      expect(leaks).toEqual([]);
    });
  }

  test("arrows are not mirrored in English", async ({ page }) => {
    await page.goto("/");
    const t = await page
      .locator('svg[data-icon="arrow"]')
      .first()
      .evaluate((el) => getComputedStyle(el).transform);
    expect(t).toBe("none");
  });
});
