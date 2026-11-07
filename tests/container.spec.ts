import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { docsSample, pages, sectionPages } from "./helpers";

/**
 * Runs only against the Docker image (nginx), where the security headers are
 * actually enforced: DOCKER_BASE_URL=http://localhost:8088 npx playwright test tests/container.spec.ts
 * `astro preview` sends no CSP, so the main suite cannot catch a violation.
 */
const base = process.env["DOCKER_BASE_URL"];

test.describe("container: enforced CSP", () => {
  test.skip(!base, "set DOCKER_BASE_URL to run against the container");

  // W8: the release-note pages too; W9: a sample of the docs.
  for (const p of [...pages, ...sectionPages, ...docsSample]) {
    test(`${p.path}: no CSP violation or console error`, async ({ page }) => {
      const problems: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error") problems.push(m.text());
      });
      page.on("pageerror", (e) => problems.push(e.message));
      await page.addInitScript(() => {
        document.addEventListener("securitypolicyviolation", (e) =>
          console.error(`CSP: ${e.violatedDirective} ${e.blockedURI}`),
        );
      });
      const response = await page.goto(`${base}${p.path}`, { waitUntil: "networkidle" });
      expect(response?.headers()["content-security-policy"]).toContain("default-src 'self'");
      await page.mouse.wheel(0, 20000);
      await page.waitForLoadState("networkidle");
      // The scripts ran (they are external files, allowed by script-src 'self').
      await expect(page.locator("[data-site-header]")).toHaveAttribute(
        "data-scrolled",
        /true|false/,
      );
      expect(problems).toEqual([]);
    });
  }

  test("W7: /design-partners/ answers 301 to /pilot/, in both locales", async ({ request }) => {
    for (const [from, to] of [
      ["/design-partners/", "/pilot/"],
      ["/design-partners", "/pilot/"],
      ["/he/design-partners/", "/he/pilot/"],
      ["/he/design-partners", "/he/pilot/"],
    ] as const) {
      const res = await request.get(`${base}${from}`, { maxRedirects: 0 });
      expect(res.status(), from).toBe(301);
      expect(res.headers()["location"], from).toBe(to);
      expect(res.headers()["x-content-type-options"], from).toBe("nosniff");
    }
    const pilot = await request.get(`${base}/pilot/`);
    expect(pilot.status()).toBe(200);
  });

  test("W8: both release-note feeds are served as Atom, under the security headers", async ({
    request,
  }) => {
    for (const path of ["/changelog/feed.xml", "/he/changelog/feed.xml"]) {
      const res = await request.get(`${base}${path}`);
      expect(res.status(), path).toBe(200);
      expect(res.headers()["content-type"], path).toBe("application/atom+xml; charset=utf-8");
      expect(res.headers()["x-content-type-options"], path).toBe("nosniff");
      expect(await res.text(), path).toContain('<feed xmlns="http://www.w3.org/2005/Atom"');
    }
  });

  test("W10: every header docs/headers.md lists, on a page, a docs page, /verify/, the SBOM, security.txt, a feed and an asset", async ({
    request,
  }) => {
    // The first table of docs/headers.md: | `Header` | `value` | why |.
    const md = readFileSync(join(process.cwd(), "docs", "headers.md"), "utf8");
    const documented = new Map(
      [...md.matchAll(/^\|\s*`([A-Za-z-]+)`\s*\|\s*`([^`]+)`\s*\|/gm)].map((m) => [
        m[1]!.toLowerCase(),
        m[2]!,
      ]),
    );
    expect([...documented.keys()]).toEqual([
      "content-security-policy",
      "strict-transport-security",
      "referrer-policy",
      "permissions-policy",
      "x-content-type-options",
      "x-frame-options",
      "cross-origin-opener-policy",
    ]);
    // The image's PUBLIC_FORM_ENDPOINT origin, when it was built with one.
    const form = process.env["EXPECT_FORM_ORIGIN"] ?? "";
    const csp = documented
      .get("content-security-policy")!
      .replace(" [form endpoint origin]", form ? ` ${form}` : "");
    const releases = JSON.parse(
      readFileSync(join(process.cwd(), "src", "content", "releases.json"), "utf8"),
    ) as { releases: { sbom?: { file: string } }[] };
    const home = await (await request.get(`${base}/`)).text();
    const asset = home.match(/\/_astro\/[^"]+\.css/)?.[0];
    expect(asset).toBeTruthy();
    const paths = [
      "/",
      "/docs/topology/",
      "/verify/",
      `/verify/${releases.releases[0]!.sbom!.file}`,
      "/changelog/feed.xml",
      asset!,
      ...(process.env["EXPECT_SECURITY_TXT"] === "1" ? ["/.well-known/security.txt"] : []),
    ];
    for (const path of paths) {
      // Behind a TLS proxy (X-Forwarded-Proto: https): every header, HSTS and upgrade included.
      const tls = await request.get(`${base}${path}`, {
        headers: { "X-Forwarded-Proto": "https" },
      });
      expect(tls.status(), path).toBe(200);
      for (const [name, value] of documented) {
        const want = name === "content-security-policy" ? csp : value;
        expect(tls.headers()[name], `${path} ${name} (https)`).toBe(want);
      }
      // Plain HTTP: no HSTS, and the CSP without upgrade-insecure-requests (nginx.conf maps).
      const plain = await request.get(`${base}${path}`);
      expect(plain.headers()["strict-transport-security"], `${path} (http)`).toBeUndefined();
      expect(plain.headers()["content-security-policy"], `${path} (http)`).toBe(
        csp.replace(/;\s*upgrade-insecure-requests$/, ""),
      );
      if (path === asset) {
        expect(plain.headers()["cache-control"]).toBe("public, max-age=31536000, immutable");
      }
    }
  });

  test("W10: canonical, hreflang, og:url, og:image, the feed's ids and security.txt use the image's site URL", async ({
    request,
  }) => {
    const site = process.env["EXPECT_SITE_URL"];
    test.skip(!site, "set EXPECT_SITE_URL to the PUBLIC_SITE_URL the image was built with");
    for (const path of [
      "/",
      "/he/",
      "/docs/topology/",
      "/he/docs/topology/",
      "/verify/",
      "/changelog/0.7.0/",
    ]) {
      const html = await (await request.get(`${base}${path}`)).text();
      expect(html, path).toContain(`<link rel="canonical" href="${site}${path}">`);
      expect(html, path).toContain(`<meta property="og:url" content="${site}${path}">`);
      expect(html, path).toMatch(
        new RegExp(`<meta property="og:image" content="${site}/og/(en|he)/[\\w-]+\\.png">`),
      );
      const alternates = [
        ...html.matchAll(/<link rel="alternate" hreflang="[^"]+" href="([^"]+)"/g),
      ];
      expect(alternates.length, path).toBe(3);
      for (const m of alternates)
        expect(m[1]!.startsWith(`${site}/`), `${path} ${m[1]}`).toBe(true);
    }
    const feed = await (await request.get(`${base}/changelog/feed.xml`)).text();
    expect(feed).toContain(`<id>${site}/changelog/0.7.0/</id>`);
    // W12: a preview image (EXPECT_NOINDEX=1) lists no sitemap; the sitemap itself still uses
    // the image's site URL.
    const robots = await (await request.get(`${base}/robots.txt`)).text();
    if (process.env["EXPECT_NOINDEX"] === "1") expect(robots).not.toMatch(/^Sitemap:/m);
    else expect(robots).toContain(`Sitemap: ${site}/sitemap-index.xml`);
    expect(await (await request.get(`${base}/sitemap-0.xml`)).text()).toContain(
      `<loc>${site}/</loc>`,
    );
    const txt = await request.get(`${base}/.well-known/security.txt`);
    if (txt.status() === 200) {
      const body = await txt.text();
      expect(body).toContain(`Canonical: ${site}/.well-known/security.txt`);
      expect(body).toContain(`Policy: ${site}/security/#disclosure`);
    }
  });

  test("W6: the SBOM is JSON and security.txt is UTF-8 text, both under the CSP", async ({
    request,
  }) => {
    const releases = JSON.parse(
      readFileSync(join(process.cwd(), "src", "content", "releases.json"), "utf8"),
    ) as { releases: { sbom?: { file: string; bytes: number } }[] };
    const sbom = releases.releases[0]!.sbom!;
    const res = await request.get(`${base}/verify/${sbom.file}`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/json; charset=utf-8");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    expect((await res.body()).length).toBe(sbom.bytes);
    // The image has a security.txt only when it was built with PUBLIC_CONTACT_EMAIL and
    // PUBLIC_SITE_URL (DECISIONS.md D-CONTACT); without them, 404.
    const txt = await request.get(`${base}/.well-known/security.txt`);
    if (process.env["EXPECT_SECURITY_TXT"] === "1") expect(txt.status()).toBe(200);
    if (txt.status() === 200) {
      expect(txt.headers()["content-type"]).toBe("text/plain; charset=utf-8");
      expect(txt.headers()["content-security-policy"]).toContain("default-src 'self'");
      expect(await txt.text()).toMatch(/^Contact: mailto:/);
    } else {
      expect(txt.status()).toBe(404);
    }
  });

  /** W12 (D-INDEXING): an image built with PUBLIC_SITE_INDEXING=false (EXPECT_NOINDEX=1) sends
   *  `X-Robots-Tag: noindex` on every response nginx makes — a page, a docs page, a stylesheet, an
   *  image, a video, a feed, robots.txt, the sitemap, a redirect and a 404 — and an indexed image
   *  sends none. */
  test("W12: X-Robots-Tag: noindex on every response of a preview image, on none otherwise", async ({
    request,
  }) => {
    const noindex = process.env["EXPECT_NOINDEX"] === "1";
    const home = await (await request.get(`${base}/`)).text();
    const asset = home.match(/\/_astro\/[^"]+\.css/)?.[0];
    expect(asset).toBeTruthy();
    const cases: [string, number][] = [
      ["/", 200],
      ["/he/", 200],
      ["/docs/topology/", 200],
      [asset!, 200],
      ["/media/survey/drift-review-queue.en.webp", 200],
      ["/media/survey/drift-review-queue.en.webm", 200],
      ["/og/en/home.png", 200],
      ["/changelog/feed.xml", 200],
      ["/robots.txt", 200],
      ["/sitemap-index.xml", 200],
      ["/design-partners/", 301],
      ["/product", 301],
      ["/no-such-page/", 404],
      ["/he/no-such-page/", 404],
    ];
    for (const [path, status] of cases) {
      const res = await request.get(`${base}${path}`, { maxRedirects: 0 });
      expect(res.status(), path).toBe(status);
      expect(res.headers()["x-robots-tag"], path).toBe(noindex ? "noindex" : undefined);
    }
    // robots.txt keeps crawling allowed either way: a crawler must fetch a page to see noindex.
    const robots = await (await request.get(`${base}/robots.txt`)).text();
    expect(robots).toMatch(/^User-agent: \*\nAllow: \/$/m);
    expect(robots).not.toMatch(/^Disallow:/m);
    if (noindex) expect(robots).not.toMatch(/^Sitemap:/m);
    else expect(robots).toMatch(/^Sitemap: /m);
  });

  /** W12: an image built with the contact address (EXPECT_NO_MARKERS=1, the operator build) shows
   *  no visible TODO(operator) marker on any page of its sitemap, and every mailto: is to that
   *  address. */
  test("W12: no visible TODO(operator) marker on any page in the sitemap", async ({
    page,
    request,
  }) => {
    test.skip(
      process.env["EXPECT_NO_MARKERS"] !== "1",
      "set EXPECT_NO_MARKERS=1 for an image built with PUBLIC_CONTACT_EMAIL",
    );
    test.setTimeout(600_000);
    const sitemap = await (await request.get(`${base}/sitemap-0.xml`)).text();
    const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
    expect(paths.length).toBeGreaterThanOrEqual(162);
    const shown: string[] = [];
    const mailto = new Set<string>();
    for (const path of [...paths, "/no-such-page/", "/he/no-such-page/"]) {
      await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded" });
      const text = await page.evaluate(() => document.body.innerText);
      if (text.includes("TODO(operator)")) shown.push(path);
      for (const href of await page
        .locator('a[href^="mailto:"]')
        .evaluateAll((els) => els.map((a) => a.getAttribute("href") ?? "")))
        mailto.add(href.replace(/\?.*$/, ""));
    }
    expect(shown).toEqual([]);
    const email = process.env["EXPECT_CONTACT_EMAIL"];
    if (email) expect([...mailto]).toEqual([`mailto:${email}`]);
  });

  /** W13 (D-SWITCH, D-SHOWCASE): under the real CSP, an auto image's switch and the showcase's
   *  scripts cause no violation and no error — under each override, after a press of the switch,
   *  a move of the slider and a figure's set chosen. */
  test("W13: no CSP violation or console error under either override (auto image)", async ({
    browser,
  }) => {
    test.skip(
      !(await (await fetch(`${base}/`)).text()).includes('data-theme="auto"'),
      "an auto image only",
    );
    for (const override of ["light", "dark"]) {
      for (const scheme of ["light", "dark"] as const) {
        const context = await browser.newContext({ colorScheme: scheme });
        const page = await context.newPage();
        const problems: string[] = [];
        page.on("console", (m) => {
          if (m.type() === "error") problems.push(m.text());
        });
        page.on("pageerror", (e) => problems.push(e.message));
        await page.addInitScript((value) => {
          localStorage.setItem("lc-theme", value);
          document.addEventListener("securitypolicyviolation", (e) =>
            console.error(`CSP: ${e.violatedDirective} ${e.blockedURI}`),
          );
        }, override);
        for (const path of ["/", "/he/product/", "/pilot/"]) {
          await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
          expect(await page.evaluate(() => document.documentElement.dataset["theme"])).toBe(
            override,
          );
          await page.locator(".header-actions > [data-theme-switch]").click();
          if (path === "/he/product/") {
            await page.locator("[data-compare] input").fill("30");
            await page.locator("#fig-1 .fig-sets button").last().click();
          }
          await page.mouse.wheel(0, 20000);
          await page.waitForLoadState("networkidle");
        }
        expect(problems, `${override} override, ${scheme} system`).toEqual([]);
        await context.close();
      }
    }
  });
});
