import { readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { expect, test, type Page } from "@playwright/test";
import { layOutInFull, rendersDark, siteProject } from "./helpers";

/**
 * W14 (DECISIONS.md D-FRAME, D-TABLE): every product picture is an app window, and the sections
 * that show the product sit on the chart table. In every project, on the six pages that draw
 * pictures, at 1,440 and 390 px:
 *
 *  - every `.shot`: corners of at least 8 px; the title bar's generated name is "LanCompass " and
 *    the version media-library/screens/CAPTURED.json records; the name sits inside the bar, clear
 *    of the dots (the bar's first 52 px) and of a figure's "Survey | Night chart" control — its
 *    width measured with the canvas in the name's own computed font, placed as its CSS places it;
 *    a lift of at least two layers, with the night's glow among them where the page renders dark;
 *  - every player (`.video-el`, `.video-poster`): the same corners, edge and lift, and its box as
 *    before — 16:9 across its column, with no title bar;
 *  - the table: each listed section's ground is the table colour (in auto builds under both
 *    overrides too); pixels 2 px inside each edge of the window, at the table's middle, are the
 *    table (it runs the whole width); a line at each edge, read in the window's pixels — the
 *    table's own hairline where it meets the page's grounds, or the line its neighbour already
 *    draws there (a night band, /product's section bar, /pilot's hero rule, the datasheet's
 *    rule); and no page scrolls sideways at 390 px.
 *
 * The edge's distance from its ground (ΔE2000 ≥ 15) is held by tests/identity.spec.ts.
 */

const root = process.cwd();
const version = (
  JSON.parse(readFileSync(join(root, "media-library", "screens", "CAPTURED.json"), "utf8")) as {
    product_version: string;
  }
).product_version;
const tokens = readFileSync(join(root, "src", "styles", "tokens.css"), "utf8");
const token = (name: string) => {
  const value = tokens.match(new RegExp(`^\\s*${name}:\\s*([^;]+);`, "m"))?.[1]?.trim();
  if (!value) throw new Error(`tokens.css: no ${name}`);
  return value;
};
type RGB = [number, number, number];
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const TABLE = { light: hex(token("--lc-table")), dark: hex(token("--lc-dark-table")) };
const RULE = { light: hex(token("--lc-table-rule")), dark: hex(token("--lc-dark-table-rule")) };
/** The night's glow, rgba(r, g, b, a): its four numbers. */
const GLOW = token("--lc-dark-window-glow")
  .match(/[\d.]+/g)!
  .map(Number);

/** How a table's edge is drawn: its own hairline where it meets the page's grounds ("rule"), or a
 *  line its neighbour already draws there ("line"): a night band's edge, /product's section bar,
 *  /pilot's hero rule, the home datasheet's rule. */
type Edge = "rule" | "line";
interface Table {
  /** The table's first and last section (What's new runs on into the dusk sweep: one table). */
  first: string;
  last: string;
  top: Edge;
  bottom: Edge;
}
/** The six pages that draw product pictures, their table sections, and their tables. */
const PAGES: { path: string; sections: string[]; tables: Table[] }[] = ["", "/he"].flatMap(
  (prefix) => [
    {
      path: `${prefix}/`,
      sections: [".whats-new", ".sweep", "#hebrew", "#videos"],
      tables: [
        { first: ".whats-new", last: ".sweep", top: "line", bottom: "rule" },
        { first: "#hebrew", last: "#hebrew", top: "line", bottom: "rule" },
        { first: "#videos", last: "#videos", top: "rule", bottom: "line" },
      ],
    },
    {
      path: `${prefix}/product/`,
      sections: ["section.compare"],
      tables: [{ first: "section.compare", last: "section.compare", top: "line", bottom: "rule" }],
    },
    {
      path: `${prefix}/pilot/`,
      sections: [".twin"],
      tables: [{ first: ".twin", last: ".twin", top: "line", bottom: "rule" }],
    },
  ],
);
const WIDTHS = [
  [1440, 900],
  [390, 844],
] as const;

/** A column of the window's pixels: a 1 px wide screenshot, its PNG decoded. One pixel per row,
 *  so a row's filter predicts only from the row above: Up and Paeth add it, Average half of it,
 *  None and Sub nothing. */
async function column(page: Page, x: number, y: number, rows: number): Promise<RGB[]> {
  const png = await page.screenshot({ clip: { x, y, width: 1, height: rows } });
  const idat: Buffer[] = [];
  let bpp = 3;
  for (let pos = 8; pos < png.length;) {
    const length = png.readUInt32BE(pos);
    const type = png.toString("ascii", pos + 4, pos + 8);
    if (type === "IHDR") bpp = png[pos + 8 + 9] === 6 ? 4 : 3;
    if (type === "IDAT") idat.push(png.subarray(pos + 8, pos + 8 + length));
    pos += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const out: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const start = r * (bpp + 1);
    const filter = raw[start]!;
    const px = [...raw.subarray(start + 1, start + 1 + bpp)];
    const up = out[r - 1] ?? px.map(() => 0);
    for (let c = 0; c < bpp; c++) {
      if (filter === 2 || filter === 4) px[c] = (px[c]! + up[c]!) & 255;
      else if (filter === 3) px[c] = (px[c]! + (up[c]! >> 1)) & 255;
    }
    out.push(px);
  }
  return out.map((p) => [p[0]!, p[1]!, p[2]!]);
}

const near = (a: RGB, b: RGB, tolerance: number) =>
  a.every((c, i) => Math.abs(c - b[i]!) <= tolerance);

/** The page's rendered scheme: the project's, or an override's. */
async function dark(page: Page): Promise<boolean> {
  return page.evaluate(() => getComputedStyle(document.documentElement).colorScheme === "dark");
}

/** In an auto project, the override that differs from the system (a visitor's earlier choice). */
async function override(page: Page, value: "light" | "dark") {
  await page.addInitScript((v) => {
    try {
      localStorage.setItem("lc-theme", v);
    } catch {}
  }, value);
}

interface ShotReport {
  screen: string;
  radius: number;
  layers: string[];
  label: string;
  /** The name's box in the bar, from the bar's left edge, or null when it is not drawn. */
  box: { x0: number; x1: number; bar: number; sets: number | null } | null;
  shown: boolean;
  figure: boolean;
}

/** Every `.shot` on the page: its corners, its lift's layers, its name and where the name sits. */
async function shots(page: Page): Promise<ShotReport[]> {
  return page.evaluate(async () => {
    await document.fonts.ready;
    const ctx = document.createElement("canvas").getContext("2d")!;
    const layers = (s: string) =>
      s === "none" ? [] : s.split(/,(?![^(]*\))/).map((l) => l.trim());
    const out = [];
    for (const shot of document.querySelectorAll<HTMLElement>(".shot")) {
      const style = getComputedStyle(shot);
      const rect = shot.getBoundingClientRect();
      const bar = shot.querySelector<HTMLElement>(".shot-bar")!;
      const after = getComputedStyle(bar, "::after");
      const label = [...after.content.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]).join("");
      const shown = rect.width > 0 && style.display !== "none";
      let box = null;
      if (shown && after.display !== "none" && after.content !== "none" && label) {
        const font = `${after.fontStyle} ${after.fontWeight} ${after.fontSize} ${after.fontFamily}`;
        await document.fonts.load(font, label);
        ctx.font = font;
        ctx.letterSpacing = after.letterSpacing;
        const width = ctx.measureText(label).width;
        const b = bar.getBoundingClientRect();
        // The name's box is the bar's (position: absolute; inset: 0), less its padding.
        const left = parseFloat(after.paddingLeft);
        const right = b.width - parseFloat(after.paddingRight);
        const align = after.textAlign;
        const x0 =
          align === "center"
            ? left + (right - left - width) / 2
            : align === "right" || align === "end"
              ? right - width
              : left;
        const sets = shot.querySelector(".fig-sets")?.getBoundingClientRect();
        box = { x0, x1: x0 + width, bar: b.width, sets: sets ? sets.left - b.left : null };
      }
      out.push({
        screen: shot.dataset["screen"] ?? "",
        radius: parseFloat(style.borderTopLeftRadius),
        layers: layers(style.boxShadow),
        label,
        box,
        shown,
        figure: !!shot.closest(".fig"),
      });
    }
    return out;
  });
}

