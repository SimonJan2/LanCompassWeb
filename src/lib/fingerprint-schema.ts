import type { Locale } from "../i18n/locales";

/**
 * One signing key the site publishes (src/content/fingerprints.json), with its history: the
 * release key on /verify/ and /security#verification (W6, DECISIONS.md D-FINGERPRINTS).
 * Kept apart from fingerprints.ts (which imports the JSON) so tests/verify.spec.ts can check
 * the parser on its own.
 */
export interface Fingerprint {
  /** A short stable slug, used as the anchor (`#key-release`). */
  id: string;
  /** The key id the product shows, for licence keys; the release key has none. */
  kid?: string;
  label: Record<Locale, string>;
  purpose: Record<Locale, string>;
  /** SHA-256 of the DER public key, upper case and colon-separated, as install.sh prints it. */
  sha256: string;
  /** The first release whose bundle this key signed. */
  firstRelease: string;
  /** The last release it signed, once retired; null while it is the active key. */
  lastRelease: string | null;
  /** Its row in docs/claims.md. */
  claim: string;
}

/** The form install.sh §1b prints: 32 upper-case hex pairs joined by colons. */
export const FINGERPRINT = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/;
const SLUG = /^[a-z][a-z0-9-]*$/;
const VERSION = /^\d+\.\d+\.\d+$/;
const CLAIM = /^C-[A-Z]+-\d+$/;

const text = (v: unknown) => typeof v === "string" && v.trim() !== "";
const localized = (v: unknown) =>
  typeof v === "object" &&
  v !== null &&
  text((v as Record<string, unknown>)["en"]) &&
  text((v as Record<string, unknown>)["he"]);

function isFingerprint(value: unknown): value is Fingerprint {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const last = v["lastRelease"];
  return (
    typeof v["id"] === "string" &&
    SLUG.test(v["id"]) &&
    (v["kid"] === undefined || text(v["kid"])) &&
    localized(v["label"]) &&
    localized(v["purpose"]) &&
    typeof v["sha256"] === "string" &&
    FINGERPRINT.test(v["sha256"]) &&
    typeof v["firstRelease"] === "string" &&
    VERSION.test(v["firstRelease"]) &&
    (last === null || (typeof last === "string" && VERSION.test(last))) &&
    typeof v["claim"] === "string" &&
    CLAIM.test(v["claim"])
  );
}

/** Parses the file's contents. A malformed entry, or two entries with one id, fails the build. */
export function parseFingerprints(raw: unknown): Fingerprint[] {
  if (!Array.isArray(raw)) throw new Error("src/content/fingerprints.json must be an array");
  const seen = new Set<string>();
  return raw.map((entry, index) => {
    if (!isFingerprint(entry)) {
      throw new Error(
        `src/content/fingerprints.json entry ${index} needs id, label and purpose (en, he), a SHA-256 fingerprint as AA:BB:…, firstRelease, lastRelease and claim`,
      );
    }
    if (seen.has(entry.id)) {
      throw new Error(`src/content/fingerprints.json: the id "${entry.id}" is used twice`);
    }
    seen.add(entry.id);
    return entry;
  });
}
