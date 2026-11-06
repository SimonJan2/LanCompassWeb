import raw from "../content/fingerprints.json";
import { parseFingerprints, type Fingerprint } from "./fingerprint-schema";

export type { Fingerprint } from "./fingerprint-schema";

/** Keys from `src/content/fingerprints.json`, active first. A malformed entry fails the build. */
export function getFingerprints(): Fingerprint[] {
  return parseFingerprints(raw);
}

/** The key that signs the current bundles (the one entry without a last release). */
export function activeReleaseKey(): Fingerprint | undefined {
  return getFingerprints().find((key) => key.lastRelease === null && key.kid === undefined);
}
