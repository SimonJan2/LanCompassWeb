import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { builtHtml, FLAGS, layOutInFull, pages, pathFor, siteBase, siteProject } from "./helpers";

/** A build with the form endpoint configured: the light flags build, or the theme build
 *  itself (the dark and auto test builds set PUBLIC_FORM_ENDPOINT; scripts/build-test.mjs). */
const formsBase = () => (siteProject().theme === "light" ? FLAGS : siteBase());

const widths = [390, 1440];

/** W10: WCAG 2.2 AA — axe's wcag22aa rules (target-size) on top of 2.0 and 2.1 A and AA. */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

/** Every page of the project's build, as a path (W10: axe on every page, not a sample). */
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
  return out.sort();
}
const SWEEP_CHUNKS = 8;

/**
 * Contrast is measured at rest. axe scrolls each element into view while it checks, and the
 * scroll-driven section reveal (global.css, motion.spec.ts) then leaves an element below it
 * part-way through its fade-in, which axe reads as low contrast (W2 met it: a longer offline
 * band put one title at opacity 0.42 on / at 390 px, 3.48:1). Reduced motion turns the reveal
 * off, so axe sees the page as a reader does once it has scrolled there.
 */
test.describe("axe: zero violations", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  for (const width of widths) {
    for (const p of pages) {
      test(`${p.path} at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(p.path);
        await layOutInFull(page);
        const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
        expect(
          results.violations.map(
            (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
          ),
        ).toEqual([]);
      });
    }
  }

  // W10: every other page of the build — the release notes, all 130 docs articles and both
  // indexes, the 404s — at 1440 px, in every theme (the pages above run at both widths).
  for (let chunk = 0; chunk < SWEEP_CHUNKS; chunk++) {
    test(`every built page, part ${chunk + 1} of ${SWEEP_CHUNKS}, at 1440px`, async ({ page }) => {
      test.setTimeout(240_000);
      const covered = new Set(pages.map((p) => p.path));
      const all = builtPaths(siteProject().dist).filter(
        (path) => !covered.has(path) && !/design-partners/.test(path),
      );
      expect(all.length).toBeGreaterThanOrEqual(144);
      await page.setViewportSize({ width: 1440, height: 900 });
      const failures: string[] = [];
      for (const path of all.filter((_, i) => i % SWEEP_CHUNKS === chunk)) {
        await page.goto(path);
        await layOutInFull(page);
        const axe = new AxeBuilder({ page }).withTags(TAGS);
        // The product's own article text (W9, verbatim): its dashboard-gallery table leaves the
        // corner header cell empty ("| | Follow | Make it mine |"), which axe's best-practice
        // rule flags (no WCAG criterion requires it). A product finding (night E report).
        if (/\/docs\/dashboard-gallery\/$/.test(path)) axe.disableRules(["empty-table-header"]);
        const results = await axe.analyze();
        for (const v of results.violations) {
          failures.push(`${path} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
        }
      }
      expect(failures).toEqual([]);
    });
  }

  test("forms (endpoint configured) have zero violations in both locales", async ({ page }) => {
    for (const locale of ["en", "he"] as const) {
      for (const which of ["pilot", "contact"] as const) {
        await page.goto(`${formsBase()}${pathFor(locale, which)}`);
        // Show every error state too.
        await page.locator("form[data-lc-form] button[type=submit]").click();
        await layOutInFull(page);
        const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
        expect(
          results.violations.map(
            (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
          ),
          `${locale} ${which}`,
        ).toEqual([]);
      }
    }
  });
});

