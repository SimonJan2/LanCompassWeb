import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { pages, rendersDark, siteProject } from "./helpers";

/**
 * W11: every product screen the site draws can be read at its display size (DECISIONS.md
 * D-LEGIBLE, D-PHONE-SCREENS; src/content/screen-slots.json). Measured, not estimated, at a
 * 1,440 × 900 and a 390 × 844 window, on every page in both locales, in every theme project:
 *
 *  - each shown `.shot` image's drawn width ÷ the width of the product's own view its file holds
 *    (a crop's clip, from src/content/screen-anchors.json; 1,440 for the whole window) is ≥ 1 for
 *    a crop; a whole window is drawn only at ≥ 0.8, and never below 960 px;
 *  - the loaded file has at least two pixels per CSS px it is drawn at (sharp at device scale 2);
 *  - below 960 px a slot with a phone crop loads it (currentSrc), above it the desktop crop;
 *  - the loaded file is the scheme's own set: Night chart where the page renders dark (W13: the
 *    showcase's frames — the sweep, the slider, the twin frames — show a fixed set, both ways);
 *  - one candidate per <source>, and no srcset width list.
 */

const root = process.cwd();
const anchors = JSON.parse(
  readFileSync(join(root, "src", "content", "screen-anchors.json"), "utf8"),
) as Record<string, Record<string, Record<string, { clips?: Record<string, { width: number }> }>>>;
const slotTable = JSON.parse(
  readFileSync(join(root, "src", "content", "screen-slots.json"), "utf8"),
) as {
  breakpoint: number;
  slots: Record<string, { phone: unknown; full?: { width: number } }>;
};

interface Shot {
  key: string;
  src: string;
  drawn: number;
  natural: number;
  /** W13: a showcase frame (the sweep, the slider, the twin frames) shows a fixed set. */
  showcase: boolean;
}

/** Every shown screen image on the page, after every lazy one has loaded. */
async function shots(page: Page): Promise<Shot[]> {
  // Lay out the deferred sections, then scroll through so every lazy image loads.
  await page.addStyleTag({ content: "* { content-visibility: visible !important; }" });
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight / 2) {
      scrollTo(0, y);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    }
    scrollTo(0, 0);
  });
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() =>
    [...document.querySelectorAll<HTMLImageElement>(".shot[data-screen] img")].every(
      (img) => img.getBoundingClientRect().width === 0 || img.complete,
    ),
  );
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".shot[data-screen]")].flatMap((s) => {
      const img = s.querySelector<HTMLImageElement>("img");
      if (!img) return [];
      const r = img.getBoundingClientRect();
      if (r.width === 0 || getComputedStyle(s).display === "none") return [];
      return [
        {
          key: s.dataset["screen"] ?? "",
          src: new URL(img.currentSrc).pathname,
          drawn: r.width,
          natural: img.naturalWidth,
          showcase: !!s.closest(".sweep, .compare, .twin"),
        },
      ];
    }),
  );
}

/** /screens/<set>/<locale>/<key>.<picture>.webp → its parts. */
function parse(src: string) {
  const m = src.match(/^\/screens\/(survey|night-chart)\/(en|he)\/([a-z-]+)\.([a-z-]+)\.webp$/);
  return m ? { set: m[1]!, locale: m[2]!, key: m[3]!, picture: m[4]! } : null;
}

