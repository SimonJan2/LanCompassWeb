import { expect, test, type Page } from "@playwright/test";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { AUTO, FLAGS, layOutInFull, siteProject } from "./helpers";

/**
 * W10, WCAG 2.2 success criterion 2.5.8 Target Size (Minimum, AA): every link, button and form
 * control a pointer can hit is at least 24 × 24 CSS px, or meets the spacing exception — a 24-px
 * circle centred on its box touches no other target and no other small target's circle. Links in
 * running text are exempt (the criterion's "inline" exception: the line height of the sentence
 * sets them), as are targets hidden from everyone (a closed menu, the clipped honeypot).
 *
 * A target is "in running text" when the block around it carries words of its own besides the
 * link (a sentence, a list item that says more than the link). Measured in page coordinates on
 * every built page at 1440 and 390 px; the forms on the flags build (endpoint set). Sizes do not
 * depend on the theme, so the light project runs it.
 */
const CHUNKS = 6;

function builtPaths(dist: string): string[] {
  const root = join(process.cwd(), dist);
  const out: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".html"))
        out.push(`/${relative(root, full).replace(/index\.html$/, "")}`);
    }
  };
  walk(root);
  return out.sort().filter((p) => !/design-partners/.test(p));
}

/** The undersized targets of the page in view that the spacing exception does not save. */
async function smallTargets(page: Page): Promise<string[]> {
  // The docs' long articles and the footer render lazily (content-visibility: auto): their boxes
  // keep placeholder sizes until scrolled to, so positions measured now would be wrong. Lay out
  // everything for the measurement, as a reader who scrolls there sees it.
  await layOutInFull(page);
  return page.evaluate(() => {
    const SEL =
      "a[href], button, summary, input:not([type=hidden]), select, textarea, [role=button], [tabindex]:not([tabindex='-1'])";
    const BLOCK = /^(block|list-item|flex|grid|table-cell|table-caption|flow-root)$/;
    interface T {
      el: Element;
      x: number;
      y: number;
      w: number;
      h: number;
      inline: boolean;
    }
    // Not rendered: a closed <details>' content, display none, visibility hidden, a closed dialog.
    const isHidden = (el: Element) =>
      !!el.closest("[hidden], [inert], [aria-hidden='true'], dialog:not([open])") ||
      !el.checkVisibility({ visibilityProperty: true });
    /** The nearest block ancestor's own words, the target's text left out. */
    const inRunningText = (el: Element) => {
      if (getComputedStyle(el).display !== "inline") return false;
      let block: Element | null = el.parentElement;
      while (block && !BLOCK.test(getComputedStyle(block).display)) block = block.parentElement;
      if (!block) return false;
      const clone = block.cloneNode(true) as Element;
      const mine = Array.from(block.querySelectorAll(SEL));
      const theirs = Array.from(clone.querySelectorAll(SEL));
      mine.forEach((m, i) => {
        if (m === el || m.contains(el) || el.contains(m)) theirs[i]?.remove();
      });
      return /[\p{L}\p{N}]/u.test(clone.textContent ?? "");
    };
    const targets: T[] = [];
    for (const el of Array.from(document.querySelectorAll(SEL))) {
      if (isHidden(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) continue;
      targets.push({
        el,
        x: r.left + scrollX,
        y: r.top + scrollY,
        w: r.width,
        h: r.height,
        inline: inRunningText(el),
      });
    }
    const describe = (t: T) => {
      const e = t.el as HTMLElement;
      const text = (e.innerText || e.getAttribute("aria-label") || e.getAttribute("href") || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 40);
      const where = e.closest("header, footer, nav, main, aside")?.tagName.toLowerCase() ?? "";
      return `${e.tagName.toLowerCase()}${e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/)[0] : ""} "${text}" in ${where}: ${t.w.toFixed(1)} × ${t.h.toFixed(1)}`;
    };
    const small = targets.filter((t) => !t.inline && (t.w < 24 || t.h < 24));
    const nested = (a: T, b: T) => a.el.contains(b.el) || b.el.contains(a.el);
    /** Distance from a point to a rectangle (0 inside it). */
    const dist = (px: number, py: number, t: T) =>
      Math.hypot(Math.max(t.x - px, 0, px - (t.x + t.w)), Math.max(t.y - py, 0, py - (t.y + t.h)));
    const bad: string[] = [];
    for (const s of small) {
      const cx = s.x + s.w / 2;
      const cy = s.y + s.h / 2;
      const hitsTarget = targets.find((t) => t !== s && !nested(s, t) && dist(cx, cy, t) < 12);
      const hitsCircle = small.find(
        (o) => o !== s && !nested(s, o) && Math.hypot(o.x + o.w / 2 - cx, o.y + o.h / 2 - cy) < 24,
      );
      if (hitsTarget || hitsCircle) {
        bad.push(
          `${describe(s)} — its 24-px circle meets ${describe((hitsTarget ?? hitsCircle)!)}`,
        );
      }
    }
    return bad;
  });
}

test.describe("2.5.8 target size: 24 × 24 CSS px or the spacing exception", () => {
  for (const width of [1440, 390]) {
    for (let chunk = 0; chunk < CHUNKS; chunk++) {
      test(`every built page at ${width}px, part ${chunk + 1} of ${CHUNKS}`, async ({ page }) => {
        test.setTimeout(240_000);
        await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
        const all = builtPaths(siteProject().dist);
        expect(all.length).toBeGreaterThanOrEqual(164);
        const bad: string[] = [];
        for (const path of all.filter((_, i) => i % CHUNKS === chunk)) {
          await page.goto(path);
          for (const b of await smallTargets(page)) bad.push(`${width}px ${path} ${b}`);
        }
        expect(bad).toEqual([]);
      });
    }
  }

  test("the forms (endpoint configured), both locales, both widths", async ({ page }) => {
    const bad: string[] = [];
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/pilot/", "/contact/", "/he/pilot/", "/he/contact/"]) {
        await page.goto(`${FLAGS}${path}`);
        for (const b of await smallTargets(page)) bad.push(`${width} ${path} ${b}`);
      }
    }
    expect(bad).toEqual([]);
  });

  // W13: the light/dark switch lives in auto builds only; the slider and each figure's
  // "Survey | Night chart" control in every build (the light build above covers them too).
  test("the switch, the slider and the figures' controls (auto build), both locales, both widths", async ({
    page,
  }) => {
    const bad: string[] = [];
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      for (const path of ["/", "/product/", "/he/", "/he/product/", "/pilot/"]) {
        await page.goto(`${AUTO}${path}`);
        await expect(page.locator(".header-actions > [data-theme-switch]")).toBeVisible();
        for (const b of await smallTargets(page)) bad.push(`${width} ${path} ${b}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
