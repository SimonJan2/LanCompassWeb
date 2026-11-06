import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { en } from "../src/content/copy/en";
import { he } from "../src/content/copy/he";
import { figureMarks, MAX_MARKS, type AnchorFile } from "../src/lib/annotations";
import type { ScreenSet } from "../src/lib/screens";
import { pages, siteProject } from "./helpers";

/**
 * W4: the annotated figures (AnnotatedScreen.astro) and "What talks to what" (HowItRuns.astro),
 * in both locales and every theme project.
 *
 *  - Marks equal their legend items in number and order; each is an in-page link to its item
 *    and carries the note in its accessible name.
 *  - Each mark is at least 24 × 24 CSS px (WCAG 2.2, 2.5.8) and lies inside its picture.
 *  - Marks sit exactly where the page locale's anchors (src/content/screen-anchors.json) put
 *    them, for the set the build ships: Hebrew pages use the Hebrew captures' anchors.
 *  - Figure numbers run 1 … n per page; every caption is non-empty.
 *  - A cropped figure links to its full window, served from the site's origin.
 *  - A key, set or locale without anchors gets no marks (src/lib/annotations.ts).
 *  - The drawing is an image with a title and a description, numbered 1–7 like its list of
 *    seven items, mirrored in Hebrew; axe finds nothing in the figures or the drawing.
 */

const root = process.cwd();
const anchors = JSON.parse(
  readFileSync(join(root, "src", "content", "screen-anchors.json"), "utf8"),
) as AnchorFile;
const copies = { en, he };

/** A PNG's pixel size, from its IHDR chunk. */
function pngSize(file: string) {
  const b = readFileSync(file);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function setsShipped(): ScreenSet[] {
  const { theme } = siteProject();
  if (theme === "dark") return ["night-chart"];
  if (theme === "auto") return ["survey", "night-chart"];
  return ["survey"];
}

/** content-visibility: auto skips layout of sections far below the fold: lay them all out. */
async function renderAll(page: Page) {
  await page.addStyleTag({
    content: ".defer-render { content-visibility: visible !important; }",
  });
}

const productPages = [
  { path: "/product/", locale: "en" as const },
  { path: "/he/product/", locale: "he" as const },
];

interface DomFigure {
  id: string;
  screen: string;
  /** `style`: the position the browser applies (computed custom properties, from the page's
   *  stylesheet); `inline`: whether the mark carries a style attribute (the CSP forbids it). */
  marks: { href: string; text: string; label: string; style: string; inline: boolean }[];
  notes: { id: string; text: string }[];
  caption: string;
}

async function readFigures(page: Page): Promise<DomFigure[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("figure.fig")].map((f) => ({
      id: f.id,
      screen: f.querySelector<HTMLElement>(".shot")?.dataset["screen"] ?? "",
      marks: [...f.querySelectorAll<HTMLElement>(".fig-a")].map((span) => {
        const a = span.querySelector("a")!;
        const css = getComputedStyle(span);
        return {
          href: a.getAttribute("href") ?? "",
          text: (a.textContent ?? "").trim(),
          label: a.getAttribute("aria-label") ?? "",
          style: ["--x", "--y", "--w", "--h"]
            .map((p) => `${p}:${css.getPropertyValue(p).trim()}`)
            .join(";"),
          inline: span.hasAttribute("style"),
        };
      }),
      notes: [...f.querySelectorAll<HTMLElement>(".fig-notes li")].map((li) => ({
        id: li.id,
        text: (li.textContent ?? "").replace(/\s+/g, " ").trim(),
      })),
      caption: (f.querySelector("figcaption")?.textContent ?? "").replace(/\s+/g, " ").trim(),
    })),
  );
}

