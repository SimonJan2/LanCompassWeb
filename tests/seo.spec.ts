import { join, relative } from "node:path";
import { expect, test } from "@playwright/test";
import { builtHtml, siteBase, siteProject } from "./helpers";

/**
 * W10: what machines read — structured data, canonical URLs and robots.txt. Read from the light
 * test build (the markup does not depend on the theme; playwright.config.ts runs it in the light
 * project only).
 *
 *  - Every JSON-LD block on every built page parses, names schema.org and has a @type.
 *  - The home, in both locales, is a SoftwareApplication with applicationCategory
 *    BusinessApplication and the newest softwareVersion (Google supports the category; W2 §7.9).
 *  - Every docs article carries a BreadcrumbList: LanCompass → Docs → the article, absolute URLs.
 *  - Nowhere: offers, ratings, reviews or FAQ markup, in JSON-LD or microdata — the site has no
 *    price and no rating, and invents neither (W2 research §7.9; FAQ results ended in 2026).
 *  - Every public page's canonical, og:url and og:image are absolute, and og:url is the canonical.
 *  - robots.txt names its groups (DECISIONS.md D-CRAWLERS), allows everything, lists the sitemap.
 */
const LD = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;

type Node = Record<string, unknown> & { "@type"?: string; "@context"?: string };

const pagesOf = () => builtHtml(join(process.cwd(), siteProject().dist));
const blocksOf = (html: string): Node[] =>
  [...html.matchAll(LD)].flatMap((m) => {
    const ld = JSON.parse(m[1]!) as Node | Node[];
    return Array.isArray(ld) ? ld : [ld];
  });
/** A built page that is not a page of its own: the 404s and W7's redirect pages. */
const isStub = (file: string, html: string) =>
  /\/404\.html$/.test(file) || html.includes('<meta http-equiv="refresh"');

