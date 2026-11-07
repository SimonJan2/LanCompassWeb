/**
 * W12 (DECISIONS.md D-INDEXING): PUBLIC_SITE_INDEXING, `true` (the default, also when empty) or
 * `false`. A preview build (`false`) asks search engines not to index it: every response carries
 * `X-Robots-Tag: noindex` (dist/_headers, and nginx through it: astro.config.mjs →
 * headersNoindex) and robots.txt lists no sitemap (src/pages/robots.txt.ts). Not one HTML byte
 * depends on it. Any other value fails the build. Pure, so astro.config.mjs can read it too.
 */
export function readIndexing(value: string | undefined): boolean {
  const raw = (value ?? "").trim().toLowerCase();
  if (raw === "" || raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`PUBLIC_SITE_INDEXING must be true or false (got "${raw}").`);
}