/** Whether a lift's layers hold the night's glow. */
const hasGlow = (layers: string[]) =>
  layers.some((l) => {
    const n =
      l
        .match(/rgba?\(([^)]*)\)/)?.[1]
        ?.split(/[\s,/]+/)
        .map(Number) ?? [];
    return (
      n.length === 4 &&
      n.slice(0, 3).every((c, i) => c === GLOW[i]) &&
      Math.abs(n[3]! - GLOW[3]!) < 0.01
    );
  });

for (const p of PAGES) {
  test(`${p.path}: every picture is a window named "LanCompass ${version}", its name clear of the dots and the control`, async ({
    page,
  }) => {
    const rows: string[] = [];
    for (const [width, height] of WIDTHS) {
      await page.setViewportSize({ width, height });
      await page.goto(p.path);
      // /product's figures get their "Survey | Night chart" control from the page's script.
      if (p.path.endsWith("/product/"))
        await expect(page.locator(".fig .fig-sets")).toHaveCount(10);
      await layOutInFull(page);
      const night = await dark(page);
      expect(night, "the page renders the project's scheme").toBe(rendersDark());
      const list = await shots(page);
      expect(list.length, `${p.path} @${width}: pictures`).toBeGreaterThan(0);
      for (const s of list) {
        const id = `${p.path} @${width} ${s.screen}`;
        expect(s.radius, `${id}: corners`).toBeGreaterThanOrEqual(8);
        expect(s.label, `${id}: the window's name`).toBe(`LanCompass ${version}`);
        expect(s.layers.length, `${id}: a lift of two layers or more`).toBeGreaterThanOrEqual(2);
        if (night) expect(hasGlow(s.layers), `${id}: the glow, by night`).toBe(true);
        if (!s.shown) continue;
        // A figure's bar may drop the name where it is too narrow to hold it beside the control.
        if (!s.box) {
          expect(s.figure && width < 960, `${id}: the name is drawn`).toBe(true);
          continue;
        }
        const { x0, x1, bar, sets } = s.box;
        rows.push(
          `${width}\t${s.screen}\t${x0.toFixed(1)}–${x1.toFixed(1)} of ${bar.toFixed(1)}${sets === null ? "" : `, control from ${sets.toFixed(1)}`}`,
        );
        expect(x0, `${id}: clear of the dots`).toBeGreaterThanOrEqual(52);
        expect(x1, `${id}: inside the bar`).toBeLessThanOrEqual(bar);
        if (sets !== null) expect(x1, `${id}: clear of the control`).toBeLessThanOrEqual(sets - 4);
      }
    }
    test.info().annotations.push({ type: "names", description: rows.join("\n") });
  });
}

