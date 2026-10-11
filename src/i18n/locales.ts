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
  "security",
  "design-partners",
  "contact",
  "accessibility",
  "privacy",
] as const;

export type PageKey = (typeof pageKeys)[number];