test.describe("structured data (W10)", () => {
  test("every JSON-LD block parses, names schema.org and has a type", () => {
    let blocks = 0;
    for (const { file, html } of pagesOf()) {
      for (const m of html.matchAll(LD)) {
        blocks++;
        let ld: Node | Node[];
        try {
          ld = JSON.parse(m[1]!) as Node | Node[];
        } catch (e) {
          throw new Error(`${file}: JSON-LD does not parse (${String(e)})`);
        }
        for (const node of Array.isArray(ld) ? ld : [ld]) {
          expect(node["@context"], file).toBe("https://schema.org");
          expect(node["@type"], file).toMatch(/^[A-Z][A-Za-z]+$/);
        }
      }
    }
    expect(blocks).toBeGreaterThan(160);
  });

  test("the home is a SoftwareApplication: BusinessApplication, the newest version", () => {
    const dist = join(process.cwd(), siteProject().dist);
    const pages = pagesOf().map((p) => ({ ...p, rel: relative(dist, p.file) }));
    for (const home of ["index.html", "he/index.html"]) {
      const page = pages.find((p) => p.rel === home)!;
      const apps = blocksOf(page.html).filter((n) => n["@type"] === "SoftwareApplication");
      expect(apps, home).toHaveLength(1);
      expect(apps[0]!["applicationCategory"]).toBe("BusinessApplication");
      expect(apps[0]!["softwareVersion"]).toMatch(/^\d+\.\d+\.\d+$/);
      expect(apps[0]!["name"]).toBe("LanCompass");
    }
    // No other page claims to be the application.
    const others = pages.filter(
      (p) =>
        !["index.html", "he/index.html"].includes(p.rel) &&
        blocksOf(p.html).some((n) => n["@type"] === "SoftwareApplication"),
    );
    expect(others.map((p) => p.rel)).toEqual([]);
  });

  test("every docs article has a BreadcrumbList: LanCompass → Docs → the article", () => {
    const base = siteBase();
    const articles = pagesOf().filter(({ file }) => /\/docs\/[a-z0-9-]+\/index\.html$/.test(file));
    expect(articles).toHaveLength(130);
    for (const { file, html } of articles) {
      const he = /\/he\/docs\//.test(file);
      const crumbs = blocksOf(html).filter((n) => n["@type"] === "BreadcrumbList");
      expect(crumbs, file).toHaveLength(1);
      const items = crumbs[0]!["itemListElement"] as {
        "@type": string;
        position: number;
        name: string;
        item: string;
      }[];
      expect(items.map((i) => i.position)).toEqual([1, 2, 3]);
      expect(items.every((i) => i["@type"] === "ListItem" && i.name.trim() !== "")).toBe(true);
      expect(items[0]!.item).toBe(`${base}${he ? "/he/" : "/"}`);
      expect(items[1]!.name).toBe(he ? "תיעוד" : "Docs");
      expect(items[1]!.item).toBe(`${base}${he ? "/he" : ""}/docs/`);
      const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
      expect(items[2]!.item, file).toBe(canonical);
      // The article's name is its title, as the page's <title> starts with it.
      const title = (html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
      expect(title.startsWith(`${items[2]!.name} — `), file).toBe(true);
    }
  });

  test("no offers, ratings, reviews or FAQ markup anywhere", () => {
    const never =
      /"(offers|aggregateRating|review|reviewRating|price|priceCurrency)"\s*:|"@type"\s*:\s*"(FAQPage|Question|Answer|Offer|AggregateRating|Review|Product)"/;
    const microdata =
      /\sitem(?:type|prop)=["'][^"']*(FAQPage|Offer|AggregateRating|Review|offers|aggregateRating|review)/;
    const offenders: string[] = [];
    for (const { file, html } of pagesOf()) {
      for (const m of html.matchAll(LD)) if (never.test(m[1]!)) offenders.push(`${file}: JSON-LD`);
      if (microdata.test(html)) offenders.push(`${file}: microdata`);
    }
    expect(offenders).toEqual([]);
  });

  test("every public page: canonical, og:url and og:image absolute; og:url is the canonical", () => {
    const base = siteBase();
    let pages = 0;
    for (const { file, html } of pagesOf()) {
      if (isStub(file, html)) continue;
      pages++;
      const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? "";
      const ogUrl = html.match(/<meta property="og:url" content="([^"]+)"/)?.[1] ?? "";
      const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1] ?? "";
      expect(canonical, file).toMatch(new RegExp(`^${base.replace(/[.:/]/g, "\\$&")}/`));
      expect(ogUrl, file).toBe(canonical);
      expect(ogImage, file).toMatch(
        new RegExp(`^${base.replace(/[.:/]/g, "\\$&")}/og/(en|he)/[\\w-]+\\.png$`),
      );
      expect(html.match(/<link rel="canonical"/g), file).toHaveLength(1);
    }
    expect(pages).toBe(162);
  });
});

test.describe("robots.txt (W10, D-CRAWLERS)", () => {
  test("names the search, user and training agents, allows every one, lists the sitemap", async ({
    request,
  }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/plain");
    const text = await res.text();
    const groups = text
      .split(/\n\s*\n/)
      .map((g) => g.split("\n").filter((l) => l && !l.startsWith("#")))
      .filter((g) => g.some((l) => l.startsWith("User-agent:")));
    const agents = (g: string[]) =>
      g.filter((l) => l.startsWith("User-agent:")).map((l) => l.slice(11).trim());
    const all = groups.flatMap(agents);
    for (const name of [
      "OAI-SearchBot",
      "ChatGPT-User",
      "Claude-SearchBot",
      "Claude-User",
      "GPTBot",
      "ClaudeBot",
      "Google-Extended",
      "*",
    ]) {
      expect(all, name).toContain(name);
    }
    for (const g of groups) {
      expect(
        g.filter((l) => !l.startsWith("User-agent:")),
        agents(g).join(", "),
      ).toEqual(["Allow: /"]);
    }
    expect(text).not.toMatch(/^Disallow:/m);
    // The training group says it is the operator's choice.
    expect(text).toMatch(/operator's choice[\s\S]*User-agent: GPTBot/);
    expect(text).toContain(`Sitemap: ${siteBase()}/sitemap-index.xml`);
    expect(text).not.toMatch(/llms\.txt/);
  });
});
