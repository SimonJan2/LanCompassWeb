import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dropWaveNumbers, parseChangelog, sectionFacts } from "../scripts/sync-changelog.mjs";
import { releaseVersions, siteBase, siteProject } from "./helpers";

/**
 * W8: the release notes. The sync script and its text rule (run once, in the light project),
 * then the built pages in every theme: four releases per locale, the index newest first with
 * the latest marked, the Upgrading and Known issues anchors, previous/next, the Hebrew
 * summaries' completeness against the English notes, the feeds, axe.
 */

const root = process.cwd();
const fixture = join(root, "tests", "fixtures", "changelog");
const releases = JSON.parse(readFileSync(join(root, "src", "content", "releases.json"), "utf8"))
  .releases as {
  version: string;
  date: string;
  title: string;
  summary_en: string;
  summary_he: string;
}[];
const onceOnly = () => test.skip(test.info().project.name !== "light", "a source check: once");
const sync = (args: string[]) =>
  execFileSync("node", [join(root, "scripts", "sync-changelog.mjs"), ...args], {
    encoding: "utf8",
  });
const files = (dir: string) =>
  Object.fromEntries(
    readdirSync(dir)
      .sort()
      .map((f) => [f, readFileSync(join(dir, f), "utf8")]),
  );
/** The front matter's flat `key: value` lines of a synced file. */
const frontMatter = (text: string) =>
  Object.fromEntries(
    [...text.split("\n---\n")[0]!.matchAll(/^(\w+): (.*)$/gm)].map((m) => [m[1]!, m[2]!]),
  );