test.describe("W4: annotated figures", () => {
  for (const { path, locale } of productPages) {
    test(`${path}: marks equal their legend items, in order, each linking to its note`, async ({
      page,
    }) => {
      await page.goto(path);
      const figures = await readFigures(page);
      // Every section with a screen: ten figures (the reports section has none).
      expect(figures.length).toBe(10);
      for (const f of figures) {
        expect(f.marks.length, f.id).toBe(f.notes.length);
        expect(f.marks.length, f.id).toBeLessThanOrEqual(MAX_MARKS);
        f.marks.forEach((m, i) => {
          const note = f.notes[i]!;
          expect(m.text).toBe(String(i + 1));
          expect(note.id).toBe(`${f.id}-${i + 1}`);
          expect(m.href).toBe(`#${note.id}`);
          expect(m.label.replace(/\s+/g, " ")).toContain(note.text);
        });
      }
      // Every legend item a mark points at exists on the page, once.
      const targets = figures.flatMap((f) => f.marks.map((m) => m.href.slice(1)));
      for (const id of targets) await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
    });

    for (const width of [1440, 390]) {
      test(`${path} at ${width}px: every mark is ≥ 24 × 24 px, inside its picture, on its box's starting corner`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        await renderAll(page);
        const boxes = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>("figure.fig")].flatMap((f) => {
            const pic = f.querySelector(".shot-img")!.getBoundingClientRect();
            return [...f.querySelectorAll<HTMLElement>(".fig-a")].map((span) => {
              const a = span.querySelector("a")!;
              const r = a.getBoundingClientRect();
              const v = (name: string) =>
                parseFloat(getComputedStyle(span).getPropertyValue(name)) / 100;
              return {
                id: `${f.id} mark ${a.textContent}`,
                pic: pic.toJSON(),
                r: r.toJSON(),
                box: { x: v("--x"), y: v("--y"), w: v("--w") },
              };
            });
          }),
        );
        expect(boxes.length).toBeGreaterThan(0);
        const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
        for (const { id, pic, r, box } of boxes) {
          expect(r.width, id).toBeGreaterThanOrEqual(24);
          expect(r.height, id).toBeGreaterThanOrEqual(24);
          expect(r.left, id).toBeGreaterThanOrEqual(pic.left - 0.5);
          expect(r.right, id).toBeLessThanOrEqual(pic.right + 0.5);
          expect(r.top, id).toBeGreaterThanOrEqual(pic.top - 0.5);
          expect(r.bottom, id).toBeLessThanOrEqual(pic.bottom + 0.5);
          // The starting corner of the anchor's box: top left, or top right in Hebrew (the
          // Hebrew captures read right to left), kept 14 px inside the picture.
          const corner = locale === "he" ? box.x + box.w : box.x;
          const cx = clamp(corner * pic.width, 14, pic.width - 14);
          const cy = clamp(box.y * pic.height, 14, pic.height - 14);
          expect(Math.abs(r.left + r.width / 2 - pic.left - cx), `${id} x`).toBeLessThan(1.5);
          expect(Math.abs(r.top + r.height / 2 - pic.top - cy), `${id} y`).toBeLessThan(1.5);
        }
      });
    }

    test(`${path}: marks sit where the ${locale} anchors put them`, async ({ page }) => {
      await page.goto(path);
      const figures = await readFigures(page);
      const sets = setsShipped();
      const other = locale === "he" ? "en" : "he";
      let differsFromOther = 0;
      for (const f of figures) {
        const notes = (copies[locale].figures as Record<string, { notes: Record<string, string> }>)[
          f.screen
        ]!.notes;
        const expected = (loc: "en" | "he") => {
          const size = pngSize(
            join(root, "src", "assets", "screens", sets[0]!, loc, `${f.screen}.png`),
          );
          return figureMarks(anchors, {
            sets,
            locale: loc,
            screen: f.screen,
            variant: "full",
            notes,
            width: size.width,
            height: size.height,
          }).map((m) => `--x:${m.x};--y:${m.y};--w:${m.w};--h:${m.h}`);
        };
        const mine = expected(locale);
        expect(
          f.marks.map((m) => m.style),
          f.id,
        ).toEqual(mine);
        // The position comes from the stylesheet, never a style attribute (the CSP blocks those).
        expect(
          f.marks.filter((m) => m.inline).length,
          `${f.id}: marks with a style attribute`,
        ).toBe(0);
        if (JSON.stringify(mine) !== JSON.stringify(expected(other))) differsFromOther++;
      }
      // The two locales' captures differ (the Hebrew window is mirrored by the product itself),
      // so a page that used the other locale's anchors would fail above on most figures.
      expect(differsFromOther).toBeGreaterThan(5);
    });
  }

  for (const p of pages) {
    test(`${p.path}: figure numbers run 1 … n, every caption is non-empty`, async ({ page }) => {
      await page.goto(p.path);
      const figures = await readFigures(page);
      figures.forEach((f, i) => {
        expect(f.id).toBe(`fig-${i + 1}`);
        expect(f.caption.length, f.id).toBeGreaterThan(12);
      });
    });
  }

  test("cropped figures link to their full window, a same-origin image that is served", async ({
    page,
    request,
  }) => {
    let cropped = 0;
    for (const p of pages) {
      await page.goto(p.path);
      const links = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLAnchorElement>("figure.fig .fig-full")].map((a) => ({
          href: a.href,
          inCropped: !!a.closest("figure.fig[data-cropped]"),
        })),
      );
      const croppedHere = await page.locator("figure.fig[data-cropped]").count();
      cropped += croppedHere;
      if (croppedHere > 0) expect(links.length).toBeGreaterThanOrEqual(croppedHere);
      for (const link of links) {
        expect(link.inCropped).toBe(true);
        expect(new URL(link.href).origin).toBe(new URL(page.url()).origin);
        const res = await request.get(link.href);
        expect(res.status(), link.href).toBe(200);
        expect(res.headers()["content-type"]).toMatch(/^image\//);
      }
    }
    // W4 decision (report): no page shows a cropped annotated figure yet; the home's figures stay
    // plain for the first-round-trip budget. The count is recorded, not required.
    test.info().annotations.push({ type: "cropped figures", description: String(cropped) });
  });

  test("a key, set or locale without anchors gets no marks; the rules hold (lib/annotations)", () => {
    const a = { name: "a", x: 100, y: 100, w: 200, h: 100 };
    const b = { name: "b", x: 2000, y: 1500, w: 400, h: 200 };
    const file: AnchorFile = {
      survey: { en: { k: { full: [a, b] } }, he: { k: { full: [a] } } },
      "night-chart": { en: { k: { full: [a] } } },
    };
    const base = {
      sets: ["survey"] as ScreenSet[],
      locale: "en" as const,
      screen: "k",
      variant: "full" as const,
      notes: { a: "Note A", b: "Note B" },
      width: 2880,
      height: 1800,
    };
    expect(figureMarks(file, { ...base, screen: "missing" })).toEqual([]);
    expect(figureMarks(file, { ...base, variant: "focus" })).toEqual([]);
    expect(figureMarks(file, { ...base, sets: ["survey", "night-chart"] })).toEqual([]);
    expect(figureMarks(file, base).map((m) => m.name)).toEqual(["a", "b"]);
    expect(figureMarks(file, { ...base, notes: { b: "Note B" } }).map((m) => m.name)).toEqual([
      "b",
    ]);
    // A wide crop shows the top 2:1 band: an anchor below it gets no mark.
    expect(figureMarks(file, { ...base, height: 1440 }).map((m) => m.name)).toEqual(["a"]);
    // Percentages of the picture, one decimal; a box past the picture's edge is cut at it.
    const [first] = figureMarks(file, base);
    expect([first!.x, first!.y, first!.w, first!.h]).toEqual(["3.5%", "5.6%", "6.9%", "5.6%"]);
    const edge = { name: "a", x: 2800, y: 100, w: 400, h: 100 };
    const [cut] = figureMarks({ survey: { en: { k: { full: [edge] } } } }, base);
    expect(cut!.w).toBe("2.8%");
    const many = Array.from({ length: 6 }, (_, i) => ({ ...a, name: `n${i}` }));
    const notes = Object.fromEntries(many.map((m) => [m.name, m.name]));
    expect(figureMarks({ survey: { en: { k: { full: many } } } }, { ...base, notes }).length).toBe(
      MAX_MARKS,
    );
  });
});

