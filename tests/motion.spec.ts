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

/** Records whether the next document was revealed through a view transition. */
async function navigateAndReadTransition(page: import("@playwright/test").Page): Promise<boolean> {
  await page.addInitScript(() => {
    window.addEventListener("pagereveal", (event) => {
      (window as unknown as { __lcTransition: boolean }).__lcTransition = !!(
        event as Event & { viewTransition?: unknown }
      ).viewTransition;
    });
  });
  await page.goto("/");
  await page.locator(".header-nav a", { hasText: "Product" }).click();
  await page.waitForURL("**/product/");
  await page.waitForLoadState("load");
  return page.evaluate(
    () => (window as unknown as { __lcTransition?: boolean }).__lcTransition ?? false,
  );
}

test.describe("W1.1 motion: reduced", () => {
  test.use({ reducedMotion: "reduce" });

  test("no view transition between pages", async ({ page }) => {
    expect(await navigateAndReadTransition(page)).toBe(false);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  });

  for (const path of ["/", "/he/"]) {
    test(`${path}: two sheets show the registered, resolved frame`, async ({ page }) => {
      await page.goto(path);
      const style = (sel: string, prop: string) =>
        page
          .locator(sel)
          .first()
          .evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);
      expect(await style(".sheet-vellum", "transform")).toBe("none");
      expect(await style(".edge-resolved", "opacity")).toBe("1");
      expect(await style(".chip-resolved", "opacity")).toBe("1");
      expect(await style(".edge-ghost", "opacity")).toBe("0");
      expect(await style(".reveal", "opacity")).toBe("1");
    });
  }
});

test.describe("W1.1 motion: normal", () => {
  test.use({ reducedMotion: "no-preference" });

  test("cross-document view transition runs on navigation", async ({ page }) => {
    expect(await navigateAndReadTransition(page)).toBe(true);
  });

  test("the two-sheets loop pauses offscreen and resumes on return", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const sheets = page.locator("[data-two-sheets]");
    const vellumState = () =>
      page.evaluate(
        () =>
          document
            .getAnimations()
            .find((a) => a instanceof CSSAnimation && a.animationName === "sheets-register")
            ?.playState,
      );
    expect(await vellumState()).toBe("running");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(sheets).toHaveAttribute("data-offscreen", "");
    expect(await vellumState()).toBe("paused");
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(sheets).not.toHaveAttribute("data-offscreen", "");
    expect(await vellumState()).toBe("running");
  });

  test("section reveals are scroll-driven CSS, and the page ships no reveal script", async ({
    page,
  }) => {
    await page.goto("/");
    const timelines = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => a instanceof CSSAnimation && a.animationName === "lc-reveal")
        .map((a) => a.timeline?.constructor.name),
    );
    expect(timelines.length).toBeGreaterThan(0);
    expect(timelines.every((t) => t === "ViewTimeline")).toBe(true);
    expect(await page.locator("[data-reveal]").count()).toBe(0);
  });
});
