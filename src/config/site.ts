/**
 * Site configuration. Every value comes from a `PUBLIC_*` environment variable
 * at build time (see `.env.example`); an empty value switches the feature off.
 */
function read(value: string | undefined): string {
  return (value ?? "").trim();
}

function readUrl(value: string | undefined): string {
  const raw = read(value);
  if (raw === "") return "";
  try {
    return new URL(raw).toString();
  } catch {
    throw new Error(`Invalid URL in PUBLIC_* environment variable: ${raw}`);
  }
}

const env = import.meta.env;

export const site = {
  /** Absolute origin, no trailing slash. */
  url: (readUrl(env.PUBLIC_SITE_URL) || "http://localhost:4321").replace(/\/$/, ""),
  /** Empty → a visible TODO(operator) marker where the address is needed. */
  contactEmail: read(env.PUBLIC_CONTACT_EMAIL),
  /** Empty → forms are replaced by a mailto: button. */
  formEndpoint: readUrl(env.PUBLIC_FORM_ENDPOINT),
  /** Empty → no GitHub link anywhere. */
  githubUrl: readUrl(env.PUBLIC_GITHUB_URL),
  /** Empty → "Docs" is not rendered in the navigation. */
  docsUrl: readUrl(env.PUBLIC_DOCS_URL),
  name: "LanCompass",
} as const;

export type SiteConfig = typeof site;
