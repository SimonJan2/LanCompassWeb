import raw from "../content/fingerprints.json";

/** One release-signing key, as published on /security#verification. */
export interface Fingerprint {
  kid: string;
  purpose: string;
  sha256: string;
}

const SHA256 = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$|^[0-9a-f]{64}$/i;

function isFingerprint(value: unknown): value is Fingerprint {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["kid"] === "string" &&
    v["kid"] !== "" &&
    typeof v["purpose"] === "string" &&
    v["purpose"] !== "" &&
    typeof v["sha256"] === "string" &&
    SHA256.test(v["sha256"])
  );
}

/** Keys from `src/content/fingerprints.json`. A malformed entry fails the build. */
export function getFingerprints(): Fingerprint[] {
  const list: unknown[] = Array.isArray(raw) ? raw : [];
  return list.map((entry, index) => {
    if (!isFingerprint(entry)) {
      throw new Error(
        `src/content/fingerprints.json entry ${index} needs kid, purpose and a SHA-256 fingerprint`,
      );
    }
    return entry;
  });
}
