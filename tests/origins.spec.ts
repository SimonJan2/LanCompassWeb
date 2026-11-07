import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { expect, test } from "@playwright/test";
import { builtHtml, DEFAULT, FLAGS, FLAG_VALUES, siteBase, siteProject } from "./helpers";

/** The external links in the product's docs at v0.7.0 (frontend/src/content/docs/{en,he}/racks.md). */
const DOCS_LINKS = [
  "https://github.com/RackulaLives/Rackula",
  "https://github.com/netbox-community/devicetype-library",
];

/** W12 (D-PRIVACY-FACTS): /privacy/ names who delivers the site and links that company's own
 *  privacy policy — a reader's navigation, not a request the page makes. */
const PRIVACY_LINKS = ["https://www.cloudflare.com/privacypolicy/"];

/** Every page of a built site, as the path a browser asks for (W10: the crawl covers them all). */
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

/** The crawl runs in this many tests per project, each walking its share of the pages in one tab. */
const CHUNKS = 8;

test.describe("no third parties", () => {
  // W10: every page in the project's dist/ (pages, release notes, all 130 docs articles, the
  // 404s and the redirect pages), each scrolled to its end so lazy images and videos ask too.
  for (let chunk = 0; chunk < CHUNKS; chunk++) {
    test(`every built page, part ${chunk + 1} of ${CHUNKS}: every request stays on the site's origin`, async ({
      page,
    }) => {
      test.setTimeout(180_000);
      const all = builtPaths(siteProject().dist);
      expect(all.length).toBeGreaterThanOrEqual(166);
      const mine = all.filter((_, i) => i % CHUNKS === chunk);
      const origins = new Map<string, string>();
      let current = "";
      page.on("request", (r) => {
        const url = new URL(r.url());
        if (url.protocol.startsWith("http") && !origins.has(url.origin)) {
          origins.set(url.origin, `${current} → ${r.url()}`);
        }
      });
      for (const path of mine) {
        current = path;
        await page.goto(path, { waitUntil: "load" });
        // W7's redirect pages navigate on their own (meta refresh): the scroll may lose its page.
        await page
          .evaluate(async () => {
            const frame = () => new Promise((r) => requestAnimationFrame(r));
            for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) {
              scrollTo(0, y);
              await frame();
            }
            scrollTo(0, document.documentElement.scrollHeight);
            await frame();
          })
          .catch(() => undefined);
        await page.waitForLoadState("networkidle");
      }
      const foreign = [...origins].filter(([o]) => o !== siteBase()).map(([, first]) => first);
      expect(foreign).toEqual([]);
      expect(await page.context().cookies()).toEqual([]);
    });
  }

  test("the built stylesheets and scripts name no other origin", () => {
    // What a page's CSS or JavaScript could fetch on its own (fonts, @import, fetch()).
    const dir = join(process.cwd(), siteProject().dist, "_astro");
    const offenders: string[] = [];
    for (const name of readdirSync(dir).filter((n) => /\.(css|js)$/.test(n))) {
      const text = readFileSync(join(dir, name), "utf8");
      for (const m of text.matchAll(
        /(?:url\(\s*["']?|@import\s+["']|fetch\(\s*["'`])((?:https?:)?\/\/[^"')`\s]+)/g,
      )) {
        offenders.push(`${name}: ${m[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("built HTML has no inline style or script: the CSP (no 'unsafe-inline') would block it", () => {
    // `astro preview` sends no CSP, so the browser tests cannot see a violation; nginx can
    // (tests/container.spec.ts). This holds the rule in every build: no style attribute, no
    // <style> element, and no <script> without src except the JSON-LD data block.
    const { theme, dist } = siteProject();
    const dirs = theme === "light" ? ["dist-test", "dist-test-flags"] : [dist];
    for (const dir of dirs) {
      const offenders: string[] = [];
      for (const { file, html } of builtHtml(dir)) {
        const body = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "");
        for (const m of body.matchAll(/<[a-zA-Z][^>]*\sstyle=["'][^"']*["']/g)) {
          offenders.push(`${file}: ${m[0].slice(0, 80)}`);
        }
        for (const m of body.matchAll(/<style[\s>]|<script(?![^>]*\ssrc=)[^>]*>/g)) {
          offenders.push(`${file}: ${m[0].slice(0, 80)}`);
        }
      }
      expect(offenders, dir).toEqual([]);
    }
  });

  test("built HTML references no external origin except configured PUBLIC_* links", () => {
    const attr = /\s(?:src|href|srcset|poster|action|content)=["']([^"']+)["']/g;
    const { theme, dist } = siteProject();
    const checks =
      theme === "light"
        ? [
            { dir: "dist-test", site: DEFAULT, allowed: [] as string[] },
            {
              dir: "dist-test-flags",
              site: FLAGS,
              allowed: [FLAG_VALUES.docs, FLAG_VALUES.form],
            },
          ]
        : [{ dir: dist, site: siteBase(), allowed: [FLAG_VALUES.form] }];
    for (const { dir, site, allowed } of checks) {
      const offenders: string[] = [];
      for (const { file, html } of builtHtml(dir)) {
        // JSON-LD names schema.org as a vocabulary; it is never fetched.
        const body = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "");
        for (const match of body.matchAll(attr)) {
          for (const value of match[1]!.split(/,\s*/)) {
            const url = value.trim().split(/\s+/)[0]!;
            if (!/^(https?:)?\/\//.test(url)) continue;
            if (url.startsWith(`${site}/`) || allowed.includes(url)) continue;
            // W9: the product's docs keep their own https:// links (a reader's navigation, not
            // a request the page makes): exactly these two, on the racks article only.
            if (/\/docs\/racks\/index\.html$/.test(file) && DOCS_LINKS.includes(url)) continue;
            if (/\/privacy\/index\.html$/.test(file) && PRIVACY_LINKS.includes(url)) continue;
            offenders.push(`${file}: ${url}`);
          }
        }
      }
      expect(offenders, dir).toEqual([]);
    }
  });
});
