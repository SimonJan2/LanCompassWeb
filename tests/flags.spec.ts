import { expect, test } from "@playwright/test";
import { DEFAULT, FLAGS, FLAG_VALUES, pathFor } from "./helpers";

test.describe("feature flags", () => {
  test("with docs, GitHub and form endpoint empty: no Docs, no GitHub, forms fall back to mailto:", async ({
    page,
  }) => {
    for (const locale of ["en", "he"] as const) {
      await page.goto(`${DEFAULT}${pathFor(locale, "home")}`);
      await expect(page.locator('[data-flag="docs"]')).toHaveCount(0);
      await expect(page.locator('[data-flag="github"]')).toHaveCount(0);
      await expect(page.locator('a[href*="github.com"]')).toHaveCount(0);
      for (const which of ["design-partners", "contact"] as const) {
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

  test("with them set: Docs in the nav, GitHub in the footer, forms post to the endpoint", async ({
    page,
  }) => {
    for (const locale of ["en", "he"] as const) {
      await page.goto(`${FLAGS}${pathFor(locale, "home")}`);
      await expect(page.locator(`header .header-nav [data-flag="docs"]`)).toHaveAttribute(
        "href",
        FLAG_VALUES.docs,
      );
      await expect(page.locator(`footer [data-flag="github"]`)).toHaveAttribute(
        "href",
        FLAG_VALUES.github,
      );
      for (const which of ["design-partners", "contact"] as const) {
        await page.goto(`${FLAGS}${pathFor(locale, which)}`);
        const form = page.locator("form[data-lc-form]");
        await expect(form).toHaveAttribute("action", FLAG_VALUES.form);
        await expect(form).toHaveAttribute("method", "post");
        await expect(page.locator("[data-form-fallback]")).toHaveCount(0);
      }
    }
  });

  test("the fingerprint block is absent while fingerprints.json is empty", async ({ page }) => {
    for (const base of [DEFAULT, FLAGS]) {
      for (const locale of ["en", "he"] as const) {
        await page.goto(`${base}${pathFor(locale, "security")}`);
        await expect(page.locator("#verification")).toHaveCount(0);
      }
    }
  });
});
