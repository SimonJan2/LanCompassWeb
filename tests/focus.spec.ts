import { expect, test, type Page } from "@playwright/test";
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { docsSample, pages, sectionPages, siteProject } from "./helpers";

/**
 * W10, WCAG 2.2 success criterion 2.4.11 Focus Not Obscured (Minimum, AA): a component that
 * receives keyboard focus is not hidden by the page's own content. The site's one element that
 * stays over the content is the header, which keeps to the top of the window as the page scrolls
 * (68 px and its rule); `html` has `scroll-padding-block-start: 5.5rem` so the browser scrolls a
 * focused element clear of it.
 *
 * The test presses Tab through each page from the top to its last focusable element and, after
 * every press, measures the focused element against the header. It fails an element entirely
 * under the header (AA), and one partly under it that would fit below it (the stricter 2.4.12
 * reading). An element taller than the room below the header — a long table's scroll box in the
 * docs — cannot be shown whole: it is listed as an annotation, not failed (AA allows it).
 * The layout is the same in every theme, so the light project runs it (playwright.config.ts):
 * every built page at 1440 px, and at 390 px the site's pages, the release notes, a sample of the
 * docs and the 404s (the docs articles share one layout, which the sample covers).
 */
const MAX_TABS = 600;
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

interface Focused {
  done: boolean;
  name?: string;
  inHeader?: boolean;
  top?: number;
  bottom?: number;
  headerBottom?: number;
  viewport?: number;
  /** Pixels of the element outside the box of the scroll area that holds it (not the page). */
  boxPx?: number;
}

/**
 * Tab through one page. `hidden`: each focused element the header covers — entirely (fails AA)
 * or partly while it would fit below the header (fails the stricter reading). `tall`: an element
 * taller than the room below the header (a long table's scroll box): the browser shows what fits
 * and the rest is under the header or above the window, which AA allows; listed, not failed.
 * `clipped`: an element partly outside the scroll area that holds it (a table's scroll box, a
 * sideways list) — the browser does not scroll an element that is partly in view; listed.
 */
async function walk(
  page: Page,
  path: string,
): Promise<{ hidden: string[]; tall: string[]; clipped: string[]; seen: number }> {
  await page.goto(path);
  const hidden: string[] = [];
  const tall: string[] = [];
  const clipped: string[] = [];
  let seen = 0;
  for (let i = 0; i < MAX_TABS; i++) {
    await page.keyboard.press("Tab");
    const f = await page.evaluate((): Focused => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body || el === document.documentElement) return { done: true };
      // Back to an element already visited: the walk went round the page.
      if (el.hasAttribute("data-focus-walked")) return { done: true };
      el.setAttribute("data-focus-walked", "");
      const header = document.querySelector<HTMLElement>("[data-site-header]")!;
      const h = header.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      const label = (el.innerText || el.getAttribute("aria-label") || el.getAttribute("href") || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 50);
      // The nearest scroll area that holds the element, below the page itself.
      let boxPx = 0;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const s = getComputedStyle(p);
        const scrolls =
          (/auto|scroll|hidden|clip/.test(s.overflowX) && p.scrollWidth > p.clientWidth + 1) ||
          (/auto|scroll|hidden|clip/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 1);
        if (!scrolls) continue;
        const o = p.getBoundingClientRect();
        const left = o.left + p.clientLeft;
        const top = o.top + p.clientTop;
        boxPx =
          Math.max(0, left - b.left) +
          Math.max(0, b.right - (left + p.clientWidth)) +
          Math.max(0, top - b.top) +
          Math.max(0, b.bottom - (top + p.clientHeight));
        break;
      }
      return {
        done: false,
        name: `${el.tagName.toLowerCase()} "${label}"`,
        inHeader: header.contains(el) || el.classList.contains("skip-link"),
        top: b.top,
        bottom: b.bottom,
        headerBottom: h.bottom,
        viewport: innerHeight,
        boxPx,
      };
    });
    if (f.done) break;
    seen++;
    if (f.boxPx! > 1)
      clipped.push(`${path} ${f.name}: ${f.boxPx!.toFixed(1)} px outside its scroll area`);
    if (f.inHeader) continue;
    if (f.top! < f.headerBottom! - 0.5) {
      // The docs render long articles lazily (content-visibility: auto), so a block's real size
      // arrives a frame after the scroll: measure again once the page has settled.
      const settled = await page.evaluate(async () => {
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const b = (document.activeElement as HTMLElement).getBoundingClientRect();
        return { top: b.top, bottom: b.bottom };
      });
      f.top = settled.top;
      f.bottom = settled.bottom;
    }
    if (f.top! < f.headerBottom! - 0.5) {
      const where = `(top ${f.top!.toFixed(1)}, height ${(f.bottom! - f.top!).toFixed(1)}, header ends ${f.headerBottom!.toFixed(1)})`;
      const fits = f.bottom! - f.top! <= f.viewport! - f.headerBottom!;
      if (f.bottom! <= f.headerBottom! + 0.5)
        hidden.push(`${path} ${f.name}: entirely under the header ${where}`);
      else if (fits)
        hidden.push(`${path} ${f.name}: partly under the header, though it fits ${where}`);
      else tall.push(`${path} ${f.name}: taller than the room below the header ${where}`);
    }
  }
  return { hidden, tall, clipped, seen };
}

