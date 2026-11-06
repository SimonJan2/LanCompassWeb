import data from "../content/releases.json";
import type { Locale } from "../i18n/locales";

/** A product release, from src/content/releases.json (newest first). */
export interface Release {
  version: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** The git tag, or null for a release that was never tagged (0.5.0). */
  tag: string | null;
  commit: string;
  /** The first line of the release's CHANGELOG.md section. */
  title: string;
  /** Its row in docs/claims.md. */
  claim: string;
}

export const releases: readonly Release[] = data.releases;

/** The newest release: every "current release" mention on the site reads this. */
export const latestRelease: Release = releases[0]!;

/** A release date in the page's language, e.g. "6 November 2026" / "6 בנובמבר 2026". */
export function releaseDate(release: Release, locale: Locale): string {
  const [y, m, d] = release.date.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
