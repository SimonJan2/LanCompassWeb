import { expect, test } from "@playwright/test";
import { defaultLocale, localeCodes, locales, pages, pathFor, siteBase } from "./helpers";

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
