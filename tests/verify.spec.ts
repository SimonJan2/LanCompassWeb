import AxeBuilder from "@axe-core/playwright";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { FINGERPRINT, parseFingerprints } from "../src/lib/fingerprint-schema";
import { EXPIRES_DAYS, securityTxt } from "../src/lib/security-txt";
import { layOutInFull, pathFor, siteProject } from "./helpers";

/**
 * W6: /verify/ and /he/verify/, the release key on /security#verification, the SBOM file and
 * /.well-known/security.txt. In every theme project (playwright.config.ts → themed), both
 * locales; the source and unit checks run once, in the light project.
 *
 *  - The sections in the contract's order, axe clean.
 *  - The three steps show the exact command strings, built from releases.json; on /he/verify/
 *    every pre and code element is dir="ltr".
 *  - The fingerprint on /verify/ and on /security#verification equals fingerprints.json and has
 *    the installer's form; a malformed entry fails (parseFingerprints).
 *  - Sizes, SHA-256s and the SBOM's facts on the page equal releases.json; the SBOM is served
 *    from the site, and its SHA-256 equals the page's.
 *  - security.txt: in the test build (contact and site URL set) five fields, Expires ahead and
 *    under a year; with either missing no file (the flags build has no contact address).
 */

const root = process.cwd();
const read = (...p: string[]) => readFileSync(join(root, ...p), "utf8");
const releases = JSON.parse(read("src", "content", "releases.json")) as {
  releases: {
    version: string;
    date: string;
    bundle?: {
      file: string;
      bytes: number;
      sha256: string;
      checksumFile: { file: string; bytes: number; sha256: string };
      folder: string;
      key: string;
    };
    sbom?: { file: string; bytes: number; sha256: string; format: string; components: number };
  }[];
};
const latest = releases.releases[0]!;
const bundle = latest.bundle!;
const sbom = latest.sbom!;
const keys = parseFingerprints(JSON.parse(read("src", "content", "fingerprints.json")));
const releaseKey = keys.find((k) => k.id === bundle.key)!;
const grouped = (n: number) => new Intl.NumberFormat("en-US").format(n);

const SECTIONS = ["release", "files", "check", "release-key", "inside", "sbom", "upgrades", "get"];

