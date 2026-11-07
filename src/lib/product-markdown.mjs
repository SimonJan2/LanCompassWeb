/**
 * W8/W9: how the product's own Markdown renders on the site — its release notes
 * (src/content/changelog/en) and its built-in docs (src/content/docs/<locale>) — the way the
 * product renders it (frontend/src/components/docs/docs-content.tsx at v0.7.0), with no new
 * dependency: a Sätteri hast plugin (Astro 7's Markdown processor), added in astro.config.mjs.
 * It runs only for files under src/content/changelog/ and src/content/docs/; every other page
 * (the MDX long-form pages) is untouched.
 *
 *  - Heading ids are the product's (slugifyHeading, duplicates "-1", "-2"), so the docs' own
 *    links between pages (`/docs/sso/#roles-by-sid`) land on their headings. In the site's own
 *    Hebrew release summaries a heading may end in `{#id}` to share the English page's anchor.
 *  - `> [!NOTE]` … `> [!DANGER]` blockquotes become callouts with the product's label in the
 *    page's language (docs.callout.* in its message catalogue); `> [!details] Summary` becomes a
 *    native <details> (closed), as in the product. No script.
 *  - On Hebrew pages every `pre` and `code` is `dir="ltr"` (the product's isolate marks in the
 *    text, U+2066…U+2069, are kept as they are).
 *  - A table sits in a focusable scroll box (`.docs-table`), so a wide table scrolls on a phone
 *    instead of the page.
 *  - Raw HTML in the product's text is shown as text: the product renders GFM only, no raw
 *    HTML, and its writers use `<name>`-style placeholders in prose. The site's own Hebrew
 *    summaries (src/content/changelog/he) keep their inline <bdi> markup.
 */
import { fileURLToPath } from "node:url";

/** The product's heading slugs (frontend/src/lib/docs.ts slugifyHeading at v0.7.0). */
export function slugifyHeading(text) {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}_]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

/** The product's callout labels: docs.callout.<kind> in messages/{en,he}.json at v0.7.0. */
export const CALLOUT_LABELS = {
  en: {
    note: "Note",
    tip: "Tip",
    important: "Important",
    warning: "Warning",
    caution: "Caution",
    danger: "Danger",
  },
  he: {
    note: "הערה",
    tip: "טיפ",
    important: "חשוב",
    warning: "אזהרה",
    caution: "זהירות",
    danger: "סכנה",
  },
};

const CALLOUT_MARKER = /^\[!(note|tip|important|warning|caution|danger)\][ \t]*\r?\n?/i;
const DETAILS_MARKER = /^\[!details\][ \t]*([^\r\n]*)\r?\n?/i;
const HEADING_ID = /\s*\{#([\w-]+)\}\s*$/;

/**
 * Which product text a file is: `{ area, locale, product }`, or null for any other file.
 * `product` is false for the site's own Hebrew release summaries.
 * @param {URL | undefined} url
 */
export function productFile(url) {
  if (!url) return null;
  const path = fileURLToPath(url).replaceAll("\\", "/");
  const m = /\/src\/content\/(changelog|docs)\/([a-z]{2})\//.exec(path);
  if (!m) return null;
  const area = m[1];
  const locale = m[2];
  return { area, locale, product: !(area === "changelog" && locale !== "en") };
}

const isElement = (n, tag) => n && n.type === "element" && (!tag || n.tagName === tag);
const isBlank = (n) =>
  !n || (n.type === "text" && !String(n.value ?? "").trim()) || isElement(n, "br");

/** A Sätteri hast-plugin factory: null (no plugin) for files that are not the product's text. */
export function productMarkdown() {
  return (factory) => {
    const file = productFile(factory.fileURL);
    if (!file) return null;
    const labels = CALLOUT_LABELS[file.locale] ?? CALLOUT_LABELS.en;
    const seen = new Map();
    const unique = (base) => {
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      return n ? `${base}-${n}` : base;
    };
    /** The first element child of a node (skipping whitespace text). */
    const firstElement = (node) => (node.children ?? []).find((c) => c.type === "element");
    return {
      name: "lancompass-product-markdown",
      element: [
        {
          filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
          visit(node, ctx) {
            const kids = node.children ?? [];
            const last = kids[kids.length - 1];
            const own =
              !file.product && last && last.type === "text" ? HEADING_ID.exec(last.value) : null;
            if (own) {
              ctx.replaceNode(last, { type: "text", value: last.value.replace(HEADING_ID, "") });
              ctx.setProperty(node, "id", unique(own[1]));
              return;
            }
            ctx.setProperty(node, "id", unique(slugifyHeading(ctx.textContent(node))));
          },
        },
        {
          filter: ["pre", "code"],
          visit(node, ctx) {
            if (file.locale === "he") ctx.setProperty(node, "dir", "ltr");
          },
        },
        {
          filter: ["blockquote"],
          visit(node, ctx) {
            const p = firstElement(node);
            if (!isElement(p, "p")) return;
            const pk = [...(p.children ?? [])];
            const t = pk[0];
            if (!t || t.type !== "text") return;
            const details = DETAILS_MARKER.exec(t.value);
            const callout = details ? null : CALLOUT_MARKER.exec(t.value);
            if (!details && !callout) return;
            const marker = (details ?? callout)[0];
            const rest = t.value.slice(marker.length);
            const pChildren = [...(rest ? [{ type: "text", value: rest }] : []), ...pk.slice(1)];
            while (pChildren.length && isBlank(pChildren[0])) pChildren.shift();
            const body = [];
            for (const child of node.children ?? []) {
              if (child === p) {
                if (pChildren.length) body.push({ ...p, children: pChildren });
              } else body.push(child);
            }
            if (details) {
              ctx.replaceNode(node, {
                type: "element",
                tagName: "details",
                properties: { className: ["docs-details"] },
                children: [
                  {
                    type: "element",
                    tagName: "summary",
                    properties: {},
                    children: [{ type: "text", value: details[1].trim() || "Details" }],
                  },
                  ...body,
                ],
              });
              return;
            }
            const kind = callout[1].toLowerCase();
            ctx.replaceNode(node, {
              type: "element",
              tagName: "div",
              properties: { className: ["docs-callout", `docs-callout-${kind}`], role: "note" },
              children: [
                {
                  type: "element",
                  tagName: "p",
                  properties: { className: ["docs-callout-label"] },
                  children: [{ type: "text", value: labels[kind] }],
                },
                ...body,
              ],
            });
          },
        },
        {
          filter: ["table"],
          visit(node, ctx) {
            ctx.wrapNode(node, {
              type: "element",
              tagName: "div",
              properties: { className: ["docs-table"], tabIndex: 0 },
              children: [],
            });
          },
        },
      ],
      ...(file.product
        ? {
            raw(node, ctx) {
              ctx.replaceNode(node, { type: "text", value: node.value });
            },
          }
        : {}),
    };
  };
}
