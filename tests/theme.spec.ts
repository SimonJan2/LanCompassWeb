import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { rendersDark, siteProject } from "./helpers";

/**
 * PUBLIC_SITE_THEME, chosen at build time: <html data-theme>, color-scheme, theme-color,
 * the manifest, auto's OS-following palette and screenshots, the palette module, and the
 * build failing on an invalid value.
 */

const PAPER = "#F4F1EA";
const NIGHT = "#171C3C";

test.describe("site theme", () => {
  test("<html data-theme> matches the build", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", siteProject().theme);
    await page.goto("/he/product/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", siteProject().theme);
  });

  test("color-scheme and theme-color are correct for the theme", async ({ page }) => {
    const { theme } = siteProject();
    await page.goto("/");
    const scheme = page.locator('meta[name="color-scheme"]');
    const colours = page.locator('meta[name="theme-color"]');
    const computed = await page.evaluate(
      () => getComputedStyle(document.documentElement).colorScheme,
    );
    if (theme === "light") {
      await expect(scheme).toHaveAttribute("content", "light");
      await expect(colours).toHaveCount(1);
      await expect(colours).toHaveAttribute("content", PAPER);
      expect(computed).toBe("light");
    } else if (theme === "dark") {
      await expect(scheme).toHaveAttribute("content", "dark");
      await expect(colours).toHaveCount(1);
      await expect(colours).toHaveAttribute("content", NIGHT);
      expect(computed).toBe("dark");
    } else {
      await expect(scheme).toHaveAttribute("content", "light dark");
      await expect(colours).toHaveCount(2);
      await expect(colours.nth(0)).toHaveAttribute("media", "(prefers-color-scheme: light)");
      await expect(colours.nth(0)).toHaveAttribute("content", PAPER);
      await expect(colours.nth(1)).toHaveAttribute("media", "(prefers-color-scheme: dark)");
      await expect(colours.nth(1)).toHaveAttribute("content", NIGHT);
      expect(computed).toBe(rendersDark() ? "dark" : "light dark");
    }
  });

  test("the page background follows the rendered palette", async ({ page }) => {
    await page.goto("/");
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe(rendersDark() ? "rgb(23, 28, 60)" : "rgb(244, 241, 234)");
  });

  test("the manifest's colours follow the theme", async ({ request }) => {
    const manifest = await (await request.get("/site.webmanifest")).json();
    const expected = siteProject().theme === "dark" ? NIGHT : PAPER;
    expect(manifest.theme_color).toBe(expected);
    expect(manifest.background_color).toBe(expected);
  });

  test("screenshots come from the theme's capture set, and only the matching one loads", async ({
    page,
  }) => {
    const requested: string[] = [];
    page.on("request", (r) => {
      if (/\/_astro\/[\w-]+\.[\w-]+\.(avif|webp|png)$/.test(new URL(r.url()).pathname))
        requested.push(new URL(r.url()).pathname);
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/product/");
    const shot = page.locator('.shot[data-screen="ipam-tree"]');
    await shot.scrollIntoViewIfNeeded();
    await expect(shot.locator("img")).toHaveJSProperty("complete", true);
    const current = await shot.locator("img").evaluate((img: HTMLImageElement) => img.currentSrc);
    // One capture of this screen was fetched, in the rendered scheme.
    const mine = requested.filter((p) => p.includes("/ipam-tree."));
    expect(mine.length, mine.join(", ")).toBe(1);
    expect(new URL(current).pathname).toBe(mine[0]);
    const html = await page.content();
    const sources = shot.locator('source[media="(prefers-color-scheme: dark)"]');
    if (siteProject().theme === "auto") expect(await sources.count()).toBeGreaterThan(0);
    else expect(await sources.count()).toBe(0);
    expect(html).not.toContain("grid-paper");
  });

  test("the light and dark captures differ, and the rendered one matches the scheme", async ({
    page,
  }) => {
    test.skip(siteProject().theme !== "auto", "auto builds only");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/product/");
    const shot = page.locator('.shot[data-screen="ipam-tree"]');
    await shot.scrollIntoViewIfNeeded();
    await expect(shot.locator("img")).toHaveJSProperty("complete", true);
    const darkSrcset = (await shot
      .locator('source[media="(prefers-color-scheme: dark)"]')
      .getAttribute("srcset"))!;
    const current = await shot.locator("img").evaluate((img: HTMLImageElement) => img.currentSrc);
    const path = new URL(current).pathname;
    expect(darkSrcset.includes(path)).toBe(rendersDark());
  });

  test("src/lib/palette.ts repeats the tokens exactly", () => {
    test.skip(siteProject().theme !== "light", "a source check: light project only");
    const css = readFileSync(join(process.cwd(), "src", "styles", "tokens.css"), "utf8");
    const ts = readFileSync(join(process.cwd(), "src", "lib", "palette.ts"), "utf8");
    const token = (name: string) =>
      css.match(new RegExp(`^\\s*${name}:\\s*(#[0-9a-f]{6});`, "m"))?.[1] ?? `${name}?`;
    const pairs = [...ts.matchAll(/:\s*"(#[0-9a-f]{6})",\s*\/\/\s*(--lc-[\w-]+)/g)];
    expect(pairs.length).toBeGreaterThan(20);
    for (const [, hex, name] of pairs) expect(hex, name).toBe(token(name!));
  });

  test("an invalid PUBLIC_SITE_THEME fails the build with a clear message", () => {
    test.skip(siteProject().theme !== "light", "runs once, in the light project");
    test.setTimeout(120_000);
    const result = spawnSync("npx", ["astro", "build"], {
      encoding: "utf8",
      env: {
        ...process.env,
        PUBLIC_SITE_THEME: "nighttime",
        ASTRO_OUT_DIR: "dist-test-invalid-theme",
      },
    });
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain(
      'PUBLIC_SITE_THEME must be one of light, dark, auto (got "nighttime")',
    );
  });
});
