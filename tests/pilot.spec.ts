import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { layOutInFull, pathFor } from "./helpers";

/**
 * W7: /pilot/ and /licensing/, both locales, in every theme project (playwright.config.ts →
 * themed). The pilot page: its sections in the contract's order, the product's ten steps, the
 * success worksheet (a table with a caption and five column headers), the form at #apply. The
 * licensing page: its sections in order, the five states named, "every licence includes every
 * feature" (DECISIONS.md D-EDITIONS' default), the questions as a plain list (no details, no
 * script of its own). axe clean on both.
 */

const PILOT = [
  "what",
  "before-day-one",
  "first-30-days",
  "success-criteria",
  "support",
  "ends",
  "security-review",
  "design-partners",
  "apply",
];
const LICENSING = ["try", "licence", "before-it-ends", "read-only", "editions", "questions"];
const STATES = {
  en: ["Evaluation", "Valid", "Ending soon", "Ended — grace period", "Ended — read-only"],
  he: ["תקופת הערכה", "בתוקף", "מסתיים בקרוב", "הסתיים — תקופת חסד", "הסתיים — קריאה בלבד"],
};
const EVERY_FEATURE = {
  en: "every licence includes every feature",
  he: "כל רישיון כולל את כל התכונות",
};
const APPLY = { en: "Apply for a pilot", he: "בקשה לפיילוט" };

async function axeClean(page: import("@playwright/test").Page) {
  await layOutInFull(page);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
}

const sectionIds = (page: import("@playwright/test").Page) =>
  page.locator("main section[id]").evaluateAll((els) => els.map((el) => el.id));

test.describe("the pilot and the licence (W7)", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  for (const locale of ["en", "he"] as const) {
    test(`${pathFor(locale, "pilot")}: sections in order, ten steps, the worksheet, the form`, async ({
      page,
    }) => {
      await page.goto(pathFor(locale, "pilot"));
      expect(await sectionIds(page)).toEqual(PILOT);
      await expect(page.locator("[data-pilot-steps] > li")).toHaveCount(10);
      await expect(page.locator("[data-pilot-steps] > li h3")).toHaveCount(10);
      const sheet = page.locator("table[data-worksheet]");
      await expect(sheet.locator("caption")).toHaveText(/\S/);
      await expect(sheet.locator("thead th[scope=col]")).toHaveCount(5);
      await expect(sheet.locator("tbody tr")).toHaveCount(3);
      await expect(sheet.locator("tbody th[scope=row]")).toHaveCount(3);
      await expect(page.locator("#apply h2")).toHaveText(APPLY[locale]);
      await expect(page.locator("#ends ol > li")).toHaveCount(4);
      await expect(page.locator("#security-review a")).toHaveCount(2);
      await expect(page.locator("#security-review a").last()).toHaveAttribute(
        "href",
        pathFor(locale, "verify"),
      );
      await axeClean(page);
    });

    test(`${pathFor(locale, "licensing")}: sections in order, the states, editions, no script`, async ({
      page,
    }) => {
      await page.goto(pathFor(locale, "licensing"));
      expect(await sectionIds(page)).toEqual(LICENSING);
      const states = await page.locator("table[data-licence-states] tbody th").allTextContents();
      expect(states.map((s) => s.trim())).toEqual(STATES[locale]);
      await expect(page.locator("#editions")).toContainText(EVERY_FEATURE[locale]);
      await expect(page.locator("#questions dl > div")).toHaveCount(7);
      await expect(page.locator("main details, main script, main button")).toHaveCount(0);
      expect(
        await page
          .locator('script[type="application/ld+json"]')
          .evaluateAll((els) =>
            els.map((el) => el.textContent ?? "").filter((t) => /FAQPage/.test(t)),
          ),
      ).toEqual([]);
      await expect(page.locator("#editions a")).toHaveAttribute(
        "href",
        `${pathFor(locale, "pilot")}#apply`,
      );
      await axeClean(page);
    });
  }
});
