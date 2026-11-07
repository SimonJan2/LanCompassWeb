import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { DEFAULT, FLAGS, FLAG_VALUES, FORM_SERVICE_MARKER, pathFor } from "./helpers";

/**
 * PUBLIC_DOCS_URL and PUBLIC_FORM_ENDPOINT switch features on. The "Source code" link and its
 * PUBLIC_GITHUB_URL flag are gone (DECISIONS.md D-GITHUB: the product is proprietary and its
 * repository private): the flags build still sets PUBLIC_GITHUB_URL, and it renders nothing.
 */
test.describe("feature flags", () => {
  test("with docs and form endpoint empty: Docs is the site's own, forms fall back to mailto:", async ({
    page,
  }) => {
    for (const locale of ["en", "he"] as const) {
      await page.goto(`${DEFAULT}${pathFor(locale, "home")}`);
      await expect(page.locator('[data-flag="docs"]')).toHaveCount(0);
      // W9: without PUBLIC_DOCS_URL the header, the mobile menu and the footer link /docs/.
      const docs = locale === "en" ? "/docs/" : "/he/docs/";
      await expect(page.locator("header .header-nav a").nth(3)).toHaveAttribute("href", docs);
      await expect(page.locator(`dialog[data-menu-sheet] a[href="${docs}"]`)).toHaveCount(1);
      await expect(page.locator(`footer nav a[href="${docs}"]`)).toHaveCount(1);
      for (const which of ["pilot", "contact"] as const) {
        await page.goto(`${DEFAULT}${pathFor(locale, which)}`);
        await expect(page.locator("form[data-lc-form]")).toHaveCount(0);
        const mailto = page.locator("[data-form-fallback] a[data-mailto]");
        await expect(mailto).toHaveAttribute(
          "href",
          new RegExp(`^mailto:${FLAG_VALUES.email}\\?subject=.+&body=.+`),
        );
      }
    }
  });

  test("with them set: Docs in the nav, forms post to the endpoint", async ({ page }) => {
    for (const locale of ["en", "he"] as const) {
      await page.goto(`${FLAGS}${pathFor(locale, "home")}`);
      await expect(page.locator(`header .header-nav [data-flag="docs"]`)).toHaveAttribute(
        "href",
        FLAG_VALUES.docs,
      );
      // W9: an external docs host, when set, still wins over the site's /docs/.
      await expect(page.locator(`footer nav [data-flag="docs"]`)).toHaveAttribute(
        "href",
        FLAG_VALUES.docs,
      );
      await expect(page.locator('header a[href$="/docs/"]')).toHaveCount(0);
      for (const which of ["pilot", "contact"] as const) {
        await page.goto(`${FLAGS}${pathFor(locale, which)}`);
        const form = page.locator("form[data-lc-form]");
        await expect(form).toHaveAttribute("action", FLAG_VALUES.form);
        await expect(form).toHaveAttribute("method", "post");
        await expect(page.locator("[data-form-fallback]")).toHaveCount(0);
      }
    }
  });

  test("no source-code link and no github flag, even with PUBLIC_GITHUB_URL set", async ({
    page,
  }) => {
    for (const base of [DEFAULT, FLAGS]) {
      for (const locale of ["en", "he"] as const) {
        await page.goto(`${base}${pathFor(locale, "home")}`);
        await expect(page.locator('[data-flag="github"]')).toHaveCount(0);
        await expect(page.locator('a[href*="github.com"]')).toHaveCount(0);
        await expect(page.locator("footer")).not.toContainText(/source code|קוד מקור/i);
      }
    }
  });

  test("the fingerprint block shows the release key (W6: fingerprints.json has it)", async ({
    page,
  }) => {
    for (const base of [DEFAULT, FLAGS]) {
      for (const locale of ["en", "he"] as const) {
        await page.goto(`${base}${pathFor(locale, "security")}`);
        await expect(page.locator("#verification")).toHaveCount(1);
        await expect(page.locator('#verification [data-fingerprint="release"]')).toHaveText(
          /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/,
        );
      }
    }
  });

  test("without a contact address, /security#disclosure shows the TODO(operator) marker", async ({
    page,
  }) => {
    for (const locale of ["en", "he"] as const) {
      await page.goto(`${FLAGS}${pathFor(locale, "security")}`);
      await expect(page.locator("#disclosure ~ p .todo-operator").first()).toContainText(
        "TODO(operator): set PUBLIC_CONTACT_EMAIL",
      );
    }
  });

  // W12 (D-CONTACT): the light test build has PUBLIC_CONTACT_EMAIL and PUBLIC_SITE_URL set, as
  // the operator build does: the address on the three pages that name it, every mailto: to it,
  // no marker, and security.txt's RFC 9116 fields.
  test("with a contact address: the address on /contact, /security#disclosure and /accessibility, every mailto: to it", async ({
    page,
    request,
  }) => {
    for (const locale of ["en", "he"] as const) {
      for (const which of ["contact", "security", "accessibility", "privacy", "pilot"] as const) {
        await page.goto(`${DEFAULT}${pathFor(locale, which)}`);
        if (which !== "pilot" && which !== "privacy") {
          await expect(page.locator("main a.contact-email").first()).toHaveText(FLAG_VALUES.email);
        }
        const mailtos = await page
          .locator('a[href^="mailto:"]')
          .evaluateAll((els) => els.map((a) => a.getAttribute("href") ?? ""));
        expect(mailtos.length, `${locale} ${which}`).toBeGreaterThan(0);
        for (const href of mailtos)
          expect(href).toMatch(new RegExp(`^mailto:${FLAG_VALUES.email}(\\?|$)`));
        expect(await page.evaluate(() => document.body.innerText)).not.toContain("TODO(operator)");
      }
      await page.goto(`${DEFAULT}${pathFor(locale, "security")}`);
      await expect(page.locator("h2#disclosure ~ p a.contact-email").first()).toHaveText(
        FLAG_VALUES.email,
      );
    }
    const txt = await (await request.get(`${DEFAULT}/.well-known/security.txt`)).text();
    for (const line of [
      `Contact: mailto:${FLAG_VALUES.email}`,
      "Preferred-Languages: en, he",
      `Canonical: ${DEFAULT}/.well-known/security.txt`,
      `Policy: ${DEFAULT}/security/#disclosure`,
    ])
      expect(txt).toContain(`${line}\n`);
    expect(txt).toMatch(/^Expires: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/m);
  });

  // W12 (D-LICENCE-PATH): /privacy/ describes email only. A build with PUBLIC_FORM_ENDPOINT set
  // (the flags build) shows one marker there until the operator names the form service; a build
  // without it (the default) shows none.
  test("with PUBLIC_FORM_ENDPOINT set, /privacy/ shows its one form-service marker; without it, none", async ({
    page,
  }) => {
    for (const locale of ["en", "he"] as const) {
      // The flags build has no contact address either: its rights section shows that marker too.
      await page.goto(`${FLAGS}${pathFor(locale, "privacy")}`);
      const markers = page.locator("main .todo-operator");
      await expect(markers.filter({ hasText: FORM_SERVICE_MARKER })).toHaveCount(1);
      await expect(markers.filter({ hasNotText: FORM_SERVICE_MARKER })).toHaveText([
        "TODO(operator): set PUBLIC_CONTACT_EMAIL",
      ]);
      await page.goto(`${DEFAULT}${pathFor(locale, "privacy")}`);
      await expect(page.locator("main .todo-operator")).toHaveCount(0);
    }
  });

  // W12 (D-INDEXING): the flags build is a preview (PUBLIC_SITE_INDEXING=false); the default
  // build indexes, as before.
  test("PUBLIC_SITE_INDEXING=false: robots.txt allows crawling and lists no sitemap; _headers says noindex", async ({
    request,
  }) => {
    const preview = await (await request.get(`${FLAGS}/robots.txt`)).text();
    expect(preview).not.toMatch(/^Sitemap:/m);
    expect(preview).not.toMatch(/^Disallow:/m);
    expect(preview).toMatch(/^User-agent: \*\nAllow: \/$/m);
    expect(preview).toContain("X-Robots-Tag: noindex");
    const indexed = await (await request.get(`${DEFAULT}/robots.txt`)).text();
    expect(indexed).toContain(`Sitemap: ${DEFAULT}/sitemap-index.xml\n`);
    expect(indexed).not.toContain("noindex");
    // The /* block of the built _headers file (Netlify, Cloudflare Pages, and nginx through
    // docker/render-nginx-headers.mjs): every response gets it.
    const block = (dist: string) => {
      const text = readFileSync(join(process.cwd(), dist, "_headers"), "utf8");
      return text.slice(text.indexOf("/*\n"), text.indexOf("\n\n", text.indexOf("/*\n")));
    };
    expect(block("dist-test-flags")).toContain("\n  X-Robots-Tag: noindex");
    expect(block("dist-test")).not.toContain("X-Robots-Tag");
    expect(readFileSync(join(process.cwd(), "dist-test", "_headers"), "utf8")).not.toContain(
      "X-Robots-Tag",
    );
  });

  test("an invalid PUBLIC_SITE_INDEXING fails the build with a clear message", () => {
    test.setTimeout(120_000);
    const result = spawnSync("npx", ["astro", "build"], {
      encoding: "utf8",
      env: {
        ...process.env,
        PUBLIC_SITE_INDEXING: "maybe",
        ASTRO_OUT_DIR: "dist-test-invalid-indexing",
      },
    });
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain(
      'PUBLIC_SITE_INDEXING must be true or false (got "maybe")',
    );
  });

  test("the indexing flag changes no HTML: only robots.txt and the _headers hook read it", () => {
    const readers: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(astro|ts|mjs|mdx|md)$/.test(name)) {
          const text = readFileSync(full, "utf8");
          if (/PUBLIC_SITE_INDEXING|site\.indexing|siteIndexing|readIndexing\(/.test(text))
            readers.push(full.slice(process.cwd().length + 1));
        }
      }
    };
    walk(join(process.cwd(), "src"));
    const config = readFileSync(join(process.cwd(), "astro.config.mjs"), "utf8");
    expect(readers.sort()).toEqual([
      "src/config/site.ts",
      "src/env.d.ts",
      "src/lib/indexing.ts",
      "src/pages/robots.txt.ts",
    ]);
    // In astro.config.mjs only the _headers hook uses it.
    expect(config.match(/siteIndexing/g)).toHaveLength(2);
  });
});