test.describe("/verify/ (W6)", () => {
  for (const locale of ["en", "he"] as const) {
    const path = pathFor(locale, "verify");

    test(`${path}: the sections in order, axe clean`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(path);
      const ids = await page
        .locator("main section[id]")
        .evaluateAll((els) => els.map((el) => el.id));
      expect(ids).toEqual(SECTIONS);
      for (const id of SECTIONS) {
        await expect(page.locator(`section#${id} > h2`)).toHaveCount(1);
      }
      await expect(page.locator("#check ol > li")).toHaveCount(3);
      await layOutInFull(page);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
        .analyze();
      expect(results.violations.map((v) => v.id)).toEqual([]);
    });

    test(`${path}: the three steps print the exact commands and outputs`, async ({ page }) => {
      await page.goto(path);
      const run = await page.locator("#check pre[data-run]").allTextContents();
      expect(run).toEqual([
        `sha256sum -c ${bundle.checksumFile.file}`,
        `tar -xzf ${bundle.file}\ncd ${bundle.folder}\nsh install.sh`,
        "openssl pkeyutl -verify -pubin -inkey lancompass-release.pub -rawin -in SHA256SUMS -sigfile SHA256SUMS.sig\nopenssl pkey -pubin -in lancompass-release.pub -outform DER | sha256sum",
      ]);
      const expectText = await page.locator("#check pre[data-expect]").allTextContents();
      expect(expectText[0]).toBe(`${bundle.file}: OK`);
      expect(expectText[1]).toContain("Checksums OK.");
      expect(expectText[1]).toContain(
        `Signed by the key with SHA-256 fingerprint ${releaseKey.sha256} — compare it with INSTALL.md`,
      );
      expect(expectText[2]).toBe(
        `Signature Verified Successfully\n${releaseKey.sha256.replaceAll(":", "").toLowerCase()}  -`,
      );
      expect(expectText[3]).toBe(releaseKey.sha256);
      await expect(page.locator("#check pre[data-mismatch]")).toContainText(
        "Nothing was installed.",
      );
      // Selectable text, no copy buttons, no script of its own (X row).
      await expect(page.locator("main button")).toHaveCount(0);
      await expect(page.locator("main script")).toHaveCount(0);
      if (locale === "he") {
        const notLtr = await page.evaluate(() =>
          Array.from(document.querySelectorAll("main pre, main code"))
            .filter((el) => el.getAttribute("dir") !== "ltr")
            .map((el) => el.outerHTML.slice(0, 80)),
        );
        expect(notLtr).toEqual([]);
      }
    });

    test(`${path}: the release key equals fingerprints.json`, async ({ page }) => {
      await page.goto(path);
      const fp = page.locator(`#release-key [data-fingerprint="${releaseKey.id}"]`);
      await expect(fp).toHaveText(releaseKey.sha256);
      expect(releaseKey.sha256).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
      const history = page.locator("[data-key-history] tbody tr");
      await expect(history).toHaveCount(keys.filter((k) => k.kid === undefined).length);
      await expect(history.first()).toContainText(releaseKey.firstRelease);
      await expect(history.first().locator("code")).toHaveText(releaseKey.sha256);
    });

    test(`${path}: sizes, hashes and the SBOM's facts equal releases.json`, async ({
      page,
      request,
    }) => {
      await page.goto(path);
      await expect(page.locator("[data-release]")).toContainText(latest.version);
      await expect(page.locator("#release time")).toHaveAttribute("datetime", latest.date);
      const rows = page.locator("[data-release-files] tbody tr");
      await expect(rows).toHaveCount(3);
      for (const [i, f] of [bundle, bundle.checksumFile, sbom].entries()) {
        const row = rows.nth(i);
        await expect(row).toHaveAttribute("data-file", f.file);
        await expect(row.locator("[data-bytes]")).toHaveText(grouped(f.bytes));
        await expect(row.locator("[data-sha256]")).toHaveText(f.sha256);
      }
      await expect(page.locator("[data-sbom-components]")).toHaveAttribute(
        "data-sbom-components",
        String(sbom.components),
      );
      await expect(page.locator("#sbom")).toContainText(sbom.format);
      await expect(page.locator("#sbom")).toContainText(String(sbom.components));
      // The SBOM is served from the site, byte-identical: its SHA-256 is the page's.
      const href = await page.locator("[data-sbom-link]").getAttribute("href");
      expect(href).toBe(`/verify/${sbom.file}`);
      const res = await request.get(href!);
      expect(res.status()).toBe(200);
      const body = await res.body();
      expect(body.length).toBe(sbom.bytes);
      expect(createHash("sha256").update(body).digest("hex")).toBe(sbom.sha256);
      const doc = JSON.parse(body.toString("utf8")) as { specVersion: string; components: [] };
      expect(`CycloneDX ${doc.specVersion}`).toBe(sbom.format);
      expect(doc.components.length).toBe(sbom.components);
      // How to get the bundle: no link to a bundle file the site does not host.
      await expect(page.locator('a[href$=".tar.gz"], a[href$=".sha256"]')).toHaveCount(0);
      await expect(page.locator("[data-ask-bundle]")).toHaveAttribute(
        "href",
        /\/(pilot|contact)\//,
      );
    });

    test(`${pathFor(locale, "security")}#verification: the release key, linked to /verify/`, async ({
      page,
    }) => {
      await page.goto(pathFor(locale, "security"));
      const block = page.locator("#verification");
      await expect(block).toBeVisible();
      await expect(block.locator(`[data-fingerprint="${releaseKey.id}"]`)).toHaveText(
        releaseKey.sha256,
      );
      await expect(block.locator("a").last()).toHaveAttribute(
        "href",
        `${pathFor(locale, "verify")}#check`,
      );
      await expect(page.locator("#disclosure")).toHaveCount(1);
    });
  }
});

