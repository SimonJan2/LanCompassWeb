// @ts-check
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";
import { defaultLocale, localeCodes } from "./src/i18n/locales.ts";
import { SECURITY_TXT_PATH, securityTxt } from "./src/lib/security-txt.ts";
import { markRules } from "./src/lib/annotations.ts";
import { productMarkdown } from "./src/lib/product-markdown.mjs";
import { getCopy } from "./src/content/copy/index.ts";

const env = loadEnv(process.env.NODE_ENV ?? "production", process.cwd(), "PUBLIC_");
const siteUrl = (env.PUBLIC_SITE_URL || "http://localhost:4321").replace(/\/$/, "");
if (!/^https?:\/\/[^/]/.test(siteUrl)) {
  throw new Error(
    `PUBLIC_SITE_URL must be an absolute URL with its scheme, for example https://example.com (got "${siteUrl}").`,
  );
}
const formEndpoint = env.PUBLIC_FORM_ENDPOINT || "";
const siteTheme = (env.PUBLIC_SITE_THEME || "light").trim().toLowerCase() || "light";
if (!["light", "dark", "auto"].includes(siteTheme)) {
  throw new Error(
    `PUBLIC_SITE_THEME must be one of light, dark, auto (got "${env.PUBLIC_SITE_THEME}").`,
  );
}

/**
 * Builds the theme's stylesheet from one source of truth. src/styles/tokens.css holds the
 * light tokens, then (after the @night marker) the --lc-dark-* tokens and, after
 * @night-rules, the mapping from semantic tokens to them, scoped to
 * :root[data-theme="dark"]. src/styles/night.css holds the few dark component rules.
 *  - light: the light tokens only, so the light site is unchanged;
 *  - dark:  everything, as written;
 *  - auto:  light tokens, dark tokens, src/styles/auto.css, and the mapping plus night.css
 *           re-emitted as :root[data-theme="auto"] inside @media (prefers-color-scheme: dark).
 * Tailwind reads imported stylesheets from disk, so this runs on global.css, before Tailwind.
 * @returns {import("vite").Plugin}
 */
function themeCss() {
  const styles = fileURLToPath(new URL("./src/styles/", import.meta.url));
  const read = (/** @type {string} */ name) => readFile(join(styles, name), "utf8");
  return {
    name: "lancompass:theme-css",
    enforce: "pre",
    async transform(code, id) {
      if (!id.split("?")[0]?.endsWith("/src/styles/global.css")) return null;
      for (const name of ["tokens.css", "night.css", "auto.css"])
        this.addWatchFile(join(styles, name));
      const tokens = await read("tokens.css");
      const [light = "", night = ""] = tokens.split("/* @night */");
      const cut = night.indexOf("/* @night-rules");
      const darkTokens = night.slice(0, cut);
      const mapping = night.slice(cut);
      let css = light;
      if (siteTheme === "dark") css = `${tokens}\n${await read("night.css")}`;
      if (siteTheme === "auto") {
        const rules = `${mapping}\n${await read("night.css")}`.replaceAll(
          '[data-theme="dark"]',
          '[data-theme="auto"]',
        );
        css = `${light}\n${darkTokens}\n${await read("auto.css")}\n@media (prefers-color-scheme: dark) {\n${rules}\n}`;
      }
      const marker = '@import "./tokens.css";';
      if (!code.includes(marker)) throw new Error(`themeCss: ${marker} not found in global.css`);
      return { code: code.replace(marker, () => css), map: null };
    },
  };
}

/**
 * The figure marks' positions (AnnotatedScreen.astro) as a stylesheet: `virtual:lancompass/
 * figure-marks.css`, one rule per mark the build can draw (markRules in src/lib/annotations.ts),
 * from the capture's anchors and clips and the copy's notes, the desktop crop's marks inside a
 * min-width media query and the phone crop's inside a max-width one (W11). AnnotatedScreen
 * imports it, so Vite bundles it into the page's own CSS file: no extra request, and no inline
 * style attribute, which the CSP (`style-src 'self'`) would block. The sets follow screenSets()
 * in src/lib/screens.ts.
 * @returns {import("vite").Plugin}
 */
function figureMarksCss() {
  const id = "virtual:lancompass/figure-marks.css";
  // A path-like id without the \0 prefix, so Vite's CSS pipeline handles it (as UnoCSS does).
  const resolved = "/__lancompass_figure_marks.css";
  const root = fileURLToPath(new URL("./src/", import.meta.url));
  const anchorsFile = join(root, "content/screen-anchors.json");
  /** @type {Record<string, string[]>} */
  const setsFor = { light: ["survey"], dark: ["night-chart"], auto: ["survey", "night-chart"] };
  return {
    name: "lancompass:figure-marks-css",
    enforce: "pre",
    resolveId(source) {
      return source === id ? resolved : null;
    },
    async load(loadId) {
      if (loadId !== resolved) return null;
      this.addWatchFile(anchorsFile);
      const anchors = JSON.parse(await readFile(anchorsFile, "utf8"));
      const sets = /** @type {("survey" | "night-chart")[]} */ (setsFor[siteTheme]);
      const css = markRules(anchors, {
        sets,
        locales: localeCodes,
        notes: (locale) => getCopy(locale).figures,
      });
      return `/* The figure marks' positions (astro.config.mjs → figureMarksCss). */\n${css}\n`;
    },
  };
}

