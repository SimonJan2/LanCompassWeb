import { expect, test } from "@playwright/test";
import { pages } from "./helpers";

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  for (const p of pages) {
    test(`${p.path}: no running animations`, async ({ page }) => {
      await page.goto(p.path);
      await page.mouse.wheel(0, 3000);
      await page.waitForTimeout(300);
      const running = await page.evaluate(
        () => document.getAnimations().filter((a) => a.playState === "running").length,
      );
      expect(running).toBe(0);
      expect(await page.locator(".reveal-armed").count()).toBe(0);
    });
  }

  for (const path of ["/", "/he/"]) {
    test(`${path}: the drift map shows its resolved frame`, async ({ page }) => {
      await page.goto(path);
      const opacity = (sel: string) =>
        page.locator(sel).evaluate((el) => getComputedStyle(el).opacity);
      expect(await opacity(".edge-resolved")).toBe("1");
      expect(await opacity(".edge-ghost")).toBe("0");
      expect(await opacity(".chip-resolved")).toBe("1");
      expect(await opacity(".chip-finding")).toBe("0");
      await expect(page.locator(".drift-pause")).toBeHidden();
    });
  }
});

test.describe("normal motion", () => {
  test.use({ reducedMotion: "no-preference" });

  test("the drift map loops and the pause switch stops it", async ({ page }) => {
    await page.goto("/");
    const states = () =>
      page.evaluate(() =>
        document
          .getAnimations()
          .filter(
            (a) =>
              a instanceof CSSAnimation && /ghost|resolved|chip|probe|march/.test(a.animationName),
          )
          .map((a) => a.playState),
      );
    const before = await states();
    expect(before.length).toBeGreaterThan(0);
    expect(before.every((s) => s === "running")).toBe(true);
    await page.locator("[data-drift-pause]").check();
    expect((await states()).every((s) => s === "paused")).toBe(true);
  });
});
