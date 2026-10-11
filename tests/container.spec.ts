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
});
