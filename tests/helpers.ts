import { test, type Page } from "@playwright/test";
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
/** W13: the auto test build (playwright.config.ts), for the switch's checks from any project. */
export const AUTO = "http://127.0.0.1:4324";
export const FLAG_VALUES = {
  docs: "https://docs.example.com/",
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

/** W8: every release in src/content/releases.json, newest first. */
export const releaseVersions: string[] = (
  JSON.parse(readFileSync(join(process.cwd(), "src", "content", "releases.json"), "utf8")) as {
    releases: { version: string }[];
  }
).releases.map((r) => r.version);

/** A page outside pageKeys (W8: the changelog index and each release's notes). */
export interface SectionPageCase {
  locale: Locale;
  path: string;
  dir: "ltr" | "rtl";
  lang: string;
  /** The same page in each locale. */
  twins: Record<Locale, string>;
}

const sectionPrefix = (locale: Locale) => (locale === defaultLocale ? "" : `/${locale}`);
const twinsOf = (rest: string) =>
  Object.fromEntries(localeCodes.map((c) => [c, `${sectionPrefix(c)}${rest}`])) as Record<
    Locale,
    string
  >;

/** W9: a sample of the docs (the index and the longest article, both locales), for the specs
 *  that visit every page (origins, the container's CSP). tests/docs.spec.ts checks all 130. */
export const docsSample: { path: string }[] = [
  "/docs/",
  "/he/docs/",
  "/docs/topology/",
  "/he/docs/topology/",
  "/docs/racks/",
  "/he/docs/subnets/",
].map((path) => ({ path }));

/** The changelog index and every release's page, in every locale. */
export const sectionPages: SectionPageCase[] = localeCodes.flatMap((locale) =>
  ["/changelog/", ...releaseVersions.map((v) => `/changelog/${v}/`)].map((rest) => ({
    locale,
    path: `${sectionPrefix(locale)}${rest}`,
    dir: locales[locale].dir,
    lang: locales[locale].htmlLang,
    twins: twinsOf(rest),
  })),
);

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

/** Pages allowed to show a TODO(operator) marker in visible text. W12 emptied it: the legal-review
 *  banners are gone (DECISIONS.md D-LEGAL-BANNERS) and the statements' questions are answered, so
 *  the only markers left are the contact ones, which show only in a build without
 *  PUBLIC_CONTACT_EMAIL (the flags build; tests/flags.spec.ts) — every build content.spec visits
 *  has an address — and /privacy/'s form-service marker below. */
export const todoAllowed = new Set<PageKey>();

/** W12: /privacy/ describes email only; a build with PUBLIC_FORM_ENDPOINT set (the flags, dark and
 *  auto test builds) shows this one marker there, until the operator names the form service. */
export const FORM_SERVICE_MARKER =
  "TODO(operator): name the form service on this page before using a form";

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

/**
 * W10: lay out the whole page before measuring geometry (axe's target-size, tests/targets.spec).
 * The footer and other `.defer-render` sections, and the docs' long articles, render lazily
 * (content-visibility: auto): until a reader scrolls there their boxes keep placeholder sizes,
 * so a measurement at load put the footer's "How it works" link 57 px from the article's last
 * link on /docs/first-run/ at 390 px, when the laid-out page has them 2,977 px apart (night E).
 */
export async function layOutInFull(page: Page): Promise<void> {
  await page.addStyleTag({ content: "* { content-visibility: visible !important; }" });
}

/** Whether the page renders the Night chart palette in this project. */
export function rendersDark(): boolean {
  const { theme, scheme } = siteProject();
  return theme === "dark" || (theme === "auto" && scheme === "dark");
}