test.describe("keyboard", () => {
  test("the skip link is first and moves focus to main", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.locator(".skip-link");
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });

  test("desktop navigation is reachable by Tab, in order", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const seen: string[] = [];
    // Nine stops reach the header's last control: the skip link, the logo, four links, the
    // language menu and "Start a pilot" — and, in an auto build, the light/dark switch (W13).
    for (let i = 0; i < 9; i++) {
      await page.keyboard.press("Tab");
      seen.push(
        await page.evaluate(() => (document.activeElement as HTMLElement).innerText.trim()),
      );
    }
    expect(seen).toEqual(expect.arrayContaining(["Product", "Security", "Pilot", "Start a pilot"]));
  });

  test("language menu opens with the keyboard and closes with Escape", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const summary = page.locator("header details[data-disclosure] summary");
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("header details[data-disclosure]")).toHaveAttribute("open", "");
    await page.keyboard.press("Escape");
    await expect(page.locator("header details[data-disclosure]")).not.toHaveAttribute("open", "");
    await expect(summary).toBeFocused();
  });

  for (const locale of ["en", "he"] as const) {
    test(`mobile sheet (${locale}): opens by keyboard, keeps focus inside, Escape closes`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(pathFor(locale, "home"));
      const toggle = page.locator("[data-menu-open]");
      await toggle.focus();
      await page.keyboard.press("Enter");
      const sheet = page.locator("dialog[data-menu-sheet]");
      await expect(sheet).toBeVisible();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press("Tab");
        const inside = await page.evaluate(() => {
          const el = document.activeElement;
          return !!el && (el.closest("dialog[data-menu-sheet]") !== null || el === document.body);
        });
        expect(inside).toBe(true);
      }
      await page.keyboard.press("Escape");
      await expect(sheet).toBeHidden();
      await expect(toggle).toBeFocused();
    });
  }

  test("the design-partner form can be completed with the keyboard alone", async ({ page }) => {
    await page.route("https://forms.example.com/**", (route) =>
      route.fulfill({ status: 200, body: "ok" }),
    );
    await page.goto(`${formsBase()}/pilot/`);
    const focusedName = () =>
      page.evaluate(() => {
        const el = document.activeElement as HTMLInputElement | null;
        return el
          ? `${el.tagName.toLowerCase()}:${el.getAttribute("name") ?? el.getAttribute("type") ?? ""}`
          : "";
      });
    /** Tab forward until the element is focused; fail if it takes more than six presses. */
    const tabTo = async (target: string) => {
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press("Tab");
        if ((await focusedName()) === target) return;
      }
      throw new Error(`could not reach ${target} with Tab; stopped at ${await focusedName()}`);
    };
    await page.locator('form[data-lc-form] input[name="name"]').focus();
    await page.keyboard.type("Dana Levi");
    await tabTo("input:email");
    await page.keyboard.type("dana@example.org");
    await tabTo("input:organisation");
    await page.keyboard.type("Example Hospital");
    await tabTo("input:country");
    await page.keyboard.type("Israel");
    await tabTo("select:network_size");
    await page.keyboard.press("ArrowDown");
    await tabTo("input:vendors");
    await page.keyboard.press("Space");
    await tabTo("input:air_gapped");
    await page.keyboard.press("Space");
    await tabTo("textarea:message");
    await page.keyboard.type("Hello");
    await tabTo("input:consent");
    await page.keyboard.press("Space");
    await tabTo("button:submit");
    const requestPromise = page.waitForRequest("https://forms.example.com/submit");
    await page.keyboard.press("Enter");
    expect((await requestPromise).method()).toBe("POST");
  });
});

