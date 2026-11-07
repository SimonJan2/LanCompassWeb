/**
 * The one place that lists the site's locales. Adding a locale (for example
 * `ar`) means: add it here, add `src/i18n/<code>.json`, `src/content/copy/<code>.ts`
 * and `src/content/pages/<code>/*.mdx`. Routes, hreflang, the sitemap, the
 * language switcher and the tests all read this list.
 */
export const locales = {
  en: { label: "English", htmlLang: "en", dir: "ltr", ogLocale: "en_US" },
  he: { label: "עברית", htmlLang: "he", dir: "rtl", ogLocale: "he_IL" },
} as const;

export type Locale = keyof typeof locales;

export const defaultLocale: Locale = "en";

export const localeCodes = Object.keys(locales) as Locale[];

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && value in locales;
}

/** Every page of the site, as the path segment after the locale prefix. */
export const pageKeys = [
  "home",
  "product",
  "videos",
  "security",
  "verify",
  "pilot",
  "licensing",
  "contact",
  "accessibility",
  "privacy",
] as const;

export type PageKey = (typeof pageKeys)[number];

/**
 * Sections with pages of their own beyond pageKeys: W8's release notes (`/changelog/`,
 * `/changelog/<version>/`) and W9's docs (`/docs/`, `/docs/<slug>/`). Each has an index page and
 * an OG card; their pages pass their locale twins' paths (LocalePaths) to the layout for
 * canonical, hreflang and the switcher.
 */
export const sectionKeys = ["changelog", "docs"] as const;

export type SectionKey = (typeof sectionKeys)[number];

/** A page's path in every locale, root-relative with a trailing slash. */
export type LocalePaths = Record<Locale, string>;

/** The path of a section's page in a locale: `/changelog/`, `/he/changelog/0.7.0/`. */
export function sectionPath(locale: Locale, section: SectionKey, rest = ""): string {
  const prefix = locale === defaultLocale ? "" : `/${locale}`;
  return `${prefix}/${section}/${rest ? `${rest.replace(/^\/|\/$/g, "")}/` : ""}`;
}

/** The same section page in every locale. */
export function sectionPaths(section: SectionKey, rest = ""): LocalePaths {
  return Object.fromEntries(
    (Object.keys(locales) as Locale[]).map((code) => [code, sectionPath(code, section, rest)]),
  ) as LocalePaths;
}
