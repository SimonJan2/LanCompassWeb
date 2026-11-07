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
    expect(await (await request.get(`${base}/robots.txt`)).text()).toContain(
      `Sitemap: ${site}/sitemap-index.xml`,
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
});
