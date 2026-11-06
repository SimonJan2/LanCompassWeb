import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { pages } from "./helpers";

/**
 * Runs only against the Docker image (nginx), where the security headers are
 * actually enforced: DOCKER_BASE_URL=http://localhost:8088 npx playwright test tests/container.spec.ts
 * `astro preview` sends no CSP, so the main suite cannot catch a violation.
 */
const base = process.env["DOCKER_BASE_URL"];

test.describe("container: enforced CSP", () => {
  test.skip(!base, "set DOCKER_BASE_URL to run against the container");

  for (const p of pages) {
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
