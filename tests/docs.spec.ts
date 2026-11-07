import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FLAGS, siteBase, siteProject } from "./helpers";

/**
 * W9: the product's docs on the site. The sync script on a two-page fixture (once, in the light
 * project), then the built docs in every theme: seven categories in the product's order, 65
 * articles per locale with lang, dir, the version line, hreflang twins, previous/next within the
 * category, alt text, LTR code on Hebrew pages, the links between articles, the stale notice
 * (a fixture page in the flags build), the phone disclosure, and axe on a sample.
 */

const root = process.cwd();
const fixture = join(root, "tests", "fixtures", "docs-sync");
const CATEGORIES = [
  "getting-started",
  "how-to",
  "ipam",
  "inventory",
  "integrations",
  "operations",
  "system",
];
const latest = (
  JSON.parse(readFileSync(join(root, "src", "content", "releases.json"), "utf8")) as {
    releases: { version: string }[];
  }
).releases[0]!.version;
const onceOnly = () => test.skip(test.info().project.name !== "light", "a source check: once");
const prefixOf = (locale: string) => (locale === "en" ? "" : `/${locale}`);
const slugsOf = (locale: string) =>
  readdirSync(join(root, "src", "content", "docs", locale))
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.slice(0, -3))
    .sort();
/** The docs pages of a built site, as { path, html }. */
function builtDocs(locale: string): { slug: string; path: string; html: string }[] {
  const dir = join(root, siteProject().dist, ...(locale === "en" ? [] : [locale]), "docs");
  return readdirSync(dir)
    .filter((d) => statSync(join(dir, d)).isDirectory())
    .map((slug) => ({
      slug,
      path: `${prefixOf(locale)}/docs/${slug}/`,
      html: readFileSync(join(dir, slug, "index.html"), "utf8"),
    }));
}
const builtFile = (path: string) =>
  existsSync(join(root, siteProject().dist, ...path.split("/").filter(Boolean), "index.html"));
const files = (dir: string): Record<string, string> => {
  const out: Record<string, string> = {};
  const walk = (d: string, rel: string) => {
    for (const name of readdirSync(d).sort()) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full, `${rel}${name}/`);
      else out[`${rel}${name}`] = readFileSync(full, "utf8");
    }
  };
  walk(dir, "");
  return out;
};

test.describe("the docs sync script (W9)", () => {
  test.beforeEach(onceOnly);

  test("a two-page fixture gives the expected files, and a second run changes nothing", () => {
    const tmp = mkdtempSync(join(tmpdir(), "lc-docs-"));
    const args = [
      join(root, "scripts", "sync-docs.mjs"),
      fixture,
      "--version",
      "9.9.9",
      "--locales",
      "en,he",
      "--out",
      join(tmp, "docs"),
      "--assets",
      join(tmp, "assets"),
    ];
    const first = execFileSync("node", args, { encoding: "utf8" });
    expect(first).toContain("FINISHED-sync-docs 4 pages");
    expect(first).toContain('written: {"new":4,"changed":0,"unchanged":0}');
    expect(files(tmp)).toEqual(files(join(fixture, "expected")));
    const second = execFileSync("node", args, { encoding: "utf8" });
    expect(second).toContain('written: {"new":0,"changed":0,"unchanged":4}');
    expect(second).toContain("(copied 0, unchanged 1)");
    expect(files(tmp)).toEqual(files(join(fixture, "expected")));
  });

  test("each link kind is rewritten as the contract says", () => {
    const en = readFileSync(join(fixture, "expected", "docs", "en", "alpha.md"), "utf8");
    const he = readFileSync(join(fixture, "expected", "docs", "he", "alpha.md"), "utf8");
    // A docs link and a docs link with an anchor → the site's article, per locale.
    expect(en).toContain("[Beta](/docs/beta/)");
    expect(en).toContain("[its part](/docs/beta/#the-part)");
    expect(he).toContain("[בטא](/he/docs/beta/#החלק)");
    // A bare slug, which the product resolves the same way.
    expect(en).toContain("[the contract](/docs/beta/)");
    // An image → the asset path (Astro optimises it); the file is copied.
    expect(en).toContain("![A picture](../../assets/x/pic.svg)");
    expect(files(join(fixture, "expected", "assets"))).toHaveProperty(["x/pic.svg"]);
    // https:// and #anchor stay.
    expect(en).toContain("[the web](https://example.com/)");
    expect(en).toContain("[below](#below)");
    // A product route, the product's own /docs page and an unknown article become text.
    expect(en).toContain(", Settings, the Docs page, a gone page,");
    expect(he).toContain("ואת ⁦Settings⁩.");
    // Code is not rewritten.
    expect(en).toContain("`[not a link](/docs/beta)` stays code.");
    expect(en).toContain('echo "[also code](/settings)"');
    // The product's front matter, the version and the registry order are written.
    expect(en).toMatch(/^title: "Alpha"$/m);
    expect(en).toMatch(/^version: "9.9.9"$/m);
    expect(en).toMatch(/^order: 0$/m);
    expect(en).not.toMatch(/^stale:/m);
  });

  test("a translation made from an older English file is marked stale (the product's rule)", () => {
    const he = (slug: string) =>
      readFileSync(join(fixture, "expected", "docs", "he", `${slug}.md`), "utf8");
    expect(he("alpha")).toMatch(/^stale: false$/m);
    expect(he("beta")).toMatch(/^stale: true$/m);
  });

  test("the site's docs: 65 articles per locale, the same slugs, the release's version", () => {
    for (const locale of ["en", "he"]) {
      const slugs = slugsOf(locale);
      expect(slugs, locale).toHaveLength(65);
      expect(slugs).toEqual(slugsOf("en"));
      const orders = new Set<number>();
      for (const slug of slugs) {
        const text = readFileSync(
          join(root, "src", "content", "docs", locale, `${slug}.md`),
          "utf8",
        );
        expect(text, `${locale}/${slug}`).toMatch(new RegExp(`^version: "${latest}"$`, "m"));
        orders.add(Number(/^order: (\d+)$/m.exec(text)?.[1]));
      }
      expect(orders.size, locale).toBe(65);
    }
  });
});

