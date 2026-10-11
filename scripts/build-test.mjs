#!/usr/bin/env node
/** Builds the two sites the Playwright suite serves (see playwright.config.ts). */
import { execFileSync } from "node:child_process";

const empty = { PUBLIC_DOCS_URL: "", PUBLIC_GITHUB_URL: "", PUBLIC_FORM_ENDPOINT: "" };
export const builds = [
  {
    outDir: "dist-test",
    env: {
      ...empty,
      PUBLIC_SITE_URL: "http://127.0.0.1:4321",
      PUBLIC_CONTACT_EMAIL: "hello@example.com",
    },
  },
  {
    outDir: "dist-test-flags",
    env: {
      PUBLIC_SITE_URL: "http://127.0.0.1:4322",
      PUBLIC_CONTACT_EMAIL: "hello@example.com",
      PUBLIC_DOCS_URL: "https://docs.example.com/",
      PUBLIC_GITHUB_URL: "https://github.com/example/lancompass",
      PUBLIC_FORM_ENDPOINT: "https://forms.example.com/submit",
    },
  },
];

for (const build of builds) {
  console.log(`build-test: ${build.outDir}`);
  execFileSync("npx", ["astro", "build"], {
    stdio: "inherit",
    env: { ...process.env, ...build.env, ASTRO_OUT_DIR: build.outDir },
  });
}
