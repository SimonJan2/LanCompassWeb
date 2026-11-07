#!/usr/bin/env node
/** Builds the sites the Playwright suite serves (see playwright.config.ts). */
import { execFileSync } from "node:child_process";

const empty = { PUBLIC_DOCS_URL: "", PUBLIC_FORM_ENDPOINT: "" };
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
      // W6: no contact address here, so this build has no /.well-known/security.txt (a file
      // without Contact is invalid; tests/verify.spec.ts). Its forms post to the endpoint.
      PUBLIC_CONTACT_EMAIL: "",
      PUBLIC_DOCS_URL: "https://docs.example.com/",
      // The "Source code" link and its PUBLIC_GITHUB_URL flag are gone (DECISIONS.md D-GITHUB):
      // set here, it must change nothing (tests/flags.spec.ts).
      PUBLIC_GITHUB_URL: "https://github.com/example/lancompass",
      PUBLIC_FORM_ENDPOINT: "https://forms.example.com/submit",
      PUBLIC_SITE_THEME: "light",
      // W9: one fixture docs page the product marks as an outdated translation
      // (tests/fixtures/docs/he/stale-fixture.md), so the notice is rendered and tested
      // (tests/docs.spec.ts). No 0.7.0 page needs it, and no other build reads the fixture.
      LANCOMPASS_DOCS_FIXTURES: "1",
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
