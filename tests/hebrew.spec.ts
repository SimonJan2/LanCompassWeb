import { expect, test, type Page } from "@playwright/test";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pages, sectionPages, siteProject } from "./helpers";

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

// W8: the release-note pages too (their Hebrew is the site's own summary).
const hebrew = [...pages, ...sectionPages].filter((p) => p.locale === "he");

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

      // Latin inside Hebrew is bidi-isolated (the W1 rule). W10: `[dir]` matched <html dir="rtl">,
      // so this skipped every node until now; the operator's English markers are allowed.
      const leaks = await page.evaluate(() => {
        const isolated =
          "bdi, code, kbd, samp, pre, [dir='ltr'], [dir='auto'], [lang='en'], svg, [translate='no'], script, style, title, .todo-operator";
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

/**
 * W10: Latin words on every Hebrew page. Counts the words in Latin letters a reader sees outside
 * anything that isolates them — markup (bdi, code, kbd, samp, pre, an element with dir="ltr" or
 * "auto", lang="en", svg, translate="no") or the Unicode isolate marks (U+2066/2067/2068 …
 * U+2069, followed across text nodes) — on every /he/ page of the build: the site's pages, the
 * release notes, the 404 and the 66 docs pages. The allowlist, each entry with its reason:
 *  - `.docs-prose`: a docs article is the product's own Hebrew help, synced verbatim from the tag
 *    (W9, scripts/sync-docs.mjs), so its isolation is the product's: its own marks isolate some
 *    names, while its English UI labels and acronyms are bare (5,903 words at 0.7.0). Counted and
 *    reported, never failed: the product owns them (night E report).
 *  - `.todo-operator`: the operator's English markers, which go before going public
 *    (docs/go-public.md).
 *  - names: none. Every name and command in the site's own Hebrew is already in <bdi> or <code>.
 * The site's own text must have none. Its text is the same in every theme: the light project
 * runs it.
 */
function countLatin() {
  const ISOLATING =
    "bdi, code, kbd, samp, pre, [dir='ltr'], [dir='auto'], [lang]:not([lang|='he']), svg, [translate='no'], script, style, title, noscript, template";
  const HIDDEN = "[hidden], [aria-hidden='true'], dialog:not([open])";
  const site: string[] = [];
  let product = 0;
  let depth = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.textContent ?? "";
    const parent = n.parentElement;
    const skip =
      !parent ||
      !!parent.closest(ISOLATING) ||
      !!parent.closest(HIDDEN) ||
      !!parent.closest(".todo-operator");
    const isProduct = !!parent?.closest(".docs-prose");
    let word = "";
    const flush = () => {
      if (word && !skip) {
        if (isProduct) product++;
        else site.push(`${word} — ${text.replace(/\s+/g, " ").trim().slice(0, 60)}`);
      }
      word = "";
    };
    for (const ch of text) {
      if (ch === "⁦" || ch === "⁧" || ch === "⁨") {
        flush();
        depth++;
      } else if (ch === "⁩") {
        flush();
        depth = Math.max(0, depth - 1);
      } else if (depth === 0 && /[A-Za-z]/.test(ch)) word += ch;
      else if (depth === 0 && word && /[0-9]/.test(ch)) word += ch;
      else flush();
    }
    flush();
  }
  return { site, product };
}

function hebrewPaths(dist: string): string[] {
  const root = join(process.cwd(), dist);
  const out: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".html"))
        out.push(`/${relative(root, full).replace(/index\.html$/, "")}`);
    }
  };
  walk(join(root, "he"));
  return out.sort().filter((p) => !/design-partners/.test(p));
}

const LATIN_CHUNKS = 4;

test.describe("Latin words on every Hebrew page (W10)", () => {
  test.beforeEach(() => {
    test.skip(siteProject().theme !== "light", "the text is the same in every theme");
  });

  for (let chunk = 0; chunk < LATIN_CHUNKS; chunk++) {
    test(`every /he/ page, part ${chunk + 1} of ${LATIN_CHUNKS}: none in the site's own text`, async ({
      page,
    }) => {
      test.setTimeout(180_000);
      // Ten pages, the 404, the changelog index and four releases, the docs index and 65 articles.
      const all = hebrewPaths(siteProject().dist);
      expect(all.length).toBe(82);
      const site: string[] = [];
      let product = 0;
      for (const path of all.filter((_, i) => i % LATIN_CHUNKS === chunk)) {
        await page.goto(path);
        const r = await page.evaluate(countLatin);
        site.push(...r.site.map((s) => `${path}: ${s}`));
        product += r.product;
      }
      test.info().annotations.push({
        type: "product-latin",
        description: `${product} Latin words in the product's own article text (allowlisted)`,
      });
      expect(site).toEqual([]);
    });
  }

  test("the count sees what it should", async ({ page }: { page: Page }) => {
    await page.setContent(
      '<html lang="he" dir="rtl"><body><p>שלום World <bdi>Bdi</bdi> <code>code</code> ⁦Mark⁩ <span dir="ltr">Ltr</span> <span lang="en">En</span> <span dir="rtl">Rtl</span></p><p>⁨<strong>Bold</strong>⁩ v2</p><div class="docs-prose"><p>Product text</p></div><span class="todo-operator">TODO</span><p hidden>Hidden</p></body></html>',
    );
    const r = await page.evaluate(countLatin);
    expect(r.site.map((s) => s.split(" — ")[0])).toEqual(["World", "Rtl", "v2"]);
    expect(r.product).toBe(2);
  });
});
