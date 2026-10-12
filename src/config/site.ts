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

/** The site's colour theme, chosen at build time (PUBLIC_SITE_THEME). */
export const siteThemes = ["light", "dark", "auto"] as const;
export type SiteTheme = (typeof siteThemes)[number];

function readTheme(value: string | undefined): SiteTheme {
  const raw = read(value).toLowerCase() || "light";
  if (!(siteThemes as readonly string[]).includes(raw)) {
    throw new Error(`PUBLIC_SITE_THEME must be one of ${siteThemes.join(", ")} (got "${raw}").`);
  }
  return raw as SiteTheme;
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
  /** light (default): survey paper · dark: Night chart · auto: follows the visitor's OS. */
  theme: readTheme(env.PUBLIC_SITE_THEME),
  name: "LanCompass",
} as const;

export type SiteConfig = typeof site;
