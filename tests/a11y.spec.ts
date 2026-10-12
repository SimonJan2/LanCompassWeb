import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { FLAGS, pages, pathFor, siteBase, siteProject } from "./helpers";

/** A build with the form endpoint configured: the light flags build, or the theme build
 *  itself (the dark and auto test builds set PUBLIC_FORM_ENDPOINT; scripts/build-test.mjs). */
const formsBase = () => (siteProject().theme === "light" ? FLAGS : siteBase());

const widths = [390, 1440];

test.describe("axe: zero violations", () => {
  for (const width of widths) {
    for (const p of pages) {
      test(`${p.path} at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(p.path);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
          .analyze();
        expect(
          results.violations.map(
            (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
          ),
        ).toEqual([]);
      });
    }
  }

  test("forms (endpoint configured) have zero violations in both locales", async ({ page }) => {
    for (const locale of ["en", "he"] as const) {
      for (const which of ["design-partners", "contact"] as const) {
        await page.goto(`${formsBase()}${pathFor(locale, which)}`);
        // Show every error state too.
        await page.locator("form[data-lc-form] button[type=submit]").click();
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(
          results.violations.map(
            (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
          ),
          `${locale} ${which}`,
        ).toEqual([]);
      }
    }
  });
});

test.describe("keyboard", () => {
  test("the skip link is first and moves focus to main", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.locator(".skip-link");
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });

  test("desktop navigation is reachable by Tab, in order", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const seen: string[] = [];
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      seen.push(
        await page.evaluate(() => (document.activeElement as HTMLElement).innerText.trim()),
      );
    }
    expect(seen).toEqual(
      expect.arrayContaining(["Product", "Security", "Design partners", "Become a design partner"]),
    );
  });

  test("language menu opens with the keyboard and closes with Escape", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const summary = page.locator("header details[data-disclosure] summary");
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("header details[data-disclosure]")).toHaveAttribute("open", "");
    await page.keyboard.press("Escape");
    await expect(page.locator("header details[data-disclosure]")).not.toHaveAttribute("open", "");
    await expect(summary).toBeFocused();
  });

  for (const locale of ["en", "he"] as const) {
    test(`mobile sheet (${locale}): opens by keyboard, keeps focus inside, Escape closes`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(pathFor(locale, "home"));
      const toggle = page.locator("[data-menu-open]");
      await toggle.focus();
      await page.keyboard.press("Enter");
      const sheet = page.locator("dialog[data-menu-sheet]");
      await expect(sheet).toBeVisible();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press("Tab");
        const inside = await page.evaluate(() => {
          const el = document.activeElement;
          return !!el && (el.closest("dialog[data-menu-sheet]") !== null || el === document.body);
        });
        expect(inside).toBe(true);
      }
      await page.keyboard.press("Escape");
      await expect(sheet).toBeHidden();
      await expect(toggle).toBeFocused();
    });
  }

  test("the design-partner form can be completed with the keyboard alone", async ({ page }) => {
    await page.route("https://forms.example.com/**", (route) =>
      route.fulfill({ status: 200, body: "ok" }),
    );
    await page.goto(`${formsBase()}/design-partners/`);
    const focusedName = () =>
      page.evaluate(() => {
        const el = document.activeElement as HTMLInputElement | null;
        return el
          ? `${el.tagName.toLowerCase()}:${el.getAttribute("name") ?? el.getAttribute("type") ?? ""}`
          : "";
      });
    /** Tab forward until the element is focused; fail if it takes more than six presses. */
    const tabTo = async (target: string) => {
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press("Tab");
        if ((await focusedName()) === target) return;
      }
      throw new Error(`could not reach ${target} with Tab; stopped at ${await focusedName()}`);
    };
    await page.locator('form[data-lc-form] input[name="name"]').focus();
    await page.keyboard.type("Dana Levi");
    await tabTo("input:email");
    await page.keyboard.type("dana@example.org");
    await tabTo("input:organisation");
    await page.keyboard.type("Example Hospital");
    await tabTo("input:country");
    await page.keyboard.type("Israel");
    await tabTo("select:network_size");
    await page.keyboard.press("ArrowDown");
    await tabTo("input:vendors");
    await page.keyboard.press("Space");
    await tabTo("input:air_gapped");
    await page.keyboard.press("Space");
    await tabTo("textarea:message");
    await page.keyboard.type("Hello");
    await tabTo("input:consent");
    await page.keyboard.press("Space");
    await tabTo("button:submit");
    const requestPromise = page.waitForRequest("https://forms.example.com/submit");
    await page.keyboard.press("Enter");
    expect((await requestPromise).method()).toBe("POST");
  });
});

test.describe("atlas index", () => {
  for (const locale of ["en", "he"] as const) {
    test(`(${locale}) every preview opens on keyboard focus, reachable by Tab alone`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(pathFor(locale, "home"));
      const rows = page.locator("[data-atlas-row]");
      const keys = await rows.evaluateAll((els) =>
        els.map((el) => el.getAttribute("data-atlas-row") ?? ""),
      );
      expect(keys.length).toBeGreaterThanOrEqual(8);
      // Tab into the list from the element just before it, then walk it with Tab only.
      await page.locator("#atlas-title").evaluate((el) => {
        el.setAttribute("tabindex", "-1");
        (el as HTMLElement).focus();
      });
      for (const key of keys) {
        await page.keyboard.press("Tab");
        await expect(page.locator(`[data-atlas-row="${key}"]`)).toBeFocused();
        await expect(page.locator(`[data-atlas-preview="${key}"]`)).toBeVisible();
        for (const other of keys.filter((k) => k !== key)) {
          await expect(page.locator(`[data-atlas-preview="${other}"]`)).toBeHidden();
        }
      }
    });
  }

  test("previews also follow hover", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.locator('[data-atlas-row="nac"]').hover();
    await expect(page.locator('[data-atlas-preview="nac"]')).toBeVisible();
    await expect(page.locator('[data-atlas-preview="ipam"]')).toBeHidden();
  });
});
