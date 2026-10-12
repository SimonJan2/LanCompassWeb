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
