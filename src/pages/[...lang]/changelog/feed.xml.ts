/**
 * W8: the release notes as an Atom 1.0 feed per language, generated at build:
 * /changelog/feed.xml (xml:lang="en") and /he/changelog/feed.xml (xml:lang="he"). One entry per
 * release, newest first: its page's absolute URL (from PUBLIC_SITE_URL) as id and link, the
 * release date as `updated` (RFC 3339), the one-sentence summary. No third-party feed service.
 * nginx and public/_headers serve it as application/atom+xml.
 */
import type { APIRoute, GetStaticPaths } from "astro";
import { getCopy } from "../../../content/copy";
import { absoluteUrl, localeStaticPaths, locales, sectionPath, type Locale } from "../../../i18n";
import { feedPath, releaseEntries, releasePath, releaseSummary } from "../../../lib/changelog";

export const getStaticPaths = (() => localeStaticPaths()) satisfies GetStaticPaths;

const xml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
/** The summaries may carry inline markup (<bdi>, <code>): a text summary has none. */
const text = (s: string) => s.replace(/<[^>]+>/g, "");
/** A release date as an RFC 3339 timestamp (the release day, 00:00 UTC). */
const rfc3339 = (iso: string) => `${iso}T00:00:00Z`;

export const GET: APIRoute = async ({ props }) => {
  const { locale } = props as { locale: Locale };
  const c = getCopy(locale).changelog;
  const lang = locales[locale].htmlLang;
  const entries = await releaseEntries(locale);
  const index = absoluteUrl(sectionPath(locale, "changelog"));
  const updated = entries[0] ? rfc3339(entries[0].release.date) : rfc3339("1970-01-01");
  const lines = [
    '<?xml version="1.0" encoding="utf-8"?>',
    `<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${lang}">`,
    `  <title>${xml(c.feedTitle)}</title>`,
    `  <subtitle>${xml(c.feedSubtitle)}</subtitle>`,
    `  <id>${xml(index)}</id>`,
    `  <link rel="self" type="application/atom+xml" href="${xml(absoluteUrl(feedPath(locale)))}"/>`,
    `  <link rel="alternate" type="text/html" hreflang="${lang}" href="${xml(index)}"/>`,
    `  <updated>${updated}</updated>`,
    "  <author><name>LanCompass</name></author>",
  ];
  for (const { release } of entries) {
    const url = absoluteUrl(releasePath(locale, release.version));
    lines.push(
      "  <entry>",
      `    <title>LanCompass ${xml(release.version)}</title>`,
      `    <id>${xml(url)}</id>`,
      `    <link rel="alternate" type="text/html" hreflang="${lang}" href="${xml(url)}"/>`,
      `    <updated>${rfc3339(release.date)}</updated>`,
      `    <summary type="text">${xml(text(releaseSummary(release, locale)))}</summary>`,
      "  </entry>",
    );
  }
  lines.push("</feed>", "");
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "application/atom+xml; charset=utf-8" },
  });
};
