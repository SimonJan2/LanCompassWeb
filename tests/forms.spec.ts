import { expect, test } from "@playwright/test";
import { FLAGS, FLAG_VALUES, pathFor } from "./helpers";

async function fillPartner(page: import("@playwright/test").Page) {
  const form = page.locator("form[data-lc-form]");
  await form.locator('input[name="name"]').fill("Dana Levi");
  await form.locator('input[name="email"]').fill("dana@example.org");
  await form.locator('input[name="organisation"]').fill("Example Hospital");
  await form.locator('input[name="country"]').fill("Israel");
  await form.locator('select[name="network_size"]').selectOption({ index: 1 });
  await form.locator('input[name="vendors"]').first().check();
  await form.locator('input[name="air_gapped"]').first().check();
  await form.locator('input[name="consent"]').check();
}

test.describe("forms", () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`${new URL(FLAG_VALUES.form).origin}/**`, (route) =>
      route.fulfill({ status: 200, contentType: "text/plain", body: "received" }),
    );
  });

  for (const locale of ["en", "he"] as const) {
    test(`required fields show inline errors in ${locale}`, async ({ page }) => {
      await page.goto(`${FLAGS}${pathFor(locale, "design-partners")}`);
      const form = page.locator("form[data-lc-form]");
      let posted = false;
      page.on("request", (r) => {
        if (r.url().startsWith(FLAG_VALUES.form)) posted = true;
      });
      await form.locator("button[type=submit]").click();
      await expect(form.locator(".form-summary")).toBeVisible();
      await expect(form.locator('input[name="name"]')).toHaveAttribute("aria-invalid", "true");
      await expect(form.locator('input[name="name"]')).toBeFocused();
      await expect(form.locator('select[name="network_size"]')).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      await expect(form.locator('[role="radiogroup"]')).toHaveAttribute("aria-invalid", "true");
      await expect(form.locator('input[name="consent"]')).toHaveAttribute("aria-invalid", "true");
      const errorId = await form.locator('input[name="name"]').getAttribute("data-error-id");
      await expect(page.locator(`#${errorId}`)).toBeVisible();
      await form.locator('input[name="email"]').fill("not-an-email");
      await form.locator("button[type=submit]").click();
      const emailError = await form.locator('input[name="email"]').getAttribute("data-error-id");
      await expect(page.locator(`#${emailError}`)).toContainText("@");
      expect(posted).toBe(false);
    });
  }

  test("a valid application posts every field to the endpoint", async ({ page }) => {
    await page.goto(`${FLAGS}/design-partners/`);
    await fillPartner(page);
    const req = page.waitForRequest(FLAG_VALUES.form);
    await page.locator("form[data-lc-form] button[type=submit]").click();
    const body = new URLSearchParams((await req).postData() ?? "");
    expect(body.get("form")).toBe("partner");
    expect(body.get("name")).toBe("Dana Levi");
    expect(body.get("email")).toBe("dana@example.org");
    expect(body.get("consent")).toBe("yes");
    expect(body.get("air_gapped")).not.toBeNull();
    expect(body.get("website")).toBe("");
  });

  test("a filled honeypot stops the submission", async ({ page }) => {
    await page.goto(`${FLAGS}/design-partners/`);
    await fillPartner(page);
    await page
      .locator("[data-honeypot]")
      .evaluate((el) => ((el as HTMLInputElement).value = "spam"));
    let posted = false;
    page.on("request", (r) => {
      if (r.url().startsWith(FLAG_VALUES.form)) posted = true;
    });
    await page.locator("form[data-lc-form] button[type=submit]").click();
    await page.waitForTimeout(500);
    expect(posted).toBe(false);
    await expect(page.locator("form[data-lc-form]")).toHaveAttribute("data-blocked", "honeypot");
    // The honeypot is out of the tab order and hidden from assistive technology.
    await expect(page.locator("[data-honeypot]")).toHaveAttribute("tabindex", "-1");
    await expect(page.locator(".hp")).toHaveAttribute("aria-hidden", "true");
  });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("native validation blocks an empty form, and a valid one posts", async ({ page }) => {
      await page.goto(`${FLAGS}/he/design-partners/`);
      const form = page.locator("form[data-lc-form]");
      let posted = false;
      page.on("request", (r) => {
        if (r.url().startsWith(FLAG_VALUES.form)) posted = true;
      });
      await form.locator("button[type=submit]").click();
      await page.waitForTimeout(300);
      expect(posted).toBe(false);
      expect(
        await form
          .locator('input[name="name"]')
          .evaluate((el) => (el as HTMLInputElement).validity.valueMissing),
      ).toBe(true);
      await fillPartner(page);
      const req = page.waitForRequest(FLAG_VALUES.form);
      await form.locator("button[type=submit]").click();
      expect((await req).method()).toBe("POST");
    });

    test("the contact form posts without JavaScript", async ({ page }) => {
      await page.goto(`${FLAGS}/contact/`);
      const form = page.locator("form[data-lc-form]");
      await form.locator('input[name="name"]').fill("Avi");
      await form.locator('input[name="email"]').fill("avi@example.org");
      await form.locator('textarea[name="message"]').fill("Hello");
      await form.locator('input[name="consent"]').check();
      const req = page.waitForRequest(FLAG_VALUES.form);
      await form.locator("button[type=submit]").click();
      expect(new URLSearchParams((await req).postData() ?? "").get("form")).toBe("contact");
    });
  });
});
