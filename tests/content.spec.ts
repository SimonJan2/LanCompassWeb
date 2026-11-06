import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { pages, todoAllowed } from "./helpers";

const releases = JSON.parse(
  readFileSync(join(process.cwd(), "src", "content", "releases.json"), "utf8"),
) as { releases: { version: string; date: string }[] };

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
/** Claims the site must not make (W2 contract, class X): customers, logos, testimonials,
 *  ratings, certifications or guarantees, AI, "military-grade", a competitor's name, "open
 *  source", prices and edition names. NetBox is named only as an import source. */
const forbiddenClaims = [
  /trusted by/i,
  /military-grade/i,
  /\bISO ?27001\b/i,
  /\bSOC ?2\b/i,
  /\bGitHub stars?\b/i,
  /\btestimonial/i,
  /\bour customers\b/i,
  /\bcustomer logos?\b/i,
  /\b\d(?:\.\d)? ?(?:out of 5 )?stars?\b/i,
  /★/,
  /\bcertified\b/i,
  /\bguarantee/i,
  /\bAI\b/,
  /\bopen[- ]source\b/i,
  /\b(?:SolarWinds|Infoblox|Device42|Auvik|BlueCat|ManageEngine|Nautobot|phpIPAM|IP Fabric)\b/,
  /\b(?:Enterprise|Professional|Pro|Starter|Premium|Business) (?:edition|plan|tier)\b/i,
  /full Hebrew and Arabic/i,
  /עברית וערבית מלאות/,
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
      // W7: /licensing/ answers "Is it open source?" with "No … not open source" (C-LIC-8); those
      // two phrases are the only "open source" any page may carry.
      const claimsText =
        p.page === "licensing" ? all.replace(/Is it open source\?|is not open source/g, "") : all;
      for (const claim of forbiddenClaims) {
        expect(claimsText).not.toMatch(claim);
      }
      // W7 (class X): no price, no "free", no "per month / per year", no "coming" editions line.
      for (const never of [
        /\bfree\b/i,
        /חינם/,
        /\bper (?:month|year)\b/i,
        /[₪€]/,
        /support plans are coming/i,
        /תוכניות תמיכה בדרך/,
        /\btrial\b/i,
        /\b(?:sign[- ]up|checkout|countdown)\b/i,
      ]) {
        expect(all, `${never}`).not.toMatch(never);
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

test.describe("the site at the newest release (W2)", () => {
  const latest = releases.releases[0]!;

  for (const locale of ["en", "he"] as const) {
    const prefix = locale === "en" ? "" : "/he";

    test(`${locale}: the datasheet's Release row and What's new name the newest release`, async ({
      page,
    }) => {
      await page.goto(`${prefix}/`);
      const release = page.locator(`.datasheet a[data-release]`);
      await expect(release).toHaveAttribute("data-release", latest.version);
      await expect(release).toContainText(latest.version);
      await expect(release.locator("time")).toHaveAttribute("datetime", latest.date);
      await expect(release).toHaveAttribute("href", "#whats-new");
      const news = page.locator("#whats-new");
      await expect(news.locator(".eyebrow")).toContainText(latest.version);
      await expect(news.locator(".eyebrow time")).toHaveAttribute("datetime", latest.date);
      await expect(news.locator(".news-item")).toHaveCount(3);
      expect(
        await news
          .locator(".news-title a")
          .evaluateAll((els) => els.map((a) => a.getAttribute("href"))),
      ).toEqual([`${prefix}/product/#map`, `${prefix}/product/#map`, `${prefix}/product/#studio`]);
    });

    test(`${locale}: /product resolves #map, #studio and the old #studios, #reports, #snmp`, async ({
      page,
    }) => {
      await page.goto(`${prefix}/product/`);
      for (const id of ["map", "studio", "studios", "reports", "snmp", "platform-needs"])
        await expect(page.locator(`[id="${id}"]`), `#${id}`).toHaveCount(1);
      await expect(page.locator("section.capability")).toHaveCount(11);
      await expect(page.locator("#studios")).toHaveAttribute("data-anchor-alias", "studio");
      await expect(page.locator("#snmp")).toHaveAttribute("data-anchor-alias", "map");
    });

    test(`${locale}: /security mentions the installer's signature check`, async ({ page }) => {
      await page.goto(`${prefix}/security/`);
      const text = await page.evaluate(() => document.body.innerText);
      expect(text).toContain("Ed25519");
      expect(text).toMatch(locale === "en" ? /Ed25519 signature/ : /חתימת ה־\s?Ed25519/);
      expect(text).not.toMatch(/install script that verifies checksums/);
    });
  }

  test("the JSON-LD names BusinessApplication and the newest version", async ({ page }) => {
    for (const path of ["/", "/he/"]) {
      await page.goto(path);
      const ld = JSON.parse(
        (await page.locator('script[type="application/ld+json"]').first().textContent()) ?? "{}",
      );
      const app = (Array.isArray(ld) ? ld : [ld]).find(
        (x: { "@type"?: string }) => x["@type"] === "SoftwareApplication",
      );
      expect(app?.applicationCategory).toBe("BusinessApplication");
      expect(app?.softwareVersion).toBe(latest.version);
    }
  });

  test("no product-fact TODO(operator) in the copy files; only the Hebrew review marker", () => {
    const copy = (f: string) =>
      readFileSync(join(process.cwd(), "src", "content", "copy", f), "utf8");
    expect(copy("en.ts")).not.toContain("TODO(operator)");
    const he = copy("he.ts")
      .split("\n")
      .filter((l) => l.includes("TODO(operator)"));
    expect(he).toEqual([
      " * TODO(operator): native Hebrew copy review of this file (docs/copy/he-review.md) before going public.",
    ]);
  });
});

test.describe("verify and disclosure (W6)", () => {
  for (const locale of ["en", "he"] as const) {
    const prefix = locale === "en" ? "" : "/he";

    test(`${locale}: /verify/ says what is inside, what is supported and how to get the bundle`, async ({
      page,
    }) => {
      await page.goto(`${prefix}/verify/`);
      for (const id of ["inside", "upgrades", "get"]) {
        await expect(page.locator(`section#${id} h2`), `#${id}`).toHaveCount(1);
      }
      const files = await page.locator("#inside dt code").allTextContents();
      for (const f of ["install.sh", "upgrade.sh", "SHA256SUMS.sig", "lancompass-release.pub"]) {
        expect(files).toContain(f);
      }
      await expect(page.locator('a[href$=".tar.gz"]')).toHaveCount(0);
    });

    test(`${locale}: /security#disclosure exists, without GitHub`, async ({ page }) => {
      await page.goto(`${prefix}/security/`);
      const heading = page.locator("h2#disclosure");
      await expect(heading).toHaveCount(1);
      const section = await heading.evaluate((h) => {
        let text = "";
        for (let el = h.nextElementSibling; el && el.tagName !== "H2"; el = el.nextElementSibling)
          text += `${(el as HTMLElement).innerText}\n`;
        return text;
      });
      expect(section).toContain("hello@example.com");
      expect(section).not.toMatch(/github/i);
      await expect(page.locator('a[href="/verify/"], a[href="/he/verify/"]').first()).toHaveCount(
        1,
      );
    });
  }
});

test.describe("accessibility statement", () => {
  for (const [path, says, never] of [
    [
      "/accessibility/",
      "The product videos have captions in English and Hebrew.",
      /not published yet/i,
    ],
    ["/he/accessibility/", "לסרטוני המוצר יש כתוביות בעברית ובאנגלית.", /עוד לא פורסמו/],
  ] as const) {
    test(`${path} states that the videos have captions`, async ({ page }) => {
      await page.goto(path);
      const text = await page.evaluate(() => document.body.innerText);
      expect(text).toContain(says);
      expect(text).not.toMatch(never);
    });
  }
});
