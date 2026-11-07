import type { APIRoute } from "astro";
import { site } from "../config/site";
import { absoluteUrl } from "../i18n";

/**
 * robots.txt, written out explicitly (DECISIONS.md D-CRAWLERS, default): everything is allowed,
 * as before W10. Search and user-triggered agents are named and allowed; the training tokens are
 * named and left allowed, with a comment that this is the operator's choice. A crawler obeys only
 * the most specific group that names it, so a rule added later goes in every group. No llms.txt
 * (a proposal, not a standard; W2 research §7.9). tests/seo.spec.ts holds the groups.
 *
 * W12 (D-INDEXING): a preview build (PUBLIC_SITE_INDEXING=false) keeps crawling allowed, so a
 * crawler can fetch a page and read its `X-Robots-Tag: noindex`, and lists no sitemap.
 */
const lines = [
  "# LanCompass. Every page is public, and every agent may read it.",
  ...(site.indexing
    ? []
    : ["# This address is a preview: every response says X-Robots-Tag: noindex, so no sitemap."]),
  "",
  "# Search engines and agents a person sends to read a page.",
  "User-agent: Googlebot",
  "User-agent: Bingbot",
  "User-agent: OAI-SearchBot",
  "User-agent: ChatGPT-User",
  "User-agent: Claude-SearchBot",
  "User-agent: Claude-User",
  "Allow: /",
  "",
  "# Crawlers that collect text to train AI models: allowed. This is the operator's choice;",
  "# to refuse them, change this group's Allow: / to Disallow: /.",
  "User-agent: GPTBot",
  "User-agent: ClaudeBot",
  "User-agent: Google-Extended",
  "Allow: /",
  "",
  "# Every other agent.",
  "User-agent: *",
  "Allow: /",
  "",
  ...(site.indexing ? [`Sitemap: ${absoluteUrl("/sitemap-index.xml")}`, ""] : []),
];

export const GET: APIRoute = () =>
  new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