test.describe("the sync script (W8)", () => {
  test.beforeEach(onceOnly);

  test("a fixture changelog gives the expected files, and a second run changes nothing", () => {
    const out = mkdtempSync(join(tmpdir(), "lc-changelog-"));
    const args = [join(fixture, "CHANGELOG.md"), "--out", out, "--docs", join(fixture, "docs")];
    const first = sync(args);
    expect(first).toContain("FINISHED-sync-changelog 3 releases");
    expect(files(out)).toEqual(files(join(fixture, "expected")));
    const second = sync(args);
    expect(second.match(/\| unchanged \|/g)?.length).toBe(3);
    expect(second).not.toMatch(/\| (new|changed) \|/);
    expect(files(out)).toEqual(files(join(fixture, "expected")));
  });

  test("[Unreleased] is skipped; a doc reference stays text when the site has no such page", () => {
    const out = mkdtempSync(join(tmpdir(), "lc-changelog-"));
    sync([join(fixture, "CHANGELOG.md"), "--out", out, "--docs", join(out, "no-docs")]);
    expect(readdirSync(out).sort()).toEqual(["2.0.0.md", "2.0.1.md", "2.1.0.md"]);
    const text = readFileSync(join(out, "2.1.0.md"), "utf8");
    expect(text).toContain("**The guides:** Docs → Support → The pilot, and (Docs → First run).");
    expect(text).not.toContain("](/docs/");
    expect(text).not.toContain("Not released yet");
  });

  test("the wave-number pattern drops wave numbers and nothing else", () => {
    const cases: [string, string][] = [
      ["a host on its real port (v206–v207).", "a host on its real port."],
      ['the truth" (v206–v215), and its', 'the truth", and its'],
      ["The pilot-release arc (v196–v197, v65).", "The pilot-release arc."],
      ["Identity & design (v116–v122.1).", "Identity & design."],
      ["Every line says how old it is (v208).", "Every line says how old it is."],
      ["IPv6 (v47 compatible) stays", "IPv6 (v47 compatible) stays"],
      ["v68 (pre-launch cleanup) folded", "v68 (pre-launch cleanup) folded"],
      ["(17 of 17 links drawn, none false)", "(17 of 17 links drawn, none false)"],
      ["(B-AD-GROUPBASE, S2, partly fixed)", "(B-AD-GROUPBASE, S2, partly fixed)"],
      ["(`0113_connected_seen_at` →", "(`0113_connected_seen_at` →"],
      ["since 0.6.1 (`e01081d7`).", "since 0.6.1 (`e01081d7`)."],
    ];
    for (const [input, output] of cases) expect(dropWaveNumbers(input).text, input).toBe(output);
  });

  test("the site's notes match releases.json: title, date, summary, one file per release", () => {
    const dir = join(root, "src", "content", "changelog", "en");
    expect(readdirSync(dir).sort()).toEqual(releases.map((r) => `${r.version}.md`).sort());
    for (const r of releases) {
      const fm = frontMatter(readFileSync(join(dir, `${r.version}.md`), "utf8"));
      expect(JSON.parse(fm["version"]!), r.version).toBe(r.version);
      expect(JSON.parse(fm["date"]!), r.version).toBe(r.date);
      expect(JSON.parse(fm["title"]!), r.version).toBe(r.title);
      expect(JSON.parse(fm["summary"]!), r.version).toBe(r.summary_en);
      expect(r.summary_he, r.version).toMatch(/[א-ת]/);
    }
  });

  test("every Hebrew summary has the upgrade steps and as many known issues as the notes", () => {
    for (const r of releases) {
      const en = readFileSync(
        join(root, "src", "content", "changelog", "en", `${r.version}.md`),
        "utf8",
      );
      const he = readFileSync(
        join(root, "src", "content", "changelog", "he", `${r.version}.md`),
        "utf8",
      );
      const body = en.split("\n---\n").slice(1).join("\n---\n");
      const facts = sectionFacts(body);
      const heSection = (id: string) => {
        const start = he.indexOf(`{#${id}}`);
        if (start < 0) return null;
        const rest = he.slice(start);
        const end = rest.slice(1).search(/\n## /);
        return end < 0 ? rest : rest.slice(0, end + 1);
      };
      const items = (s: string | null) => (s ? (s.match(/^- /gm) ?? []).length : 0);
      const enItems = (heading: string) => {
        const part = body.split(`### ${heading}`)[1]?.split("\n### ")[0] ?? "";
        return (part.match(/^- /gm) ?? []).length;
      };
      expect(items(heSection("known-issues")), `${r.version} known issues`).toBe(facts.knownIssues);
      if (facts.upgradesFrom) {
        const id = `upgrading-from-${facts.upgradesFrom.replaceAll(".", "-")}`;
        expect(items(heSection(id)), `${r.version} upgrade steps`).toBe(
          enItems(`Upgrading from ${facts.upgradesFrom}`),
        );
      } else {
        expect(he.includes("{#upgrading"), r.version).toBe(false);
      }
      expect(he, r.version).toMatch(/^written: "\d{4}-\d{2}-\d{2}"$/m);
    }
  });

  test("the notes are the tag's sections: the parser finds four releases in the order given", () => {
    const text = releases.map((r) => `## [${r.version}] — ${r.date}\n\nText (v1).\n`).join("\n");
    expect(
      parseChangelog(`# Changelog\n\n## [Unreleased]\n\n${text}`).map((r) => r.version),
    ).toEqual(releases.map((r) => r.version));
  });
});

for (const locale of ["en", "he"] as const) {
  const prefix = locale === "en" ? "" : "/he";

  test.describe(`${locale}: the release notes (W8)`, () => {
    test(`${prefix}/changelog/ lists every release, newest first, the latest marked`, async ({
      page,
    }) => {
      const res = await page.goto(`${prefix}/changelog/`);
      expect(res?.status()).toBe(200);
      const items = page.locator(".cl-item");
      await expect(items).toHaveCount(releases.length);
      expect(
        await items.evaluateAll((els) => els.map((e) => e.getAttribute("data-release"))),
      ).toEqual(releaseVersions);
      await expect(page.locator(".cl-latest")).toHaveCount(1);
      await expect(items.first().locator(".cl-latest")).toHaveCount(1);
      for (const r of releases) {
        const item = page.locator(`.cl-item[data-release="${r.version}"]`);
        await expect(item.locator("time")).toHaveAttribute("datetime", r.date);
        await expect(item.locator(".cl-version a")).toHaveAttribute(
          "href",
          `${prefix}/changelog/${r.version}/`,
        );
        const summary = (await item.locator(".cl-summary").textContent())!.trim();
        expect(summary).toBe(
          (locale === "en" ? r.summary_en : r.summary_he).replace(/<[^>]+>/g, ""),
        );
      }
      await expect(
        page.locator('head link[rel="alternate"][type="application/atom+xml"]'),
      ).toHaveAttribute("href", `${prefix}/changelog/feed.xml`);
      const date = await items.first().locator("time").textContent();
      expect(date).toBe(locale === "en" ? "6 November 2026" : "6 בנובמבר 2026");
    });

    for (const version of releaseVersions) {
      test(`${prefix}/changelog/${version}/: header, at a glance, anchors, other releases`, async ({
        page,
        request,
      }) => {
        const res = await page.goto(`${prefix}/changelog/${version}/`);
        expect(res?.status()).toBe(200);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expect(page.locator("html")).toHaveAttribute("dir", locale === "en" ? "ltr" : "rtl");
        await expect(page.locator("h1")).toHaveText(`LanCompass ${version}`);
        for (const code of ["en", "he"]) {
          await expect(page.locator(`link[rel="alternate"][hreflang="${code}"]`)).toHaveAttribute(
            "href",
            `${siteBase()}${code === "en" ? "" : "/he"}/changelog/${version}/`,
          );
        }
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
          "href",
          `${siteBase()}${prefix}/changelog/${version}/`,
        );
        // At a glance comes before the notes, and its links land on headings of this page.
        const glance = page.locator(".cl-glance");
        await expect(glance).toHaveCount(1);
        const order = await page.evaluate(() => {
          const g = document.querySelector(".cl-glance");
          const n = document.querySelector(".cl-notes");
          return !!g && !!n && !!(g.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING);
        });
        expect(order).toBe(true);
        for (const href of await glance
          .locator("a[href^='#']")
          .evaluateAll((as) => as.map((a) => a.getAttribute("href")!))) {
          await expect(page.locator(`[id="${href.slice(1)}"]`), href).toHaveCount(1);
        }
        if (version === "0.7.0" || version === "0.6.0") {
          await expect(page.locator('h2[id^="upgrading"], h3[id^="upgrading"]')).toHaveCount(1);
          await expect(page.locator('[id="known-issues"]')).toHaveCount(1);
          await expect(glance.locator('a[href^="#upgrading"]')).toHaveCount(1);
          await expect(glance.locator('a[href="#known-issues"]')).toHaveCount(1);
        }
        // The newest release links /verify/; the others do not.
        await expect(page.locator(`.cl-verify a[href="${prefix}/verify/"]`)).toHaveCount(
          version === releaseVersions[0] ? 1 : 0,
        );
        // Newer and older releases, each a page that exists.
        const i = releaseVersions.indexOf(version);
        const others = page.locator(".cl-others");
        await expect(others.locator('a[rel="next"]')).toHaveCount(i > 0 ? 1 : 0);
        await expect(others.locator('a[rel="prev"]')).toHaveCount(
          i < releaseVersions.length - 1 ? 1 : 0,
        );
        if (i > 0)
          await expect(others.locator('a[rel="next"]')).toHaveAttribute(
            "href",
            `${prefix}/changelog/${releaseVersions[i - 1]}/`,
          );
        if (i < releaseVersions.length - 1)
          await expect(others.locator('a[rel="prev"]')).toHaveAttribute(
            "href",
            `${prefix}/changelog/${releaseVersions[i + 1]}/`,
          );
        for (const href of await others
          .locator("a")
          .evaluateAll((as) => as.map((a) => a.getAttribute("href")!))) {
          expect((await request.get(href)).status(), href).toBe(200);
        }
        // The language switcher lands on the same release's notes.
        const other = locale === "en" ? "he" : "en";
        await expect(page.locator(`footer [data-locale-link="${other}"]`)).toHaveAttribute(
          "href",
          `${other === "en" ? "" : "/he"}/changelog/${version}/`,
        );
        if (locale === "he") {
          // The Hebrew summary says the English notes are authoritative, when it was written,
          // and links them.
          const authority = page.locator(".cl-authority");
          await expect(authority).toContainText("הנוסח הקובע");
          await expect(authority.locator("a")).toHaveAttribute("href", `/changelog/${version}/`);
        }
      });
    }

    test(`${prefix}/changelog/: the Hebrew pages have every known issue and upgrade step`, async ({
      page,
    }) => {
      test.skip(locale === "en", "the Hebrew pages against the English");
      for (const version of releaseVersions) {
        await page.goto(`/changelog/${version}/`);
        const en = await page.evaluate(() => {
          const count = (id: string | null) => {
            if (!id) return 0;
            const h = document.getElementById(id);
            let n = h?.nextElementSibling;
            while (n && n.tagName !== "UL") n = n.nextElementSibling;
            return n ? n.querySelectorAll(":scope > li").length : 0;
          };
          const up = document.querySelector('h3[id^="upgrading"]')?.id ?? null;
          return {
            up,
            steps: count(up),
            known: count(document.getElementById("known-issues") ? "known-issues" : null),
          };
        });
        await page.goto(`/he/changelog/${version}/`);
        const he = await page.evaluate((up) => {
          const count = (id: string | null) => {
            if (!id) return 0;
            const h = document.getElementById(id);
            let n = h?.nextElementSibling;
            while (n && n.tagName !== "UL") n = n.nextElementSibling;
            return n ? n.querySelectorAll(":scope > li").length : 0;
          };
          return {
            steps: count(up),
            known: count(document.getElementById("known-issues") ? "known-issues" : null),
          };
        }, en.up);
        expect(he.steps, `${version} upgrade steps`).toBe(en.steps);
        expect(he.known, `${version} known issues`).toBe(en.known);
      }
    });

    test(`${prefix}/changelog/feed.xml is Atom with four entries, absolute ids, RFC 3339 dates`, async ({
      page,
      request,
    }) => {
      const res = await request.get(`${prefix}/changelog/feed.xml`);
      expect(res.status()).toBe(200);
      const xml = await res.text();
      await page.goto("/");
      const feed = await page.evaluate((text) => {
        const doc = new DOMParser().parseFromString(text, "application/xml");
        const err = doc.querySelector("parsererror");
        const root = doc.documentElement;
        const NS = "http://www.w3.org/2005/Atom";
        const entries = Array.from(doc.getElementsByTagNameNS(NS, "entry")).map((e) => ({
          id: e.getElementsByTagNameNS(NS, "id")[0]?.textContent ?? "",
          updated: e.getElementsByTagNameNS(NS, "updated")[0]?.textContent ?? "",
          link: e.getElementsByTagNameNS(NS, "link")[0]?.getAttribute("href") ?? "",
          summary: e.getElementsByTagNameNS(NS, "summary")[0]?.textContent ?? "",
        }));
        return {
          error: err ? err.textContent : null,
          name: root.localName,
          ns: root.namespaceURI,
          lang: root.getAttribute("xml:lang"),
          updated: doc.querySelector("feed > updated")?.textContent ?? "",
          entries,
        };
      }, xml);
      expect(feed.error).toBeNull();
      expect(feed.name).toBe("feed");
      expect(feed.ns).toBe("http://www.w3.org/2005/Atom");
      expect(feed.lang).toBe(locale);
      expect(feed.entries).toHaveLength(releases.length);
      const rfc3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
      expect(feed.updated).toMatch(rfc3339);
      feed.entries.forEach((e, i) => {
        const r = releases[i]!;
        expect(e.id).toBe(`${siteBase()}${prefix}/changelog/${r.version}/`);
        expect(e.link).toBe(e.id);
        expect(e.updated).toMatch(rfc3339);
        expect(e.updated.slice(0, 10)).toBe(r.date);
        expect(e.summary).toBe(
          (locale === "en" ? r.summary_en : r.summary_he).replace(/<[^>]+>/g, ""),
        );
      });
    });

    test(`${prefix}/changelog/ pages have zero axe violations at 390 and 1440 px`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      for (const path of [
        `${prefix}/changelog/`,
        `${prefix}/changelog/0.7.0/`,
        `${prefix}/changelog/0.6.1/`,
      ]) {
        for (const width of [390, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          await page.goto(path);
          const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
            .analyze();
          expect(
            results.violations.map(
              (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
            ),
            `${path} at ${width}px (${siteProject().theme}/${siteProject().scheme})`,
          ).toEqual([]);
        }
      }
    });
  });
}
