/**
 * W9: the product's built-in docs on the site (src/content/docs/<locale>/<slug>.md, written by
 * scripts/sync-docs.mjs from an archive of the release tag): the articles of a locale in the
 * product's order, grouped by its seven categories, with their paths and neighbours.
 *
 * The test builds (scripts/build-test.mjs) set LANCOMPASS_DOCS_FIXTURES to a folder of fixture
 * articles (tests/fixtures/docs/<locale>/*.md) so the stale-translation notice, which no 0.7.0
 * page needs today, is rendered and tested; a real build never reads it.
 */
import type { MarkdownHeading } from "astro";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import { getCollection, render } from "astro:content";
import { sectionPath, sectionPaths, type Locale, type LocalePaths } from "../i18n";

/** The product's seven categories, in its order (registry.json at the tag). */
export const docsCategories = [
  "getting-started",
  "how-to",
  "ipam",
  "inventory",
  "integrations",
  "operations",
  "system",
] as const;
export type DocsCategory = (typeof docsCategories)[number];

export interface DocData {
  title: string;
  description: string;
  category: DocsCategory;
  keywords?: string | undefined;
  version: string;
  order: number;
  stale?: boolean | undefined;
}

/** One article in one locale. */
export interface DocPage {
  slug: string;
  locale: Locale;
  data: DocData;
  /** The article has code (the mono face), and Hebrew letters in its first screen (its opening
   *  1,500 characters: the Hebrew face): the layout preloads the faces the first screen needs,
   *  so they arrive before the first paint (no font swap shifting it). */
  fonts: { mono: boolean; hebrewEarly: boolean };
  load: () => Promise<{ Content: AstroComponentFactory; headings: MarkdownHeading[] }>;
}

interface FixtureModule {
  frontmatter: DocData;
  Content: AstroComponentFactory;
  getHeadings: () => MarkdownHeading[];
}

const fixtureModules = import.meta.glob<FixtureModule>("../../tests/fixtures/docs/*/*.md");

/** The articles of a locale, in the product's order. */
export async function docPages(locale: Locale): Promise<DocPage[]> {
  const entries = (await getCollection("docs")).filter((e) => e.id.startsWith(`${locale}/`));
  const fontsOf = (body: string) => ({
    mono: body.includes("`"),
    hebrewEarly: /[א-ת]/.test(body.slice(0, 1500)),
  });
  const pages: DocPage[] = entries.map((e) => ({
    slug: e.id.slice(locale.length + 1),
    locale,
    data: e.data,
    fonts: fontsOf(e.body ?? ""),
    load: async () => {
      const { Content, headings } = await render(e);
      return { Content, headings };
    },
  }));
  if (process.env["LANCOMPASS_DOCS_FIXTURES"] === "1") {
    for (const [path, load] of Object.entries(fixtureModules)) {
      const m = /\/fixtures\/docs\/([a-z]{2})\/([\w-]+)\.md$/.exec(path);
      if (!m || m[1] !== locale) continue;
      const mod = await load();
      pages.push({
        slug: m[2]!,
        locale,
        data: mod.frontmatter,
        fonts: { mono: false, hebrewEarly: true },
        load: async () => ({ Content: mod.Content, headings: mod.getHeadings() }),
      });
    }
  }
  return pages.sort((a, b) => a.data.order - b.data.order || a.slug.localeCompare(b.slug));
}

/** The articles grouped by category, in the product's category order. */
export function byCategory(pages: DocPage[]): { category: DocsCategory; pages: DocPage[] }[] {
  return docsCategories
    .map((category) => ({ category, pages: pages.filter((p) => p.data.category === category) }))
    .filter((g) => g.pages.length > 0);
}

const escapeHtml = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * A product title or description shown in the site's own chrome (the index, the navigation,
 * the pager, "On this page"), as HTML: escaped, and on a Hebrew page each Latin run in <bdi>
 * (the site's rule, docs/copy/he-voice.md) in place of the product's isolate marks. The
 * article text itself is never touched.
 */
export function chromeHtml(text: string, locale: Locale): string {
  const raw = text.replace(/[⁦⁧⁨⁩]/g, "");
  if (locale !== "he") return escapeHtml(raw);
  return raw
    .split(/([A-Za-z](?:[A-Za-z0-9 .:/+#&_-]*[A-Za-z0-9.+#])?)/)
    .map((part, i) => (i % 2 ? `<bdi>${escapeHtml(part)}</bdi>` : escapeHtml(part)))
    .join("");
}

/** An article's path: `/docs/topology/`, `/he/docs/topology/`. */
export function docPath(locale: Locale, slug: string): string {
  return sectionPath(locale, "docs", slug);
}

/** An article's twins, for hreflang and the language switcher. */
export function docPaths(slug: string): LocalePaths {
  return sectionPaths("docs", slug);
}

/** The previous and next articles within the same category. */
export function neighbours(
  pages: DocPage[],
  page: DocPage,
): { previous?: DocPage; next?: DocPage } {
  const same = pages.filter((p) => p.data.category === page.data.category);
  const i = same.findIndex((p) => p.slug === page.slug);
  return {
    ...(i > 0 ? { previous: same[i - 1]! } : {}),
    ...(i >= 0 && i < same.length - 1 ? { next: same[i + 1]! } : {}),
  };
}
