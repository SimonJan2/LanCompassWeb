/**
 * W8: the release notes. The English notes are the product's (src/content/changelog/en, written
 * by scripts/sync-changelog.mjs from CHANGELOG.md at the release tag); the Hebrew pages are
 * summaries written natively (src/content/changelog/he, DECISIONS.md D-NOTES-HE). The order and
 * the one-sentence summaries come from src/content/releases.json, newest first.
 */
import { getCollection, type CollectionEntry } from "astro:content";
import { defaultLocale, sectionPath, sectionPaths, type Locale, type LocalePaths } from "../i18n";
import { releases, type Release } from "./releases";

export type ReleaseNotes = CollectionEntry<"changelog">;

/** A release with its notes in a locale, for the index, the pages and the feeds. */
export interface ReleaseEntry {
  release: Release;
  notes: ReleaseNotes;
  /** The English notes, which the Hebrew page summarises (and links). */
  english: ReleaseNotes;
}

/** Every release that has notes, newest first (the order of releases.json). */
export async function releaseEntries(locale: Locale): Promise<ReleaseEntry[]> {
  const all = await getCollection("changelog");
  const find = (code: Locale, version: string) => all.find((e) => e.id === `${code}/${version}`);
  const out: ReleaseEntry[] = [];
  for (const release of releases) {
    const english = find(defaultLocale, release.version);
    const notes = find(locale, release.version);
    if (!english || !notes) continue;
    if (notes.data.version !== release.version || notes.data.date !== release.date) {
      throw new Error(
        `src/content/changelog/${locale}/${release.version}.md: version or date differs from releases.json`,
      );
    }
    out.push({ release, notes, english });
  }
  return out;
}

/** A release page's path: `/changelog/0.7.0/`, `/he/changelog/0.7.0/`. */
export function releasePath(locale: Locale, version: string): string {
  return sectionPath(locale, "changelog", version);
}

/** A release page's twins, for hreflang and the language switcher. */
export function releasePaths(version: string): LocalePaths {
  return sectionPaths("changelog", version);
}

/** The feed of a locale: `/changelog/feed.xml`, `/he/changelog/feed.xml`. */
export function feedPath(locale: Locale): string {
  return `${sectionPath(locale, "changelog")}feed.xml`;
}

/** The one-sentence summary of a release in a locale (releases.json, summary_en / summary_he). */
export function releaseSummary(release: Release, locale: Locale): string {
  return locale === "he" ? release.summary_he : release.summary_en;
}

/** An ISO date as the page's language writes it: "6 November 2026" / "6 בנובמבר 2026". */
export function longDate(iso: string, locale: Locale): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
