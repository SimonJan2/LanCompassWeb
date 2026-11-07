import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { FORM_SERVICE_MARKER, pages, todoAllowed } from "./helpers";

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
      // W12: /privacy/'s one form-service marker belongs to builds with PUBLIC_FORM_ENDPOINT set
      // (tests/flags.spec.ts holds where it shows and where it does not).
      const visible = p.page === "privacy" ? text.replace(FORM_SERVICE_MARKER, "") : text;
      expect(visible, "visible TODO(operator) marker").not.toContain("TODO(operator)");
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
      // W8: the Release row and What's new link the newest release's notes.
      await expect(release).toHaveAttribute("href", `${prefix}/changelog/${latest.version}/`);
      const news = page.locator("#whats-new");
      await expect(news.locator(".section-more a")).toHaveAttribute(
        "href",
        `${prefix}/changelog/${latest.version}/`,
      );
      await expect(news.locator(".section-more a")).toHaveText(
        locale === "en" ? "Read the release notes" : "להערות הגרסה",
      );
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

  test("no TODO(operator) in the copy files (W12: the Hebrew was read, D-HEBREW-REVIEW)", () => {
    const copy = (f: string) =>
      readFileSync(join(process.cwd(), "src", "content", "copy", f), "utf8");
    for (const f of ["en.ts", "he.ts", "index.ts"])
      expect(copy(f), f).not.toContain("TODO(operator)");
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
  /** W10: the standard stated right (IS 5568 Part 1 is WCAG 2.0 with national changes, not 2.1),
   *  the WCAG 2.2 AA check and its date, the videos' captions and step lists, the contact. */
  const CHECKED = "2026-11-07";
  for (const s of [
    {
      path: "/accessibility/",
      standard:
        "This site is built to meet Israeli Standard 5568 Part 1 (2023), at its AA level (WCAG 2.0 with national changes)",
      wcag22: "it is also tested against WCAG 2.2 AA",
      date: "Every page was last checked on 7 November 2026.",
      videos: "Each has captions in English and in Hebrew",
      videosPage: "/videos/",
      wrong: [/based on the same guidelines/i, /WCAG\) 2\.1/, /not published yet/i],
      coordinator:
        "There is no accessibility coordinator: the regulations ask for one only of service providers with 25 or more employees, and we have fewer than 25.",
      review:
        "The latest accessibility review of this site is the automated check of 7 November 2026",
      manual: /manual (?:accessibility )?review (?:was|of)|reviewed manually|screen reader review/i,
    },
    {
      path: "/he/accessibility/",
      standard:
        "האתר בנוי לפי התקן הישראלי ת״י 5568 חלק 1 (2023), ברמת AA שלו (הנחיות WCAG 2.0 עם השינויים הלאומיים)",
      wcag22: "האתר נבדק גם מול WCAG 2.2 ברמת AA.",
      date: "כל דפי האתר נבדקו לאחרונה ב־7 בנובמבר 2026.",
      videos: "לכל סרטון יש כתוביות בעברית ובאנגלית",
      videosPage: "/he/videos/",
      wrong: [/מבוסס על אותן הנחיות/, /WCAG 2\.1/, /עוד לא פורסמו/],
      coordinator:
        "אין לנו רכז נגישות: התקנות מחייבות רכז רק אצל נותני שירות שמעסיקים 25 עובדים או יותר, ואצלנו עובדים פחות מ־25.",
      review: "סקירת הנגישות האחרונה של האתר היא הבדיקה האוטומטית מ־7 בנובמבר 2026",
      manual: /סקירה ידנית|בדיקה ידנית/,
    },
  ]) {
    test(`${s.path} states IS 5568 Part 1 (2023) and the WCAG 2.2 check, with its date`, async ({
      page,
    }) => {
      await page.goto(s.path);
      const text = await page.evaluate(() => document.body.innerText);
      expect(text).toContain(s.standard);
      expect(text).toContain(s.wcag22);
      expect(text).toContain(s.date);
      await expect(page.locator(`main time[datetime="${CHECKED}"]`)).toHaveCount(2);
      for (const w of s.wrong) expect(text).not.toMatch(w);
    });

    test(`${s.path} lists the adjustments, the videos' captions and step lists, and the contact`, async ({
      page,
    }) => {
      await page.goto(s.path);
      const text = await page.evaluate(() => document.body.innerText);
      expect(text).toContain(s.videos);
      await expect(page.locator(`main .prose a[href="${s.videosPage}"]`)).toHaveCount(1);
      // The adjustments (regulation 35ה): one list of eleven, the WCAG 2.2 ones among them.
      const items = page.locator("main h2 + ul").first().locator("li");
      await expect(items).toHaveCount(11);
      // The contact for reporting a problem, and (W12, D-COORDINATOR) no coordinator: fewer than
      // 25 employees, so requests go to that address.
      await expect(page.locator('main a[href^="mailto:"]')).toHaveCount(1);
      expect(text).toContain(s.coordinator);
      expect(text).not.toContain("TODO(operator)");
    });

    test(`${s.path}: the latest review is the automated check of 7 November 2026 (W12)`, async ({
      page,
    }) => {
      await page.goto(s.path);
      const text = await page.evaluate(() => document.body.innerText);
      expect(text).toContain(s.review);
      // Not claimed: a manual review (none was done; it stays on docs/go-public.md).
      expect(text).not.toMatch(s.manual);
    });
  }

  test("W12: the statement and the privacy notice carry the same date in both languages", async ({
    page,
  }) => {
    for (const which of ["accessibility", "privacy"]) {
      const dates: string[] = [];
      for (const path of [`/${which}/`, `/he/${which}/`]) {
        await page.goto(path);
        dates.push((await page.locator(".longform-updated time").getAttribute("datetime")) ?? "");
      }
      expect(dates[0], which).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(dates[1], which).toBe(dates[0]);
    }
  });

  test("W10: the long-form pages' lists show their markers (preflight removed them)", async ({
    page,
  }) => {
    for (const path of ["/accessibility/", "/he/accessibility/", "/security/", "/he/privacy/"]) {
      await page.goto(path);
      const types = await page
        .locator("main .prose ul:not([class]):not([role])")
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).listStyleType));
      expect(types.length, path).toBeGreaterThan(0);
      expect(new Set(types), path).toEqual(new Set(["disc"]));
    }
  });
});