test.describe("W4: What talks to what", () => {
  for (const path of ["/security/", "/he/security/", "/product/", "/he/product/"]) {
    test(`${path}: an image with a title and a description, numbered like its seven items`, async ({
      page,
    }) => {
      await page.goto(path);
      await renderAll(page);
      const hir = page.locator(".hir");
      await expect(hir).toHaveCount(1);
      const svg = hir.locator("svg");
      await expect(svg).toHaveAttribute("role", "img");
      const info = await svg.evaluate((el) => {
        const title = el.querySelector("title");
        const desc = el.querySelector("desc");
        return {
          title: (title?.textContent ?? "").trim(),
          desc: (desc?.textContent ?? "").trim(),
          labelled: !!title?.id && el.getAttribute("aria-labelledby") === title.id,
          described: !!desc?.id && el.getAttribute("aria-describedby") === desc.id,
          badges: [...el.querySelectorAll(".n text")].map((t) => (t.textContent ?? "").trim()),
          host: Number(el.querySelector(".n circle")?.getAttribute("cx")),
        };
      });
      expect(info.title.length).toBeGreaterThan(10);
      expect(info.desc.length).toBeGreaterThan(40);
      expect(info.labelled).toBe(true);
      expect(info.described).toBe(true);
      expect([...new Set(info.badges)].sort()).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
      await expect(hir.locator(".hir-list li")).toHaveCount(7);
      // Mirrored in Hebrew: the host's number sits at the start of the reading direction.
      if (path.startsWith("/he/")) expect(info.host).toBeGreaterThan(240);
      else expect(info.host).toBeLessThan(240);
    });

    test(`${path}: axe finds nothing in the figures or the drawing`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(path);
      await renderAll(page);
      let builder = new AxeBuilder({ page })
        .include(".hir")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]);
      if (path.includes("product")) builder = builder.include("figure.fig");
      const results = await builder.analyze();
      expect(
        results.violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
        ),
      ).toEqual([]);
    });
  }
});