/**
 * W8/W9: the product's own Markdown (release notes, docs) renders as the product renders it —
 * src/lib/product-markdown.mjs, a hast plugin for Astro 7's Markdown processor (Sätteri) that
 * acts only on files under src/content/changelog/ and src/content/docs/. Smart punctuation is
 * off, so the product's quotes and dashes stay as it wrote them (the MDX long-form pages type
 * their typographic quotes themselves: the light build's pages are byte-identical either way).
 * @returns {import("astro").AstroIntegration}
 */
function productText() {
  return {
    name: "lancompass:product-text",
    hooks: {
      "astro:config:setup": ({ config }) => {
        const processor = /** @type {any} */ (config.markdown.processor);
        if (processor?.name !== "satteri" || !processor.options) {
          throw new Error("productText: expected Astro's Sätteri Markdown processor");
        }
        processor.options.hastPlugins.push(productMarkdown());
        processor.options.features.smartPunctuation = false;
      },
    },
  };
}

/**
 * Moves /<locale>/404/index.html to /<locale>/404.html, where static hosts that
 * serve the nearest 404.html (Cloudflare Pages) look for it.
 * @returns {import("astro").AstroIntegration}
 */
function localized404() {
  return {
    name: "lancompass:localized-404",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        for (const code of localeCodes.filter((c) => c !== defaultLocale)) {
          const from = fileURLToPath(new URL(`${code}/404/index.html`, dir));
          const to = fileURLToPath(new URL(`${code}/404.html`, dir));
          await mkdir(fileURLToPath(new URL(`${code}/`, dir)), { recursive: true });
          await rename(from, to);
          await rm(fileURLToPath(new URL(`${code}/404/`, dir)), { recursive: true, force: true });
        }
      },
    },
  };
}

/**
 * Adds the form endpoint's origin to `form-action` in the built `_headers`
 * file, so the CSP allows the POST only when an endpoint is configured.
 * @returns {import("astro").AstroIntegration}
 */
function headersFormAction() {
  return {
    name: "lancompass:headers-form-action",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const file = fileURLToPath(new URL("_headers", dir));
        const text = await readFile(file, "utf8");
        const origin = formEndpoint ? new URL(formEndpoint).origin : "";
        await writeFile(
          file,
          text.replaceAll("form-action 'self'", `form-action 'self'${origin ? ` ${origin}` : ""}`),
        );
      },
    },
  };
}

/**
 * W6: writes /.well-known/security.txt (RFC 9116) only when PUBLIC_CONTACT_EMAIL and
 * PUBLIC_SITE_URL are both set (DECISIONS.md D-CONTACT); otherwise the build has no such file.
 * Expires is 180 days after the build. See src/lib/security-txt.ts.
 * @returns {import("astro").AstroIntegration}
 */
function securityTxtFile() {
  return {
    name: "lancompass:security-txt",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const text = securityTxt({
          contactEmail: env.PUBLIC_CONTACT_EMAIL,
          siteUrl: env.PUBLIC_SITE_URL,
          now: new Date(),
        });
        if (text === null) return;
        await mkdir(fileURLToPath(new URL(".well-known/", dir)), { recursive: true });
        await writeFile(fileURLToPath(new URL(SECURITY_TXT_PATH, dir)), text);
      },
    },
  };
}

/**
 * W11: public/screens/<set>/ holds both capture sets (Survey, Night chart). A light build serves
 * only Survey and a dark build only Night chart, so the other set's folder is left out of the
 * build; an auto build keeps both (src/lib/screens.ts → screenSets).
 * @returns {import("astro").AstroIntegration}
 */
function screensForTheme() {
  /** @type {Record<string, string[]>} */
  const keep = { light: ["survey"], dark: ["night-chart"], auto: ["survey", "night-chart"] };
  return {
    name: "lancompass:screens-for-theme",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        for (const set of ["survey", "night-chart"]) {
          if (keep[siteTheme]?.includes(set)) continue;
          await rm(fileURLToPath(new URL(`screens/${set}/`, dir)), {
            recursive: true,
            force: true,
          });
        }
      },
    },
  };
}

export default defineConfig({
  site: siteUrl,
  output: "static",
  outDir: process.env.ASTRO_OUT_DIR || "dist",
  trailingSlash: "always",
  build: {
    format: "directory",
    // External stylesheets only: the CSP has no 'unsafe-inline' for styles.
    inlineStylesheets: "never",
  },
  i18n: {
    locales: localeCodes,
    defaultLocale,
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    productText(),
    mdx(),
    sitemap({
      i18n: { defaultLocale, locales: Object.fromEntries(localeCodes.map((code) => [code, code])) },
      // W7: /design-partners/ is a redirect to /pilot/ (D-PILOT), not a page to index.
      filter: (page) => !/\/404\/?$/.test(page) && !/\/design-partners\/?$/.test(page),
    }),
    headersFormAction(),
    localized404(),
    securityTxtFile(),
    screensForTheme(),
  ],
  devToolbar: { enabled: false },
  prefetch: false,
  // W9: no syntax highlighting. Shiki colours each token with an inline style attribute, which
  // the CSP (`style-src 'self'`) blocks; the docs' code blocks are plain, LTR and wrapped, as on
  // the product's printed page. (The MDX pages have no code blocks: their output is unchanged.)
  markdown: { syntaxHighlight: false },
  vite: {
    plugins: [themeCss(), figureMarksCss(), tailwindcss()],
    // Never inline scripts into HTML: the CSP has no 'unsafe-inline' for scripts.
    build: { assetsInlineLimit: 0 },
  },
});