for (const path of ["/", "/he/"]) {
  test(`${path}: every player has the window's corners, edge and lift, and keeps its box`, async ({
    page,
  }) => {
    for (const [width, height] of WIDTHS) {
      await page.setViewportSize({ width, height });
      await page.goto(path);
      await layOutInFull(page);
      const night = await dark(page);
      const players = await page.evaluate(() => {
        const layers = (s: string) =>
          s === "none" ? [] : s.split(/,(?![^(]*\))/).map((l) => l.trim());
        const edge = getComputedStyle(document.querySelector(".shot")!).borderTopColor;
        return [...document.querySelectorAll<HTMLElement>(".video-el, .video-poster")].map((el) => {
          const style = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          const column = el.closest("figure")!.getBoundingClientRect();
          const frame = (el.closest(".video-frame") ?? el).getBoundingClientRect();
          return {
            radius: parseFloat(style.borderTopLeftRadius),
            edge: style.borderTopColor,
            windowEdge: edge,
            borderWidth: parseFloat(style.borderTopWidth),
            layers: layers(style.boxShadow),
            width: r.width,
            height: r.height,
            column: column.width,
            frameHeight: frame.height,
          };
        });
      });
      expect(players.length, `${path} @${width}: players`).toBe(3);
      for (const [i, v] of players.entries()) {
        const id = `${path} @${width} player ${i + 1}`;
        expect(v.radius, `${id}: corners`).toBeGreaterThanOrEqual(8);
        expect(v.edge, `${id}: the window's edge`).toBe(v.windowEdge);
        expect(v.borderWidth, `${id}: a hairline`).toBe(1);
        expect(v.layers.length, `${id}: a lift`).toBeGreaterThanOrEqual(2);
        if (night) expect(hasGlow(v.layers), `${id}: the glow, by night`).toBe(true);
        // The box as before W14: the column's width, 16:9, and no bar above it.
        expect(Math.abs(v.width - v.column), `${id}: the column's width`).toBeLessThan(0.5);
        expect(Math.abs(v.height - (v.width * 9) / 16), `${id}: 16:9`).toBeLessThan(1);
        expect(Math.abs(v.frameHeight - v.height), `${id}: nothing above the player`).toBeLessThan(
          0.5,
        );
      }
    }
  });
}

/** Each listed section's ground, rendered: the table colour of the page's scheme. */
async function grounds(page: Page, sections: string[]) {
  const want = (await dark(page)) ? TABLE.dark : TABLE.light;
  for (const sel of sections) {
    const bg = await page
      .locator(sel)
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg, `${sel}: the table`).toBe(`rgb(${want.join(", ")})`);
  }
}

