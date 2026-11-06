import type { Fingerprint } from "./fingerprint-schema";
import type { ReleaseBundle } from "./releases";

/**
 * W6: the commands /verify/ prints and the output each one gives, built from the release's data
 * (src/content/releases.json) and the release key (src/content/fingerprints.json), so no file
 * name, hash or fingerprint on the page is typed by hand. The command lines are install.sh's
 * own (§1, §1b at v0.7.0) and INSTALL.md's (§2, §3); the outputs are what they print on the
 * 0.7.0 bundle (night C's report quotes each run).
 */
export interface VerifyStep {
  /** The lines to run, one command per line. */
  run: string[];
  /** The output to expect, line by line ("…" stands for lines left out). */
  expect: string[];
}

/** `C0:47:…` → `c047…`: the form `sha256sum` prints. */
export function hexFingerprint(fingerprint: string): string {
  return fingerprint.replaceAll(":", "").toLowerCase();
}

/** The first and last lines `sha256sum -c SHA256SUMS` prints inside a 0.7.0 bundle. */
const FIRST_FILE = ".env.example";
const LAST_FILE = "upgrade.sh";

export const OPENSSL_VERIFY =
  "openssl pkeyutl -verify -pubin -inkey lancompass-release.pub -rawin -in SHA256SUMS -sigfile SHA256SUMS.sig";
export const OPENSSL_FINGERPRINT =
  "openssl pkey -pubin -in lancompass-release.pub -outform DER | sha256sum";

export function verifySteps(bundle: ReleaseBundle, key: Fingerprint) {
  return {
    checksum: {
      run: [`sha256sum -c ${bundle.checksumFile.file}`],
      expect: [`${bundle.file}: OK`],
    } satisfies VerifyStep,
    installer: {
      run: [`tar -xzf ${bundle.file}`, `cd ${bundle.folder}`, "sh install.sh"],
      expect: [
        `${FIRST_FILE}: OK`,
        "…",
        `${LAST_FILE}: OK`,
        "Checksums OK.",
        `Signed by the key with SHA-256 fingerprint ${key.sha256} — compare it with INSTALL.md`,
      ],
    } satisfies VerifyStep,
    byHand: {
      run: [OPENSSL_VERIFY, OPENSSL_FINGERPRINT],
      expect: ["Signature Verified Successfully", `${hexFingerprint(key.sha256)}  -`],
    } satisfies VerifyStep,
    /** What install.sh prints (its die(): "install.sh: …"), and stops with, on a mismatch. */
    mismatch: [
      "install.sh: checksum mismatch — the bundle is damaged or was altered. Nothing was installed.",
      "install.sh: The signature does not match — the bundle was altered. Nothing was installed.",
    ],
  };
}