for (const p of pages) {
  test(`${p.path}: every screen is drawn at its own size or larger, sharp, the right crop and set`, async ({
    page,
  }) => {
    const rows: string[] = [];
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.goto(p.path);
      for (const s of await shots(page)) {
        const id = `${p.path} @${width} ${s.key} ${s.src}`;
        const f = parse(s.src);
        expect(f, `${id}: a served screen`).not.toBeNull();
        expect(f!.key, id).toBe(s.key);
        // W13: the showcase shows both official sets in every build, by design.
        if (!s.showcase)
          expect(f!.set, `${id}: the scheme's own set`).toBe(
            rendersDark() ? "night-chart" : "survey",
          );
        const slot = f!.picture.replace(/-phone$/, "");
        const phone = f!.picture.endsWith("-phone");
        const hasPhone = slotTable.slots[slot]?.phone != null;
        if (width >= slotTable.breakpoint) expect(phone, `${id}: the desktop crop`).toBe(false);
        else if (hasPhone) expect(phone, `${id}: the phone crop`).toBe(true);
        const whole = !phone && slotTable.slots[slot]?.full != null;
        const view = whole
          ? 1440
          : anchors[f!.set]?.[f!.locale]?.[f!.key]?.clips?.[f!.picture]?.width;
        expect(view, `${id}: its clip is recorded`).toBeGreaterThan(0);
        const ratio = s.drawn / view!;
        rows.push(
          `${width}\t${s.key}\t${f!.picture}\t${view}\t${s.drawn.toFixed(1)}\t${ratio.toFixed(2)}`,
        );
        if (whole) {
          expect(width, `${id}: a whole window only on a desktop`).toBeGreaterThanOrEqual(
            slotTable.breakpoint,
          );
          expect(ratio, `${id}: a whole window at ≥ 0.8`).toBeGreaterThanOrEqual(0.8);
        } else expect(ratio, `${id}: a crop at ≥ 1:1`).toBeGreaterThanOrEqual(1);
        expect(s.natural, `${id}: two pixels per CSS px`).toBeGreaterThanOrEqual(2 * s.drawn);
      }
    }
    test.info().annotations.push({ type: "slots", description: rows.join("\n") || "none" });
    // One candidate per <source>, and no srcset width list anywhere a screen is drawn.
    const srcsets = await page
      .locator(".shot[data-screen] source, .shot[data-screen] img[srcset]")
      .evaluateAll((els) => els.map((el) => el.getAttribute("srcset") ?? ""));
    for (const s of srcsets) expect(s, "one candidate per source").toMatch(/^\/screens\/\S+$/);
  });
}

test("the slot table's crops fit their slots: no wider than drawn, the serve width ≥ twice it", () => {
  test.skip(siteProject().theme !== "light", "a source check: light project only");
  const table = JSON.parse(
    readFileSync(join(root, "src", "content", "screen-slots.json"), "utf8"),
  ) as {
    slots: Record<
      string,
      {
        drawn: {
          start: Record<"light" | "dark", Record<string, number | null>>;
          result: Record<"light" | "dark", Record<string, number | null>> | null;
        };
        crop: { width: number; height: number; serve: number } | null;
        phone: { width: number; height: number; serve: number } | null;
      }
    >;
  };
  for (const [name, s] of Object.entries(table.slots)) {
    // A crop fits the narrower slot (the dark frame's mat) and is sharp in the wider one.
    for (const drawn of Object.values(s.drawn.result ?? s.drawn.start)) {
      const desk = drawn["1440"];
      const phoneDrawn = drawn["390"];
      if (s.crop) {
        expect(s.crop.width, `${name}: crop ≤ drawn at 1,440`).toBeLessThanOrEqual(desk!);
        expect(s.crop.serve, `${name}: serve ≥ 2 × drawn`).toBeGreaterThanOrEqual(2 * desk!);
        if (!s.phone && phoneDrawn != null) {
          // The same crop serves a phone too.
          expect(s.crop.width, `${name}: crop ≤ drawn at 390`).toBeLessThanOrEqual(phoneDrawn);
          expect(s.crop.serve).toBeGreaterThanOrEqual(2 * phoneDrawn);
        }
      }
      if (s.phone) {
        expect(s.phone.width, `${name}: phone crop ≤ drawn at 390`).toBeLessThanOrEqual(
          phoneDrawn!,
        );
        expect(s.phone.serve).toBeGreaterThanOrEqual(2 * phoneDrawn!);
      }
    }
  }
});