test.describe("atlas index", () => {
  for (const locale of ["en", "he"] as const) {
    test(`(${locale}) every preview opens on keyboard focus, reachable by Tab alone`, async ({
      page,
    }) => {
      const site = siteProject();
      test.skip(
        site.theme === "auto" && site.scheme === "dark",
        "auto under a dark scheme hides the (Survey) previews; tested below",
      );
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(pathFor(locale, "home"));
      const rows = page.locator("[data-atlas-row]");
      const keys = await rows.evaluateAll((els) =>
        els.map((el) => el.getAttribute("data-atlas-row") ?? ""),
      );
      expect(keys.length).toBeGreaterThanOrEqual(8);
      // Tab into the list from the element just before it, then walk it with Tab only.
      await page.locator("#atlas-title").evaluate((el) => {
        el.setAttribute("tabindex", "-1");
        (el as HTMLElement).focus();
      });
      for (const key of keys) {
        await page.keyboard.press("Tab");
        await expect(page.locator(`[data-atlas-row="${key}"]`)).toBeFocused();
        await expect(page.locator(`[data-atlas-preview="${key}"]`)).toBeVisible();
        for (const other of keys.filter((k) => k !== key)) {
          await expect(page.locator(`[data-atlas-preview="${other}"]`)).toBeHidden();
        }
      }
    });
  }

  test("previews also follow hover", async ({ page }) => {
    const site = siteProject();
    test.skip(
      site.theme === "auto" && site.scheme === "dark",
      "auto under a dark scheme hides the (Survey) previews; tested below",
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.locator('[data-atlas-row="nac"]').hover();
    await expect(page.locator('[data-atlas-preview="nac"]')).toBeVisible();
    await expect(page.locator('[data-atlas-preview="ipam"]')).toBeHidden();
  });

  test("auto under a dark scheme: no light preview on the night page; the rows still work", async ({
    page,
  }) => {
    const site = siteProject();
    test.skip(!(site.theme === "auto" && site.scheme === "dark"), "auto-dark only");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.locator('[data-atlas-row="nac"]').hover();
    await expect(page.locator("[data-atlas] .atlas-previews")).toBeHidden();
    await page.locator('[data-atlas-row="nac"]').focus();
    await expect(page.locator('[data-atlas-row="nac"]')).toBeFocused();
  });
});

/**
 * W10: the WCAG 2.2 criteria axe cannot check. 2.4.11 (focus not obscured) is tests/focus.spec.ts
 * and 2.5.8 (target size) tests/targets.spec.ts; these two read the markup.
 */
test.describe("WCAG 2.2: consistent help, redundant entry, accessible authentication", () => {
  test("3.2.6: every page offers the contact page in the same place — the footer, same position", () => {
    const root = join(process.cwd(), siteProject().dist);
    const orders = new Map<string, string[]>();
    for (const { file, html } of builtHtml(root)) {
      if (html.includes('<meta http-equiv="refresh"')) continue;
      const footer = html.match(/<nav class="footer-nav"[\s\S]*?<\/nav>/)?.[0] ?? "";
      // The footer's links, the locale prefix dropped: the same list on every page.
      const links = [...footer.matchAll(/<a href="([^"]+)"/g)].map((m) =>
        m[1]!.replace(/^\/he\//, "/"),
      );
      orders.set(relative(root, file), links);
    }
    expect(orders.size).toBeGreaterThanOrEqual(164);
    const [first, ...rest] = [...orders];
    expect(first![1]).toContain("/contact/");
    for (const [file, links] of rest) expect(links, file).toEqual(first![1]);
  });

  test("3.3.7 and 3.3.8: each form asks for each thing once, in one step, with no puzzle and no password", async ({
    page,
  }) => {
    for (const locale of ["en", "he"] as const) {
      for (const which of ["pilot", "contact"] as const) {
        await page.goto(`${formsBase()}${pathFor(locale, which)}`);
        const form = page.locator("form[data-lc-form]");
        await expect(form, `${locale} ${which}`).toHaveCount(1);
        const fields = await form.evaluate((f) =>
          Array.from(
            f.querySelectorAll<HTMLInputElement>(
              "input:not([type=hidden]):not([data-honeypot]), select, textarea",
            ),
          ).map((el) => ({
            name: el.name,
            type: el.type,
            autocomplete: el.getAttribute("autocomplete") ?? "",
            label: (el.labels?.[0]?.textContent ?? "").trim(),
          })),
        );
        // A checkbox or radio group shares one name: it is one question.
        const names = fields
          .filter((x) => x.type !== "checkbox" && x.type !== "radio")
          .map((x) => x.name);
        expect(new Set(names).size, `${locale} ${which}: a field asked twice`).toBe(names.length);
        const tokens = fields.map((x) => x.autocomplete).filter((t) => t && t !== "off");
        expect(new Set(tokens).size, `${locale} ${which}: autocomplete twice`).toBe(tokens.length);
        expect(fields.map((x) => x.label).join("|")).not.toMatch(/confirm|again|repeat|אימות|שוב/i);
        // The name and the address can be filled in by the browser (3.3.7's "available to select").
        expect(tokens).toEqual(expect.arrayContaining(["name", "email"]));
        // One step: one submit button, no "next".
        await expect(form.locator("button[type=submit]")).toHaveCount(1);
        await expect(page.locator('input[type="password"]')).toHaveCount(0);
        // No CAPTCHA or puzzle; the spam guard is a honeypot hidden from people and from AT.
        expect(
          await page.locator("iframe, [class*=captcha i], [id*=captcha i], [data-sitekey]").count(),
        ).toBe(0);
        await expect(form.locator(".hp")).toHaveAttribute("aria-hidden", "true");
        await expect(form.locator("[data-honeypot]")).toHaveAttribute("tabindex", "-1");
        const box = await form.locator(".hp").boundingBox();
        expect((box?.width ?? 0) <= 1 && (box?.height ?? 0) <= 1, "honeypot clipped").toBe(true);
      }
    }
  });
});
