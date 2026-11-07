import data from "../content/releases.json";
import type { Locale } from "../i18n/locales";

/** A file of a release, as /verify/ lists it: its name, its size in bytes and its SHA-256. */
export interface ReleaseFile {
  file: string;
  bytes: number;
  /** Lower-case hex, as sha256sum prints it. */
  sha256: string;
}

/** The signed offline bundle of a release (W6), read from the bundle by command. */
export interface ReleaseBundle extends ReleaseFile {
  /** The bundle's `.sha256` file, the second file a pilot receives. */
  checksumFile: ReleaseFile;
  /** The folder `tar -xzf` creates. */
  folder: string;
  signed: boolean;
  /** The id of the key that signed it (src/content/fingerprints.json). */
  key: string;
  claim: string;
}

/** The release's software bill of materials (W6, DECISIONS.md D-SBOM). */
export interface ReleaseSbom extends ReleaseFile {
  format: string;
  components: number;
  claim: string;
}

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
  /** W8: the notes' first sentence (scripts/sync-changelog.mjs derives it; tests compare). */
  summary_en: string;
  /** W8: the same sentence, written in Hebrew (docs/copy/he-review.md). */
  summary_he: string;
  /** W8: the summaries' row in docs/claims.md. */
  summaryClaim: string;
  bundle?: ReleaseBundle;
  sbom?: ReleaseSbom;
}

export const releases: readonly Release[] = data.releases;

/** The newest release: every "current release" mention on the site reads this. */
export const latestRelease: Release = releases[0]!;

/** A release by version, for the key history (src/content/fingerprints.json). */
export function releaseByVersion(version: string): Release | undefined {
  return releases.find((r) => r.version === version);
}

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

/** Bytes with thousands separators in Western digits, in both locales: 369,470,438. */
export function formatBytes(bytes: number): string {
  return new Intl.NumberFormat("en-US").format(bytes);
}
