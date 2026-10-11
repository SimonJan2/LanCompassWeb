import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  defaultLocale,
  localeCodes,
  locales,
  pageKeys,
  type Locale,
  type PageKey,
} from "../src/i18n/locales";

export const DEFAULT = "http://127.0.0.1:4321";
export const FLAGS = "http://127.0.0.1:4322";
export const FLAG_VALUES = {
  docs: "https://docs.example.com/",
  github: "https://github.com/example/lancompass",
  form: "https://forms.example.com/submit",
  email: "hello@example.com",
};

export function pathFor(locale: Locale, page: PageKey): string {
  const prefix = locale === defaultLocale ? "" : `/${locale}`;
  return `${prefix}${page === "home" ? "" : `/${page}`}/`;
}

export interface PageCase {
  locale: Locale;
  page: PageKey;
  path: string;
  dir: "ltr" | "rtl";
  lang: string;
}

export const pages: PageCase[] = localeCodes.flatMap((locale) =>
  pageKeys.map((page) => ({
    locale,
    page,
    path: pathFor(locale, page),
    dir: locales[locale].dir,
    lang: locales[locale].htmlLang,
  })),
);

export { localeCodes, locales, pageKeys, defaultLocale };

/** Every built HTML file under a dist directory. */
export function builtHtml(dir: string): { file: string; html: string }[] {
  const out: { file: string; html: string }[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".html")) out.push({ file: full, html: readFileSync(full, "utf8") });
    }
  };
  walk(dir);
  return out;
}

/** Pages allowed to show a TODO(operator) marker in visible text (listed in the W1 session report). */
export const todoAllowed = new Set<PageKey>(["privacy", "accessibility"]);
