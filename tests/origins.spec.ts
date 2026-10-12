import { expect, test } from "@playwright/test";
import { builtHtml, DEFAULT, FLAGS, FLAG_VALUES, pages, siteBase, siteProject } from "./helpers";

test.describe("no third parties", () => {
  for (const p of pages) {
    test(`${p.path}: every request stays on the site's origin`, async ({ page }) => {
      const origins = new Set<string>();
      page.on("request", (r) => {
        const url = new URL(r.url());
        if (url.protocol.startsWith("http")) origins.add(url.origin);
      });
      await page.goto(p.path, { waitUntil: "networkidle" });
      await page.mouse.wheel(0, 20000);
      await page.waitForLoadState("networkidle");
      expect([...origins]).toEqual([siteBase()]);
      expect(await page.context().cookies()).toEqual([]);
    });
  }

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
              allowed: [FLAG_VALUES.docs, FLAG_VALUES.github, FLAG_VALUES.form],
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
            offenders.push(`${file}: ${url}`);
          }
        }
      }
      expect(offenders, dir).toEqual([]);
    }
  });
});