for (const locale of ["en", "he"] as const) {
  const prefix = prefixOf(locale);

  test.describe(`${locale}: the docs (W9)`, () => {
    test(`${prefix}/docs/ lists seven categories in the product's order, every article once`, async ({
      page,
    }) => {
      const res = await page.goto(`${prefix}/docs/`);
      expect(res?.status()).toBe(200);
      expect(
        await page
          .locator(".docs-cat")
          .evaluateAll((els) => els.map((e) => e.getAttribute("data-category"))),
      ).toEqual(CATEGORIES);
      const listed = await page
        .locator(".docs-cat li")
        .evaluateAll((els) => els.map((e) => e.getAttribute("data-slug")!));
      expect(listed).toHaveLength(65);
      expect([...listed].sort()).toEqual(slugsOf(locale));
      for (const li of await page.locator(".docs-cat li").all()) {
        await expect(li.locator("p")).not.toBeEmpty();
      }
      await expect(page.locator(".docs-version")).toContainText(latest);
      await expect(page.locator("h1")).toHaveCount(1);
    });

    test(`${prefix}/docs/<slug>/: 65 pages with lang, dir, the version line, hreflang and neighbours`, () => {
      const pages = builtDocs(locale);
      expect(pages.map((p) => p.slug).sort()).toEqual(slugsOf(locale));
      const lang = locale === "en" ? 'lang="en" dir="ltr"' : 'lang="he" dir="rtl"';
      const line =
        locale === "en"
          ? `Docs for LanCompass ${latest} — the help built into the product`
          : `התיעוד של <bdi>LanCompass ${latest}</bdi> — העזרה שמובנית במוצר`;
      for (const p of pages) {
        expect(p.html, p.path).toContain(`<html ${lang}`);
        expect(p.html, p.path).toContain(line);
        expect(p.html, p.path).toContain(
          `<link rel="alternate" hreflang="en" href="${siteBase()}/docs/${p.slug}/">`,
        );
        expect(p.html, p.path).toContain(
          `<link rel="alternate" hreflang="he" href="${siteBase()}/he/docs/${p.slug}/">`,
        );
        expect(p.html, p.path).toContain(`<link rel="canonical" href="${siteBase()}${p.path}">`);
        expect((p.html.match(/<h1[\s>]/g) ?? []).length, p.path).toBe(1);
        for (const m of p.html.matchAll(/<a href="([^"]+)" rel="(?:prev|next)"/g)) {
          expect(builtFile(m[1]!), `${p.path} → ${m[1]}`).toBe(true);
        }
        // Every image keeps its alt text (none of 0.7.0's lacks one: no allowlist needed).
        for (const m of p.html.matchAll(/<img\b[^>]*>/g)) {
          expect(m[0], p.path).toMatch(/\salt="[^"]+"/);
        }
        if (locale === "he") {
          for (const m of p.html.matchAll(/<(pre|code)\b[^>]*>/g)) {
            expect(m[0], p.path).toContain('dir="ltr"');
          }
        }
      }
    });

    test(`${prefix}/docs/: every link between articles lands on a page and a heading`, () => {
      const pages = builtDocs(locale);
      const ids = new Map(
        pages.map((p) => [
          p.path,
          new Set([...p.html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]!)),
        ]),
      );
      const missing: string[] = [];
      for (const p of pages) {
        // The article's own text: from the prose to the end of the article (the pager included).
        const article = (p.html.split('class="docs-prose"')[1] ?? "").split("</article>")[0]!;
        for (const m of article.matchAll(/<a href="([^"#]*\/docs\/[^"#]+\/)(#[^"]*)?"/g)) {
          const target = m[1]!;
          if (!ids.has(target)) {
            missing.push(`${p.path} → ${target} (no page)`);
            continue;
          }
          const anchor = m[2] ? decodeURIComponent(m[2].slice(1)) : "";
          if (anchor && !ids.get(target)!.has(anchor))
            missing.push(`${p.path} → ${target}#${anchor}`);
        }
      }
      // The product's own links that land on no heading at 0.7.0 (night D report, for the
      // product): kept as the product wrote them.
      expect(missing.filter((m) => !KNOWN_PRODUCT_ANCHORS.has(m))).toEqual([]);
    });

    test(`${prefix}/docs/: on a phone the guides sit in a closed disclosure; on a desktop, open`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${prefix}/docs/topology/`);
      const summary = page.locator(".docs-nav summary");
      await expect(summary).toBeVisible();
      await expect(page.locator(".docs-nav a[aria-current='page']")).toBeHidden();
      await summary.click();
      await expect(page.locator(".docs-nav a[aria-current='page']")).toBeVisible();
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${prefix}/docs/topology/`);
      await expect(page.locator(".docs-nav a[aria-current='page']")).toBeVisible();
      await expect(page.locator(".docs-toc a").first()).toBeVisible();
      await expect(page.locator("header .header-nav a[aria-current='page']")).toHaveAttribute(
        "href",
        `${prefix}/docs/`,
      );
      // The article lays out its later blocks lazily (content-visibility): "On this page" still
      // lands a heading from the middle of the article at the top of the window (the last ones
      // sit in the page's final screen, which cannot scroll to the top).
      await page.emulateMedia({ reducedMotion: "reduce" });
      const links = page.locator(".docs-toc a");
      const mid = links.nth(Math.floor((await links.count()) / 2));
      const id = decodeURIComponent((await mid.getAttribute("href"))!.slice(1));
      await mid.click();
      await expect(page).toHaveURL(
        new RegExp(`#${encodeURIComponent(id).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
      );
      const top = await page.evaluate(
        (h) => document.getElementById(h)!.getBoundingClientRect().top,
        id,
      );
      expect(top).toBeGreaterThanOrEqual(-2);
      expect(top).toBeLessThan(200);
    });

    test(`${prefix}/docs/: a sample of ten articles has zero axe violations`, async ({ page }) => {
      test.setTimeout(240_000);
      await page.emulateMedia({ reducedMotion: "reduce" });
      const sample = [
        "overview",
        "first-run",
        "topology",
        "subnets",
        "racks",
        "activedirectory",
        "settings",
        "support",
        "i18n",
        "howto-first-scan",
      ];
      for (const [i, slug] of sample.entries()) {
        for (const width of i < 4 ? [390, 1440] : [1440]) {
          await page.setViewportSize({ width, height: 900 });
          await page.goto(`${prefix}/docs/${slug}/`);
          const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
            .analyze();
          expect(
            results.violations.map(
              (v) =>
                `${v.id}: ${v.nodes
                  .map((n) => n.target.join(" "))
                  .slice(0, 5)
                  .join(", ")}`,
            ),
            `${slug} at ${width}px`,
          ).toEqual([]);
        }
      }
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${prefix}/docs/`);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
          .analyze();
        expect(
          results.violations.map((v) => v.id),
          `index at ${width}px`,
        ).toEqual([]);
      }
    });
  });
}

