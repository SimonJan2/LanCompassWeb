/**
 * W6: /.well-known/security.txt (RFC 9116), written at build time by astro.config.mjs only when
 * PUBLIC_CONTACT_EMAIL and PUBLIC_SITE_URL are both set (DECISIONS.md D-CONTACT): a file without
 * a contact is invalid, and Canonical and Policy need the real origin. Unsigned. Pure, so
 * tests/verify.spec.ts can check every case without a build.
 */
export interface SecurityTxtInput {
  /** PUBLIC_CONTACT_EMAIL, raw (no fallback). */
  contactEmail: string | undefined;
  /** PUBLIC_SITE_URL, raw: the localhost fallback the site uses for links does not count. */
  siteUrl: string | undefined;
  /** The build's time; Expires is 180 days after it. */
  now: Date;
}

export const SECURITY_TXT_PATH = ".well-known/security.txt";
export const EXPIRES_DAYS = 180;

/** RFC 3339 in UTC without fractions: 2027-05-05T12:00:00Z. */
function rfc3339(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** The file's text, or null when either value is missing (then no file is written). */
export function securityTxt({ contactEmail, siteUrl, now }: SecurityTxtInput): string | null {
  const contact = (contactEmail ?? "").trim();
  const site = (siteUrl ?? "").trim().replace(/\/+$/, "");
  if (contact === "" || site === "") return null;
  const expires = new Date(now.getTime() + EXPIRES_DAYS * 24 * 60 * 60 * 1000);
  return [
    `Contact: mailto:${contact}`,
    `Expires: ${rfc3339(expires)}`,
    "Preferred-Languages: en, he",
    `Canonical: ${site}/${SECURITY_TXT_PATH}`,
    `Policy: ${site}/security/#disclosure`,
    "",
  ].join("\n");
}
