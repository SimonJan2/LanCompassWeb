import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { expect, test } from "@playwright/test";
import {
  builtHtml,
  defaultLocale,
  localeCodes,
  locales,
  pages,
  pathFor,
  sectionPages,
  siteBase,
  siteProject,
} from "./helpers";

test.describe("routes and locales", () => {
  for (const p of pages) {
    test(`${p.path} returns 200 with lang, dir, canonical and hreflang`, async ({ page }) => {
      const response = await page.goto(p.path);
      expect(response?.status()).toBe(200);
      const html = page.locator("html");
      await expect(html).toHaveAttribute("lang", p.lang);
      await expect(html).toHaveAttribute("dir", p.dir);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        `${siteBase()}${p.path}`,
      );
      for (const code of localeCodes) {
        await expect(
          page.locator(`link[rel="alternate"][hreflang="${locales[code].htmlLang}"]`),
        ).toHaveAttribute("href", `${siteBase()}${pathFor(code, p.page)}`);
      }
      await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
        "href",
        `${siteBase()}${pathFor(defaultLocale, p.page)}`,
      );
      await expect(page.locator("h1")).toHaveCount(1);
      expect(await page.title()).not.toBe("");
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.{40,}/);
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        "content",
        /\/og\/\w+\/[\w-]+\.png$/,
      );
    });

    test(`${p.path} language switcher lands on the counterpart page`, async ({ page }) => {
      await page.goto(p.path);
      for (const code of localeCodes) {
        const link = page.locator(`footer [data-locale-link="${code}"]`);
        await expect(link).toHaveAttribute("href", pathFor(code, p.page));
      }
      const other = localeCodes.find((c) => c !== p.locale)!;
      await page.locator(`footer [data-locale-link="${other}"]`).click();
      await expect(page).toHaveURL(`${siteBase()}${pathFor(other, p.page)}`);
      await expect(page.locator("html")).toHaveAttribute("lang", locales[other].htmlLang);
    });
  }

  test("unknown URLs get the on-brand 404, and each locale has its own 404 page", async ({
    page,
  }) => {
    const response = await page.goto("/no-such-page/");
    expect(response?.status()).toBe(404);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    for (const code of localeCodes) {
      // Static hosts serve the nearest 404.html: /404.html and /<locale>/404.html.
      await page.goto(code === defaultLocale ? "/404.html" : `/${code}/404.html`);
      await expect(page.locator("html")).toHaveAttribute("lang", locales[code].htmlLang);
      await expect(page.locator("html")).toHaveAttribute("dir", locales[code].dir);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
      await expect(page.locator("main a").first()).toHaveAttribute("href", pathFor(code, "home"));
    }
  });

  test("W7: every page's header has Pilot and the Start-a-pilot button; every CTA goes to #apply", async ({
    page,
  }) => {
    const label = { en: ["Pilot", "Start a pilot"], he: ["פיילוט", "התחלת פיילוט"] };
    for (const p of pages) {
      await page.goto(p.path);
      const apply = `${pathFor(p.locale, "pilot")}#apply`;
      const [nav, cta] = label[p.locale];
      await expect(page.locator(".header-nav a").nth(2), p.path).toHaveText(nav!);
      await expect(page.locator(".header-nav a").nth(2)).toHaveAttribute(
        "href",
        pathFor(p.locale, "pilot"),
      );
      await expect(page.locator("header .header-cta")).toHaveText(cta!);
      await expect(page.locator("header .header-cta")).toHaveAttribute("href", apply);
      await expect(page.locator("dialog[data-menu-sheet] .sheet-cta")).toHaveAttribute(
        "href",
        apply,
      );
      // Every call to action and every link to a pilot application lands on the form.
      const pilotLinks = await page
        .locator('a[href*="/pilot/"]:not([data-locale-link])')
        .evaluateAll((els) => els.map((a) => a.getAttribute("href")));
      for (const href of pilotLinks) {
        expect([pathFor(p.locale, "pilot"), apply], `${p.path}: ${href}`).toContain(href);
      }
      await expect(page.locator('a[href*="design-partners"]')).toHaveCount(0);
      const footer = await page.locator("footer nav a").allTextContents();
      expect(footer.join("|")).not.toMatch(/Design partners|שותפי פיתוח/);
    }
    for (const [path, locale] of [
      ["/", "en"],
      ["/he/", "he"],
      ["/product/", "en"],
      ["/he/product/", "he"],
      ["/404.html", "en"],
      ["/he/404.html", "he"],
    ] as const) {
      await page.goto(path);
      const ctas = page.locator(`main a.btn[href="${pathFor(locale, "pilot")}#apply"]`);
      expect(await ctas.count(), path).toBeGreaterThanOrEqual(1);
      await expect(ctas.first()).toHaveText(label[locale][1]!);
    }
  });

  for (const s of sectionPages) {
    test(`W8: ${s.path} has lang, dir, canonical, hreflang to its twin and a switcher to it`, async ({
      page,
    }) => {
      const response = await page.goto(s.path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", s.lang);
      await expect(page.locator("html")).toHaveAttribute("dir", s.dir);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        `${siteBase()}${s.path}`,
      );
      for (const code of localeCodes) {
        await expect(
          page.locator(`link[rel="alternate"][hreflang="${locales[code].htmlLang}"]`),
        ).toHaveAttribute("href", `${siteBase()}${s.twins[code]}`);
        await expect(page.locator(`footer [data-locale-link="${code}"]`)).toHaveAttribute(
          "href",
          s.twins[code],
        );
      }
      await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
        "href",
        `${siteBase()}${s.twins[defaultLocale]}`,
      );
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.{40,}/);
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        "content",
        `${siteBase()}/og/${s.locale}/changelog.png`,
      );
    });
  }

  test("W8: every page's footer links the release notes; the sitemap lists them", async ({
    page,
    request,
  }) => {
    const label = { en: "Release notes", he: "הערות גרסה" };
    for (const p of [...pages, ...sectionPages]) {
      await page.goto(p.path);
      const link = page.locator("footer nav a", { hasText: label[p.locale] });
      await expect(link, p.path).toHaveCount(1);
      await expect(link).toHaveAttribute(
        "href",
        p.locale === "en" ? "/changelog/" : "/he/changelog/",
      );
    }
    const sitemap = await (await request.get("/sitemap-0.xml")).text();
    for (const s of sectionPages) expect(sitemap, s.path).toContain(`${siteBase()}${s.path}<`);
    expect((await request.get("/og/en/changelog.png")).status()).toBe(200);
    expect((await request.get("/og/he/changelog.png")).status()).toBe(200);
  });

  test("W9: Docs in every page's header and footer, both locales; the docs in the sitemap", async ({
    page,
    request,
  }) => {
    const label = { en: "Docs", he: "תיעוד" };
    for (const p of [...pages, ...sectionPages]) {
      await page.goto(p.path);
      const docs = p.locale === "en" ? "/docs/" : "/he/docs/";
      const nav = page.locator(".header-nav a").nth(3);
      await expect(nav, p.path).toHaveText(label[p.locale]);
      await expect(nav).toHaveAttribute("href", docs);
      await expect(page.locator(`footer nav a[href="${docs}"]`), p.path).toHaveText(
        label[p.locale],
      );
    }
    const sitemap = await (await request.get("/sitemap-0.xml")).text();
    for (const path of ["/docs/", "/he/docs/", "/docs/topology/", "/he/docs/first-run/"]) {
      expect(sitemap, path).toContain(`${siteBase()}${path}<`);
    }
    expect((sitemap.match(/\/docs\/[a-z0-9-]+\/</g) ?? []).length).toBe(130);
    for (const path of ["/docs/", "/he/docs/topology/"]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        "content",
        `${siteBase()}/og/${path.startsWith("/he/") ? "he" : "en"}/docs.png`,
      );
    }
    expect((await request.get("/og/he/docs.png")).status()).toBe(200);
  });

  test("W7: /design-partners/ is a redirect page to /pilot/, and not in the sitemap", async ({
    page,
    request,
  }) => {
    for (const locale of localeCodes) {
      const old = locale === defaultLocale ? "/design-partners/" : `/${locale}/design-partners/`;
      const html = await (await request.get(old)).text();
      const target = pathFor(locale, "pilot");
      expect(html).toContain(`<meta http-equiv="refresh" content="0; url=${target}">`);
      expect(html).toContain(`<link rel="canonical" href="${siteBase()}${target}">`);
      expect(html).toContain(`<a href="${target}">`);
      expect(html).toContain('<meta name="robots" content="noindex">');
      await page.goto(old);
      await expect(page).toHaveURL(`${siteBase()}${target}`);
    }
    const sitemap = await (await request.get("/sitemap-0.xml")).text();
    expect(sitemap).not.toContain("design-partners");
    expect(sitemap).toContain(`${siteBase()}/pilot/`);
    expect(sitemap).toContain(`${siteBase()}/he/licensing/`);
  });

  test("W10: every page's hreflang pair is reciprocal with x-default; the sitemap lists each public page once, with its alternates", () => {
    const root = join(process.cwd(), siteProject().dist);
    const base = siteBase();
    /** Each public page (not the 404s, not W7's redirect pages): its URL and its alternates. */
    const alternates = new Map<string, Record<string, string>>();
    for (const { file, html } of builtHtml(root)) {
      if (/\/404\.html$/.test(file) || html.includes('<meta http-equiv="refresh"')) continue;
      const url = `${base}/${relative(root, file).replace(/index\.html$/, "")}`;
      const links = Object.fromEntries(
        [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => [
          m[1]!,
          m[2]!,
        ]),
      );
      alternates.set(url, links);
    }
    expect(alternates.size).toBe(162);
    const hreflangs = [...localeCodes.map((c) => locales[c].htmlLang), "x-default"].sort();
    for (const [url, links] of alternates) {
      expect(Object.keys(links).sort(), url).toEqual(hreflangs);
      expect(links["x-default"], url).toBe(links[locales[defaultLocale].htmlLang]);
      const own = localeCodes.find((c) => c !== defaultLocale && url.startsWith(`${base}/${c}/`));
      expect(links[locales[own ?? defaultLocale].htmlLang], `${url} names itself`).toBe(url);
      for (const code of localeCodes) {
        const twin = links[locales[code].htmlLang]!;
        expect(alternates.get(twin), `${url} → ${twin} exists and points back`).toEqual(links);
      }
    }
    const sitemap = readFileSync(join(root, "sitemap-0.xml"), "utf8");
    const entries = [...sitemap.matchAll(/<url><loc>([^<]+)<\/loc>([\s\S]*?)<\/url>/g)];
    const locs = entries.map((e) => e[1]!);
    expect(new Set(locs).size, "each URL once").toBe(locs.length);
    expect([...locs].sort()).toEqual([...alternates.keys()].sort());
    for (const [, loc, rest] of entries) {
      const listed = Object.fromEntries(
        [...rest!.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1]!, m[2]!]),
      );
      for (const code of localeCodes) {
        const lang = locales[code].htmlLang;
        expect(listed[lang], `${loc} ${lang}`).toBe(alternates.get(loc!)![lang]);
      }
    }
  });

  test("sitemap, robots, manifest, icons and OG images are built", async ({ request }) => {
    for (const path of [
      "/sitemap-index.xml",
      "/robots.txt",
      "/site.webmanifest",
      "/favicon.svg",
      "/apple-touch-icon.png",
    ]) {
      expect((await request.get(path)).status(), path).toBe(200);
    }
    for (const p of pages) {
      const og = await request.get(`/og/${p.locale}/${p.page}.png`);
      expect(og.status()).toBe(200);
      expect(og.headers()["content-type"]).toContain("image/png");
    }
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain(`Sitemap: ${siteBase()}/sitemap-index.xml`);
  });
});