test.describe("the privacy notice (W12, D-PRIVACY-FACTS)", () => {
  /** The operator's answers of 2026-11-07, as the page states them, and what must be gone. */
  for (const s of [
    {
      path: "/privacy/",
      facts: [
        "We take messages by email only; this site has no form.",
        "what you put in the email is what we receive",
        "Cloudflare delivers this site to you.",
        "Cloudflare processes your IP address and the details of your requests",
        "Our own servers keep access logs, which may include IP addresses. We keep them for at most 30 days.",
        "We keep your messages for 12 months after the last message, and then delete them.",
        "You can ask to see, correct or delete what you sent us.",
      ],
      gone: [/design[- ]partner/i, /legal review/i, /static host/i],
    },
    {
      path: "/he/privacy/",
      facts: [
        "פונים אלינו רק בדוא״ל — באתר אין טופס.",
        "מה שיופיע בהודעה הוא מה שנקבל",
        "האתר מגיע אליכם דרך Cloudflare.",
        "Cloudflare מעבדת את כתובת ה־IP שלכם ואת פרטי הבקשות שלכם",
        "השרתים שלנו שומרים יומני גישה, ויכולות להופיע בהם כתובות IP. אנחנו שומרים אותם 30 יום לכל היותר.",
        "אנחנו שומרים את ההודעות שלכם 12 חודשים מההודעה האחרונה, ואז מוחקים אותן.",
        "אפשר לבקש לראות את מה ששלחתם לנו, לתקן אותו או למחוק אותו.",
      ],
      gone: [/design[- ]partner/i, /שותפ(?:י|ים|ות)? (?:ה)?פיתוח/, /legal review/i],
    },
  ]) {
    test(`${s.path} states the answers and nothing of the old notice`, async ({ page }) => {
      await page.goto(s.path);
      const text = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, " ");
      for (const fact of s.facts) expect(text, fact).toContain(fact);
      for (const g of s.gone) expect(text).not.toMatch(g);
      // Cloudflare's own policy, as a plain link (no request: tests/origins.spec.ts allows it here).
      await expect(
        page.locator('main a[href="https://www.cloudflare.com/privacypolicy/"]'),
      ).toHaveCount(1);
      // The rights section's address, and the two pages whose buttons open the template.
      await expect(page.locator('main a[href^="mailto:"]')).toHaveCount(1);
      const prefix = s.path.startsWith("/he/") ? "/he" : "";
      await expect(page.locator(`main a[href="${prefix}/pilot/#apply"]`)).toHaveCount(1);
      await expect(page.locator(`main a[href="${prefix}/contact/"]`)).toHaveCount(1);
    });
  }
});
