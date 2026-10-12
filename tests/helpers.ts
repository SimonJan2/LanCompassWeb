import { test } from "@playwright/test";
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

/** What a Playwright project serves (playwright.config.ts → projects[].metadata). */
export interface SiteProject {
  /** The build's PUBLIC_SITE_THEME. */
  theme: "light" | "dark" | "auto";
  /** The colour scheme the browser emulates (auto builds run under both). */
  scheme: "light" | "dark";
  /** The built site this project serves. */
  dist: string;
}

/** The site under test in this project. */
export function siteProject(): SiteProject {
  return test.info().project.metadata as SiteProject;
}

/** The origin of the site under test (DEFAULT for the light build). */
export function siteBase(): string {
  return String(test.info().project.use.baseURL ?? DEFAULT).replace(/\/$/, "");
}

/** Whether the page renders the Night chart palette in this project. */
export function rendersDark(): boolean {
  const { theme, scheme } = siteProject();
  return theme === "dark" || (theme === "auto" && scheme === "dark");
}