test.describe("security.txt and the fingerprint schema (W6, source checks)", () => {
  test.beforeEach(() => {
    test.skip(siteProject().theme !== "light", "a source and build check: once, in light");
  });

  test("the test build serves /.well-known/security.txt with the five fields", async ({
    request,
  }) => {
    const res = await request.get("/.well-known/security.txt");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/plain");
    const text = await res.text();
    const fields = Object.fromEntries(
      text
        .trim()
        .split("\n")
        .map((line) => [line.slice(0, line.indexOf(":")), line.slice(line.indexOf(":") + 2)]),
    );
    expect(Object.keys(fields)).toEqual([
      "Contact",
      "Expires",
      "Preferred-Languages",
      "Canonical",
      "Policy",
    ]);
    expect(fields["Contact"]).toBe("mailto:hello@example.com");
    expect(fields["Preferred-Languages"]).toBe("en, he");
    expect(fields["Canonical"]).toBe("http://127.0.0.1:4321/.well-known/security.txt");
    expect(fields["Policy"]).toBe("http://127.0.0.1:4321/security/#disclosure");
    expect(fields["Expires"]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    const expires = Date.parse(fields["Expires"]!);
    expect(expires).toBeGreaterThan(Date.now());
    expect(expires).toBeLessThan(Date.now() + 365 * 24 * 3600 * 1000);
  });

  test("with a value missing there is no security.txt (the flags build has no contact)", () => {
    expect(existsSync(join(root, "dist-test", ".well-known", "security.txt"))).toBe(true);
    expect(existsSync(join(root, "dist-test-flags", ".well-known", "security.txt"))).toBe(false);
    const now = new Date("2026-11-06T12:00:00Z");
    expect(securityTxt({ contactEmail: "", siteUrl: "https://example.com", now })).toBeNull();
    expect(securityTxt({ contactEmail: "a@example.com", siteUrl: "", now })).toBeNull();
    expect(securityTxt({ contactEmail: undefined, siteUrl: undefined, now })).toBeNull();
    const text = securityTxt({
      contactEmail: " a@example.com ",
      siteUrl: "https://example.com/",
      now,
    })!;
    expect(text).toContain("Contact: mailto:a@example.com\n");
    expect(text).toContain("Canonical: https://example.com/.well-known/security.txt\n");
    expect(text).toContain(
      `Expires: ${new Date(now.getTime() + EXPIRES_DAYS * 86400000).toISOString().replace(".000", "")}`,
    );
  });

  test("a malformed fingerprint entry fails the build", () => {
    const good = JSON.parse(read("src", "content", "fingerprints.json")) as Record<
      string,
      unknown
    >[];
    expect(parseFingerprints(good)).toHaveLength(good.length);
    expect(FINGERPRINT.test(good[0]!["sha256"] as string)).toBe(true);
    const bad = (patch: Record<string, unknown>) => () =>
      parseFingerprints([{ ...good[0], ...patch }]);
    expect(
      bad({ sha256: "c0470e92cef4f9dcecdc3523d58d2a82df8eb6730431e3adb247d6d217e5518d" }),
    ).toThrow();
    expect(bad({ sha256: (good[0]!["sha256"] as string).toLowerCase() })).toThrow();
    expect(bad({ id: "" })).toThrow();
    expect(bad({ label: { en: "Release key" } })).toThrow();
    expect(bad({ firstRelease: "0.6" })).toThrow();
    expect(bad({ claim: "nope" })).toThrow();
    expect(() => parseFingerprints([good[0], good[0]])).toThrow(/twice/);
    expect(() => parseFingerprints({})).toThrow();
  });
});
