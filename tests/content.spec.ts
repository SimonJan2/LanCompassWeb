import { expect, test } from "@playwright/test";
import { pages, todoAllowed } from "./helpers";

const banned = [
  "revolutionary",
  "seamless",
  "cutting-edge",
  "next-gen",
  "ai-powered",
  "game-changing",
  "robust",
  "leverage",
  "unlock",
  "empower",
];
const misspellings = ["LAN Compass", "Lancompass", "LANCOMPASS"];
const forbiddenClaims = [
  /trusted by/i,
  /military-grade/i,
  /\bISO ?27001\b/i,
  /\bSOC ?2\b/i,
  /\bGitHub stars?\b/i,
  /\btestimonial/i,
];

test.describe("forbidden content", () => {
  for (const p of pages) {
    test(`${p.path}`, async ({ page }) => {
      await page.goto(p.path);
      const text = await page.evaluate(() => document.body.innerText);
      const meta = await page.evaluate(
        () =>
          `${document.title} ${document.querySelector('meta[name="description"]')?.getAttribute("content") ?? ""}`,
      );
      const all = `${text}\n${meta}`;
      // Environment variable names such as LANCOMPASS_PASSWORD_FILE are code, not the brand name.
      const prose = await page.evaluate(() => {
        const clone = document.body.cloneNode(true) as HTMLElement;
        clone.querySelectorAll("code, script, style").forEach((el) => el.remove());
        return clone.textContent ?? "";
      });
      for (const word of banned) {
        expect(all.toLowerCase(), `banned word "${word}"`).not.toMatch(new RegExp(`\\b${word}`));
      }
      for (const wrong of misspellings) {
        expect(`${prose}\n${meta}`, `misspelling "${wrong}"`).not.toContain(wrong);
      }
      for (const claim of forbiddenClaims) {
        expect(all).not.toMatch(claim);
      }
      // No downloads in W1.
      const downloads = await page.evaluate(() =>
        Array.from(document.querySelectorAll("a"))
          .filter(
            (a) =>
              a.hasAttribute("download") ||
              /\.(tar\.gz|tgz|zip|exe|msi|dmg|deb|rpm|iso|ova|sha256)(\?|$)/i.test(
                a.getAttribute("href") ?? "",
              ) ||
              /\/downloads?\b/i.test(a.getAttribute("href") ?? ""),
          )
          .map((a) => a.getAttribute("href")),
      );
      expect(downloads).toEqual([]);
      // No pricing outside the two pages that may mention editions.
      expect(all).not.toMatch(/[$€₪]\s?\d/);
      if (todoAllowed.has(p.page)) return;
      expect(text, "visible TODO(operator) marker").not.toContain("TODO(operator)");
    });
  }
});
