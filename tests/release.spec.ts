import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { builtHtml, siteProject } from "./helpers";

/**
 * W10: one release everywhere. Every place the site names the current release shows the newest
 * entry of src/content/releases.json: the home's datasheet Release row and What's new eyebrow,
 * the JSON-LD softwareVersion, /verify/, the changelog index ("Latest") and its feeds, the
 * capture manifest of the product screens (media-library/screens/CAPTURED.json) and the version
 * line of every docs page. A release moves all of them through releases.json and the two syncs
 * (README "Each release"); this fails when one of them stays behind. Release facts do not depend
 * on the theme, so only the light project runs it (playwright.config.ts `themed`).
 */
const root = process.cwd();

interface Release {
  version: string;
  date: string;
  tag: string | null;
  bundle?: { file: string; sha256: string };
  sbom?: { file: string };
}
const releases = (
  JSON.parse(readFileSync(join(root, "src", "content", "releases.json"), "utf8")) as {
    releases: Release[];
  }
).releases;
const latest = releases[0]!;
const captured = JSON.parse(
  readFileSync(join(root, "media-library", "screens", "CAPTURED.json"), "utf8"),
) as { product_version: string; bundle_sha256: string };

const semver = (v: string) => v.split(".").map(Number) as [number, number, number];
const newer = (a: string, b: string) => {
  const [x, y] = [semver(a), semver(b)];
  return x[0] !== y[0] ? x[0] > y[0] : x[1] !== y[1] ? x[1] > y[1] : x[2] > y[2];
};

test.describe("one release everywhere (W10)", () => {
  test("releases.json lists the newest release first, newest by version and by date", () => {
    for (let i = 1; i < releases.length; i++) {
      expect(newer(releases[i - 1]!.version, releases[i]!.version), releases[i]!.version).toBe(
        true,
      );
      expect(releases[i - 1]!.date >= releases[i]!.date, releases[i]!.version).toBe(true);
    }
    expect(latest.tag).toBe(`v${latest.version}`);
  });

  for (const locale of ["en", "he"] as const) {
    const prefix = locale === "en" ? "" : "/he";

    test(`${locale}: the home's Release row, What's new and the JSON-LD name the newest release`, async ({
      page,
    }) => {
      await page.goto(`${prefix}/`);
      const row = page.locator(".datasheet a[data-release]");
      await expect(row).toHaveAttribute("data-release", latest.version);
      await expect(row).toContainText(latest.version);
      await expect(row.locator("time")).toHaveAttribute("datetime", latest.date);
      const eyebrow = page.locator("#whats-new .eyebrow");
      await expect(eyebrow).toContainText(latest.version);
      await expect(eyebrow.locator("time")).toHaveAttribute("datetime", latest.date);
      const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
      const versions = blocks
        .flatMap((b) => {
          const ld = JSON.parse(b) as unknown;
          return (Array.isArray(ld) ? ld : [ld]) as {
            "@type"?: string;
            softwareVersion?: string;
          }[];
        })
        .filter((x) => x["@type"] === "SoftwareApplication")
        .map((x) => x.softwareVersion);
      expect(versions).toEqual([latest.version]);
    });

    test(`${locale}: /verify/ shows the newest release and its files`, async ({ page }) => {
      await page.goto(`${prefix}/verify/`);
      await expect(page.locator("#release-title + p[data-release]")).toHaveAttribute(
        "data-release",
        latest.version,
      );
      const text = await page.evaluate(() => document.body.innerText);
      expect(text).toContain(latest.bundle!.file);
      expect(text).toContain(latest.bundle!.sha256);
      expect(text).toContain(latest.sbom!.file);
      for (const old of releases.slice(1)) {
        expect(text, old.version).not.toContain(`lancompass-${old.version}-offline`);
      }
    });

    test(`${locale}: the changelog index marks the newest release Latest, first; the feed starts with it`, async ({
      page,
      request,
    }) => {
      await page.goto(`${prefix}/changelog/`);
      const items = page.locator(".cl-item");
      await expect(items).toHaveCount(releases.length);
      await expect(items.first()).toHaveAttribute("data-release", latest.version);
      await expect(page.locator(".cl-latest")).toHaveCount(1);
      await expect(items.first().locator(".cl-latest")).toHaveCount(1);
      const feed = await (await request.get(`${prefix}/changelog/feed.xml`)).text();
      const first = feed.split("<entry>")[1] ?? "";
      expect(first).toContain(`/changelog/${latest.version}/`);
      const release = await page.goto(`${prefix}/changelog/${latest.version}/`);
      expect(release?.status()).toBe(200);
    });
  }

  test("the product screens were captured from the newest release's bundle", () => {
    expect(captured.product_version).toBe(latest.version);
    expect(captured.bundle_sha256).toBe(latest.bundle!.sha256);
  });

  test("every docs page, both locales, carries the newest release's version line", () => {
    const { dist } = siteProject();
    const docs = builtHtml(join(root, dist)).filter(({ file }) => /\/docs\//.test(file));
    // 65 + 65 articles and the two indexes.
    expect(docs.length).toBe(132);
    for (const { file, html } of docs) {
      const line = html.match(/<p class="docs-version"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? "";
      expect(line.replace(/<[^>]+>/g, ""), file).toContain(`LanCompass ${latest.version}`);
    }
    // The synced articles' own front matter (scripts/sync-docs.mjs --version).
    for (const locale of ["en", "he"]) {
      const dir = join(root, "src", "content", "docs", locale);
      for (const name of readdirSync(dir).filter((n) => n.endsWith(".md"))) {
        const front = readFileSync(join(dir, name), "utf8").split("\n---")[0] ?? "";
        expect(front, `${locale}/${name}`).toMatch(
          new RegExp(`^version: "?${latest.version.replace(/\./g, "\\.")}"?$`, "m"),
        );
      }
    }
  });
});