test.describe("the stale-translation notice (W9)", () => {
  test.beforeEach(onceOnly);

  test("a page the product marks as changed after its translation shows the product's notice", async ({
    page,
  }) => {
    await page.goto(`${FLAGS}/he/docs/stale-fixture/`);
    await expect(page.locator(".docs-stale")).toHaveText(
      "ייתכן שהתרגום אינו מעודכן — המאמר האנגלי השתנה מאז",
    );
    await page.goto(`${FLAGS}/he/docs/overview/`);
    await expect(page.locator(".docs-stale")).toHaveCount(0);
  });
});

/**
 * The product's own links that land on no heading at v0.7.0 — in the product too (its headings
 * use the same ids): a "--" where its slugs have one "-", and Hebrew articles linking an English
 * heading's id. Kept as the product wrote them; listed in night D's report for the product.
 */
const KNOWN_PRODUCT_ANCHORS = new Set<string>([
  "/docs/devices/ → /docs/racks/#export--import",
  "/he/docs/devices/ → /he/docs/discovery/#נעלם--החלטה-במקום-אחד",
  "/he/docs/devices/ → /he/docs/racks/#export--import",
  "/he/docs/discovery/ → /he/docs/scans/#reconciliation",
  "/he/docs/integrations/ → /he/docs/monitoring/#monitoring-tools",
  "/he/docs/snmp/ → /he/docs/topology/#observed-neighbours",
  "/he/docs/topology/ → /he/docs/devices/#entity-families",
]);