for (const p of PAGES) {
  test(`${p.path}: the product's sections sit on the table, across the whole window, a line at each edge`, async ({
    page,
  }) => {
    const rows: string[] = [];
    const show = (c: RGB[]) => c.map((px) => px.join(",")).join(" / ");
    for (const [width, height] of WIDTHS) {
      await page.setViewportSize({ width, height });
      await page.goto(p.path);
      await grounds(page, p.sections);
      const scheme = (await dark(page)) ? "dark" : "light";
      const pageGround: RGB =
        scheme === "dark" ? hex(token("--lc-dark-night")) : hex(token("--lc-paper"));
      for (const { first, last, top, bottom } of p.tables) {
        /** Bring a point of the table to the window's middle; then its row there (the middle, the
         *  top row, the bottom row) and the section's horizontal middle, in the window. */
        const bring = (sel: string, edge: "top" | "middle" | "bottom") =>
          page
            .locator(sel)
            .first()
            .evaluate(async (el, e) => {
              // A deferred section (content-visibility: auto) takes its real height only once it
              // nears the window: scroll, let two frames pass, and measure again until it holds.
              const frames = () =>
                new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
              for (let i = 0; i < 4; i++) {
                const r = el.getBoundingClientRect();
                const doc =
                  e === "top" ? r.top : e === "bottom" ? r.bottom : (r.top + r.bottom) / 2;
                scrollTo(0, Math.round(doc + scrollY - innerHeight / 2));
                await frames();
              }
              const now = el.getBoundingClientRect();
              const y =
                e === "top"
                  ? Math.round(now.top)
                  : e === "bottom"
                    ? Math.round(now.bottom) - 1
                    : Math.round((now.top + now.bottom) / 2);
              return { y, mid: Math.round((now.left + now.right) / 2) };
            }, edge);
        // The middle: the table's ground 2 px inside each edge of the window (it runs the width).
        {
          const { y } = await bring(first, "middle");
          await page.waitForTimeout(100);
          for (const x of [2, width - 3]) {
            const [px] = await column(page, x, y, 1);
            rows.push(`${width}\t${first} middle @${x}\t${px!.join(",")}`);
            expect(
              near(px!, TABLE[scheme], 8),
              `${p.path} @${width} ${first} middle x=${x}: ${px} vs ${TABLE[scheme]}`,
            ).toBe(true);
          }
        }
        for (const [sel, edge, kind] of [
          [first, "top", top],
          [last, "bottom", bottom],
        ] as const) {
          const { y, mid } = await bring(sel, edge);
          await page.waitForTimeout(100);
          if (kind === "rule") {
            // Its own hairline, across the window: an edge row lands within a pixel of its layout
            // position (sub-pixel layout, snapped when painted), so four rows around it.
            for (const x of [2, width - 3]) {
              const px = await column(page, x, y - 2, 4);
              rows.push(`${width}\t${sel} ${edge} rule @${x}\t${show(px)}`);
              expect(
                px.some((c) => near(c, RULE[scheme], 4)),
                `${p.path} @${width} ${sel} ${edge} hairline x=${x}: ${show(px)} vs ${RULE[scheme]}`,
              ).toBe(true);
            }
          } else {
            // The neighbour's own line or band, just outside the table at its middle: something
            // that is neither the table nor the bare page.
            const px = await column(page, mid, edge === "top" ? y - 4 : y + 1, 4);
            rows.push(`${width}\t${sel} ${edge} line @${mid}\t${show(px)}`);
            expect(
              px.some((c) => !near(c, TABLE[scheme], 4) && !near(c, pageGround, 4)),
              `${p.path} @${width} ${sel} ${edge}: a line beside the table, got ${show(px)}`,
            ).toBe(true);
          }
        }
      }
      if (width === 390) {
        const [scroll, inner] = await page.evaluate(() => [
          document.documentElement.scrollWidth,
          innerWidth,
        ]);
        expect(scroll, `${p.path} @390: no sideways scroll`).toBeLessThanOrEqual(inner);
      }
    }
    test.info().annotations.push({ type: "pixels", description: rows.join("\n") });
  });
}

for (const p of PAGES) {
  test(`${p.path}: under an override the table follows the page`, async ({ page }) => {
    const { theme, scheme } = siteProject();
    test.skip(theme !== "auto", "an override exists in auto builds only");
    // The override differs from the system, as a visitor's choice is kept (D-SWITCH).
    const choice = scheme === "dark" ? "light" : "dark";
    await override(page, choice);
    await page.goto(p.path);
    await expect(page.locator("html")).toHaveAttribute("data-theme", choice);
    expect(await dark(page)).toBe(choice === "dark");
    await grounds(page, p.sections);
    if (choice === "dark") {
      await layOutInFull(page);
      for (const s of await shots(page))
        expect(hasGlow(s.layers), `${p.path} ${s.screen}: the glow under a dark override`).toBe(
          true,
        );
    }
  });
}