/** The walk's notes (listed, not failed), kept with the test's output for the gate's report. */
function keepNotes(tall: string[], clipped: string[]) {
  const notes = [...tall.map((t) => `tall: ${t}`), ...clipped.map((c) => `clipped: ${c}`)];
  for (const n of notes) test.info().annotations.push({ type: "focus note", description: n });
  writeFileSync(test.info().outputPath("focus-notes.txt"), `${notes.join("\n")}\n`);
}

test.describe("2.4.11 focus not obscured by the header", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  for (let chunk = 0; chunk < CHUNKS; chunk++) {
    test(`every built page at 1440px, part ${chunk + 1} of ${CHUNKS}`, async ({ page }) => {
      test.setTimeout(300_000);
      await page.setViewportSize({ width: 1440, height: 900 });
      const all = builtPaths(siteProject().dist);
      expect(all.length).toBeGreaterThanOrEqual(164);
      const hidden: string[] = [];
      const tall: string[] = [];
      const clipped: string[] = [];
      for (const path of all.filter((_, i) => i % CHUNKS === chunk)) {
        const r = await walk(page, path);
        expect(r.seen, `${path}: Tab reached nothing`).toBeGreaterThan(5);
        hidden.push(...r.hidden);
        tall.push(...r.tall);
        clipped.push(...r.clipped);
      }
      keepNotes(tall, clipped);
      expect(hidden).toEqual([]);
    });
  }

  test("at 390px: the site's pages, the release notes, the docs sample and the 404s", async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 390, height: 844 });
    const hidden: string[] = [];
    const tall: string[] = [];
    const clipped: string[] = [];
    for (const path of [
      ...pages.map((p) => p.path),
      ...sectionPages.map((p) => p.path),
      ...docsSample.map((p) => p.path),
      "/404.html",
      "/he/404.html",
    ]) {
      const r = await walk(page, path);
      expect(r.seen, `${path}: Tab reached nothing`).toBeGreaterThan(3);
      hidden.push(...r.hidden);
      tall.push(...r.tall);
      clipped.push(...r.clipped);
    }
    keepNotes(tall, clipped);
    expect(hidden).toEqual([]);
  });

  test("/product/'s section tabs: the focused tab is wholly inside its bar, both languages", async ({
    page,
  }) => {
    // The bar scrolls sideways when its eleven tabs do not fit (1,246 px of tabs in 1,200 at
    // 1440 px); a browser leaves a focused element that is partly in view where it is, so the
    // bar's script brings it in (src/scripts/scrollspy.ts). Night E found the last tab 46 px out.
    const clipped: string[] = [];
    for (const width of [1440, 1100]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/product/", "/he/product/"]) {
        await page.goto(path);
        const tabs = page.locator("[data-scrollspy] ul a");
        const n = await tabs.count();
        expect(n).toBeGreaterThan(5);
        await tabs.first().focus();
        for (let i = 0; i < n; i++) {
          if (i > 0) await page.keyboard.press("Tab");
          const out = await page.evaluate(async () => {
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
            const a = document.activeElement as HTMLElement;
            const bar = a.closest("ul")!.getBoundingClientRect();
            const r = a.getBoundingClientRect();
            const px = Math.max(0, bar.left - r.left) + Math.max(0, r.right - bar.right);
            return { px, text: a.textContent!.trim() };
          });
          if (out.px > 1)
            clipped.push(`${width}px ${path} "${out.text}": ${out.px.toFixed(1)} px outside`);
        }
      }
    }
    expect(clipped).toEqual([]);
  });

  test("the walk catches an element under the header", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    // Scroll so a heading's link would sit under the header, then focus it without scrolling.
    const covered = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>("[data-site-header]")!;
      const a = Array.from(document.querySelectorAll<HTMLAnchorElement>("main a")).find(
        (x) => x.getBoundingClientRect().top > 400,
      )!;
      scrollTo(0, scrollY + a.getBoundingClientRect().top - 10);
      a.focus({ preventScroll: true });
      return a.getBoundingClientRect().top < header.getBoundingClientRect().bottom;
    });
    expect(covered).toBe(true);
  });
});
