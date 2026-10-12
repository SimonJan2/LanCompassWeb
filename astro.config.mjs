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
    mdx(),
    sitemap({
      i18n: { defaultLocale, locales: Object.fromEntries(localeCodes.map((code) => [code, code])) },
      filter: (page) => !/\/404\/?$/.test(page),
    }),
    headersFormAction(),
    localized404(),
  ],
  devToolbar: { enabled: false },
  prefetch: false,
  vite: {
    plugins: [themeCss(), tailwindcss()],
    // Never inline scripts into HTML: the CSP has no 'unsafe-inline' for scripts.
    build: { assetsInlineLimit: 0 },
  },
});
