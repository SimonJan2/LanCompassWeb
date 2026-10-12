import { expect, test } from "@playwright/test";
import { pages } from "./helpers";

/**
 * The Hebrew guard (docs/copy/he-voice.md). On every /he/ page: no banned
 * marketing cliché or translation calque, no masculine-singular imperative on
 * a button, no slash-gender form outside a form label, no ASCII double quote
 * next to a Hebrew letter (use ״), and every visible Latin run bidi-isolated.
 */

const banned = [
  "פתרון מקצה לקצה",
  "המוביל",
  "חדשני",
  "פורץ דרך",
  "מהפכני",
  "הדבר הגדול הבא",
  "ברמה הגבוהה ביותר",
  "חוויית משתמש מושלמת",
  "סינרגיה",
  "בקליק אחד",
  "העתיד כבר כאן",
];
const calques: RegExp[] = [
  /באותו עמוד/,
  /לקחת\s.{0,40}לשלב הבא/,
  /בסופו של יום/,
  /לעשות הבדל/,
  /מגיע(?:ה|ים|ות)? עם/,
  /מופעל(?:ת|ים|ות)? על ידי/,
  /בזמן אמת/,
];
/** Masculine-singular imperatives that must never label a control. */
const masculineImperatives = [
  "שלח",
  "הירשם",
  "לחץ",
  "הצטרף",
  "קבל",
  "צור",
  "התחבר",
  "הורד",
  "הזמן",
  "בחר",
  "המשך",
];
const HEB = "א-ת";
const words = (text: string) => text.split(new RegExp(`[^${HEB}]+`)).filter(Boolean);

const hebrew = pages.filter((p) => p.locale === "he");

test.describe("Hebrew voice", () => {
  for (const p of hebrew) {
    test(`${p.path}`, async ({ page }) => {
      await page.goto(p.path);
      const text = await page.evaluate(() => document.body.innerText);
      const meta = await page.evaluate(
        () =>
          `${document.title}\n${document.querySelector('meta[name="description"]')?.getAttribute("content") ?? ""}`,
      );
      const all = `${text}\n${meta}`;

      for (const phrase of banned) expect(all, `banned "${phrase}"`).not.toContain(phrase);
      for (const calque of calques) expect(all, `calque ${calque}`).not.toMatch(calque);

      // Buttons: the infinitive or a verbal noun, never a masculine-singular imperative.
      const labels = await page.evaluate(() =>
        Array.from(document.querySelectorAll("button, [type=submit], .btn")).map(
          (el) => `${(el as HTMLElement).innerText} ${el.getAttribute("aria-label") ?? ""}`,
        ),
      );
      for (const label of labels) {
        const found = words(label).filter((w) => masculineImperatives.includes(w));
        expect(found, `button "${label.trim()}"`).toEqual([]);
      }

      // Slash-gender forms (מסכים/ה, איש/ת) only inside a form label.
      const slashes = await page.evaluate((heb) => {
        const re = new RegExp(`[${heb}]+/[${heb}]{1,3}(?![${heb}])`);
        const out: string[] = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const t = n.textContent ?? "";
          if (re.test(t) && !n.parentElement?.closest("label, legend")) out.push(t.trim());
        }
        return out;
      }, HEB);
      expect(slashes).toEqual([]);

      // Gershayim, not an ASCII double quote, next to Hebrew letters.
      expect(all).not.toMatch(new RegExp(`[${HEB}]"|"[${HEB}]`));

      // Latin inside Hebrew is bidi-isolated (the W1 rule).
      const leaks = await page.evaluate(() => {
        const isolated =
          "bdi, code, kbd, samp, [dir], [lang='en'], svg, [translate='no'], script, style, title";
        const bad: string[] = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const t = n.textContent ?? "";
          if (!/[A-Za-z]/.test(t)) continue;
          const parent = n.parentElement;
          if (!parent || parent.closest(isolated)) continue;
          if (parent.closest("[hidden], [aria-hidden='true'], dialog:not([open])")) continue;
          bad.push(t.trim().slice(0, 80));
        }
        return bad;
      });
      expect(leaks).toEqual([]);
    });
  }

  test("the guard catches what it should", () => {
    expect(words("שלח הודעה").some((w) => masculineImperatives.includes(w))).toBe(true);
    expect(words("שליחת ההודעה").some((w) => masculineImperatives.includes(w))).toBe(false);
    expect("פתרון מקצה לקצה לרשת").toContain(banned[0]!);
    expect(new RegExp(`[${HEB}]"|"[${HEB}]`).test('דוא"ל')).toBe(true);
    expect(new RegExp(`[${HEB}]"|"[${HEB}]`).test("דוא״ל")).toBe(false);
  });
});
