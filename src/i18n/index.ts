import en from "./en.json";
import he from "./he.json";
import { defaultLocale, locales, localeCodes, type Locale, type PageKey } from "./locales";
import { site } from "../config/site";

export * from "./locales";

export type UiStrings = typeof en;

const ui: Record<Locale, UiStrings> = { en, he };

export function useUi(locale: Locale): UiStrings {
  return ui[locale];
}

/** Fills `{name}` placeholders. */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? `{${key}}`);
}

/** Root-relative path of a page in a locale, always with a trailing slash. */
export function pagePath(locale: Locale, page: PageKey): string {
  const prefix = locale === defaultLocale ? "" : `/${locale}`;
  const slug = page === "home" ? "" : `/${page}`;
  return `${prefix}${slug}/`;
}

export function absoluteUrl(path: string): string {
  return new URL(path, `${site.url}/`).toString();
}

/** Static paths for a `[...lang]` route: the default locale has no prefix. */
export function localeStaticPaths() {
  return localeCodes.map((locale) => ({
    params: { lang: locale === defaultLocale ? undefined : locale },
    props: { locale },
  }));
}

export function localeMeta(locale: Locale) {
  return locales[locale];
}
