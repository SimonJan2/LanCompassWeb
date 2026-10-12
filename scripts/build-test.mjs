#!/usr/bin/env node
/** Builds the sites the Playwright suite serves (see playwright.config.ts). */
import { execFileSync } from "node:child_process";

const empty = { PUBLIC_DOCS_URL: "", PUBLIC_GITHUB_URL: "", PUBLIC_FORM_ENDPOINT: "" };
/** A site in one theme, on one port: every flag empty except the contact email, plus
 *  (for the dark and auto builds) the form endpoint, so their forms are tested too. */
const themed = (outDir, port, theme, extra = {}) => ({
  outDir,
  env: {
    ...empty,
    PUBLIC_SITE_URL: `http://127.0.0.1:${port}`,
    PUBLIC_CONTACT_EMAIL: "hello@example.com",
    PUBLIC_SITE_THEME: theme,
    ...extra,
  },
});
const form = { PUBLIC_FORM_ENDPOINT: "https://forms.example.com/submit" };

export const builds = [
  themed("dist-test", 4321, "light"),
  {
    outDir: "dist-test-flags",
    env: {
      PUBLIC_SITE_URL: "http://127.0.0.1:4322",
      PUBLIC_CONTACT_EMAIL: "hello@example.com",
      PUBLIC_DOCS_URL: "https://docs.example.com/",
      PUBLIC_GITHUB_URL: "https://github.com/example/lancompass",
      PUBLIC_FORM_ENDPOINT: "https://forms.example.com/submit",
      PUBLIC_SITE_THEME: "light",
    },
  },
  themed("dist-test-dark", 4323, "dark", form),
  themed("dist-test-auto", 4324, "auto", form),
];

for (const build of builds) {
  console.log(`build-test: ${build.outDir}`);
  execFileSync("npx", ["astro", "build"], {
    stdio: "inherit",
    env: { ...process.env, ...build.env, ASTRO_OUT_DIR: build.outDir },
  });
}
