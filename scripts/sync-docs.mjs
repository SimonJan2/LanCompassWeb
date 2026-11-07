#!/usr/bin/env node
/**
 * W9: the product's built-in docs, copied from an archive of the release tag into the site.
 *
 *   node scripts/sync-docs.mjs <extracted root> --version 0.7.0 --locales en,he
 *        [--out src/content/docs] [--assets src/assets/docs] [--report <file.json>]
 *
 * <extracted root> holds `frontend/src/content/docs` and `frontend/public/docs-img`, unpacked
 * from the tag in two plain steps (the script never runs git and never reads the product's
 * working tree):
 *   git -C ../LanCompass archive -o <scratch>/docs-0.7.0.tar v0.7.0 \
 *     frontend/src/content/docs frontend/public/docs-img
 *   tar -xf <scratch>/docs-0.7.0.tar -C <scratch>
 *
 * For each locale and each article of the product's registry.json, it writes
 * `<out>/<locale>/<slug>.md`: the product's front matter (title, description, category,
 * keywords), the version, the article's place in the registry (`order`) and, for a translation,
 * `stale` — the product's own rule: the English file's SHA-256 differs from the one the
 * translation was made from (manifest.json `source_sha256`). Then the article's text, verbatim,
 * with its links rewritten (and nothing else):
 *   - `/docs/<slug>` and `/docs/<slug>#anchor` (and a bare `secrets`, which the product resolves
 *     the same way) → `/docs/<slug>/#anchor` (en) or `/he/docs/<slug>/#anchor` (he);
 *   - an image `/docs-img/<dir>/<file>` → a path to `<assets>/<dir>/<file>` (Astro serves it as
 *     an optimised image), and the file is copied — only the images the pages reference;
 *   - `https://` links stay; `#anchor` links stay;
 *   - a link to a product route (`/settings`, `/devices`, the product's own `/docs` page …)
 *     becomes its text: there is no product here.
 * Links inside code (fences and backtick spans) are not links and are left alone. A file is
 * written only when its content differs, so a second run on the same input changes nothing.
 */
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const sha256 = (s) => createHash("sha256").update(s).digest("hex");

/** The product's flat front matter (frontend/src/lib/docs-server.ts parseFrontMatter at v0.7.0). */
export function parseFrontMatter(text) {
  const lines = text.split("\n");
  if (!lines.length || lines[0].trim() !== "---") return [{}, text];
  const meta = {};
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === "---" || t === "...") {
      end = i;
      break;
    }
    const m = /^([A-Za-z0-9_-]+):[ \t]*(.*)$/.exec(lines[i]);
    if (!m) continue;
    const raw = m[2].trim();
    let v = raw;
    if (raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2) {
      try {
        v = JSON.parse(raw);
      } catch {
        v = raw.slice(1, -1);
      }
    } else if (raw === "true") v = true;
    else if (raw === "false") v = false;
    meta[m[1]] = v;
  }
  if (end < 0) return [{}, text];
  return [
    meta,
    lines
      .slice(end + 1)
      .join("\n")
      .replace(/^\n+/, ""),
  ];
}

/** A Markdown inline link or image: `[text](url)`, `![alt](url "title")`. */
const LINK = /(!?)\[((?:[^[\]\n]|\[[^\]\n]*\])*)\]\(([^()\s]+)(\s+"[^"\n]*")?\)/g;

/**
 * Rewrite the links of one line that is outside fenced code, leaving code spans alone.
 * @param {string} line
 * @param {(kind: string, text: string, url: string, title: string | undefined, image: boolean) => string} fix
 */
function rewriteLine(line, fix) {
  // Split on code spans (a backtick run and its closing twin); rewrite only the text between.
  const parts = line.split(/(`+[^`]*?`+)/);
  return parts
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part.replace(LINK, (whole, bang, text, url, title) =>
            fix(whole, text, url, title, !!bang),
          ),
    )
    .join("");
}

/**
 * The article's text with its links rewritten; counts every rewrite by kind.
 * @param {string} body
 * @param {{ locale: string; slugs: Set<string>; assetsRel: string; images: Map<string, string>; counts: Record<string, number>; unknown: string[] }} ctx
 */
export function rewriteBody(body, ctx) {
  const prefix = ctx.locale === "en" ? "" : `/${ctx.locale}`;
  const count = (k) => (ctx.counts[k] = (ctx.counts[k] ?? 0) + 1);
  let fence = null;
  const out = [];
  for (const line of body.split("\n")) {
    const bare = line.replace(/^(\s*>)+\s?/, "").trimStart();
    const f = /^(```+|~~~+)/.exec(bare);
    if (f) {
      if (fence === null) fence = f[1][0];
      else if (f[1][0] === fence) fence = null;
      out.push(line);
      continue;
    }
    if (fence) {
      out.push(line);
      continue;
    }
    out.push(
      rewriteLine(line, (whole, text, url, title, image) => {
        const t = title ?? "";
        if (image) {
          const m = /^\/docs-img\/(.+)$/.exec(url);
          if (!m) {
            count("image-other");
            return whole;
          }
          ctx.images.set(m[1], url);
          count("image");
          return `![${text}](${ctx.assetsRel}/${m[1]}${t})`;
        }
        if (/^https?:\/\//.test(url)) {
          count("external");
          return whole;
        }
        if (url.startsWith("#")) {
          count("anchor");
          return whole;
        }
        if (url.startsWith("mailto:")) {
          count("mailto");
          return whole;
        }
        const doc = /^\/docs\/([a-z0-9-]+)\/?(#.*)?$/.exec(url) ?? /^([a-z0-9-]+)(#.*)?$/.exec(url);
        if (doc && ctx.slugs.has(doc[1])) {
          count(url.startsWith("/docs/") ? "docs" : "docs-relative");
          return `[${text}](${prefix}/docs/${doc[1]}/${doc[2] ?? ""}${t})`;
        }
        if (doc && url.startsWith("/docs/")) {
          ctx.unknown.push(url);
          count("docs-unknown-as-text");
          return text;
        }
        if (url.startsWith("/")) {
          count("product-route-as-text");
          return text;
        }
        ctx.unknown.push(url);
        count("other-as-text");
        return text;
      }),
    );
  }
  return out.join("\n");
}

const q = (s) => JSON.stringify(s);

/**
 * The whole sync: writes the pages and images (unless `dryRun`) and returns the report.
 * @param {{ root: string; version: string; locales: string[]; out: string; assets: string; dryRun?: boolean }} opts
 */
export function syncDocs({ root, version, locales, out, assets, dryRun = false }) {
  const docsDir = join(root, "frontend", "src", "content", "docs");
  const imgDir = join(root, "frontend", "public", "docs-img");
  const registry = JSON.parse(readFileSync(join(docsDir, "registry.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(join(docsDir, "manifest.json"), "utf8"));
  const slugs = new Set(registry.articles.map((a) => a.slug));
  const report = {
    version,
    categories: registry.categories,
    pages: {},
    written: { new: 0, changed: 0, unchanged: 0 },
    links: {},
    unknownLinks: [],
    missing: [],
    stale: [],
    images: { files: 0, bytes: 0, copied: 0, unchanged: 0, list: [] },
    extra: [],
  };
  const images = new Map();
  for (const locale of locales) {
    const outDir = join(out, locale);
    if (!dryRun) mkdirSync(outDir, { recursive: true });
    let n = 0;
    registry.articles.forEach((article, order) => {
      const src = join(docsDir, locale, `${article.slug}.md`);
      if (!existsSync(src)) {
        report.missing.push(`${locale}/${article.slug}`);
        return;
      }
      const raw = readFileSync(src, "utf8");
      const [meta, body] = parseFrontMatter(raw);
      const counts = report.links;
      const unknown = [];
      const target = join(outDir, `${article.slug}.md`);
      const assetsRel = relative(dirname(target), assets).split("\\").join("/");
      const text = rewriteBody(body, { locale, slugs, assetsRel, images, counts, unknown });
      for (const u of unknown) report.unknownLinks.push(`${locale}/${article.slug}: ${u}`);
      let stale = null;
      if (locale !== "en") {
        const en = readFileSync(join(docsDir, "en", `${article.slug}.md`), "utf8");
        const recorded = manifest.docs?.[article.slug]?.locales?.[locale]?.source_sha256;
        stale = !recorded || recorded !== sha256(en);
        if (stale) report.stale.push(`${locale}/${article.slug}`);
      }
      const fm = [
        "---",
        `title: ${q(String(meta.title ?? article.slug))}`,
        `description: ${q(String(meta.description ?? ""))}`,
        `category: ${q(String(meta.category ?? article.category))}`,
        ...(meta.keywords !== undefined ? [`keywords: ${q(String(meta.keywords))}`] : []),
        `version: ${q(version)}`,
        `order: ${order}`,
        ...(stale === null ? [] : [`stale: ${stale}`]),
        "---",
        "",
      ].join("\n");
      const content = `${fm}\n${text.replace(/\s*$/, "")}\n`;
      const before = existsSync(target) ? readFileSync(target, "utf8") : null;
      const status = before === content ? "unchanged" : before === null ? "new" : "changed";
      report.written[status] += 1;
      if (!dryRun && status !== "unchanged") writeFileSync(target, content);
      n += 1;
    });
    report.pages[locale] = n;
    if (existsSync(outDir)) {
      for (const f of readdirSync(outDir)) {
        if (f.endsWith(".md") && !slugs.has(f.slice(0, -3))) report.extra.push(`${locale}/${f}`);
      }
    }
  }
  for (const rel of [...images.keys()].sort()) {
    const from = join(imgDir, rel);
    const to = join(assets, rel);
    if (!existsSync(from)) {
      report.unknownLinks.push(`image not in the archive: ${rel}`);
      continue;
    }
    const bytes = statSync(from).size;
    report.images.files += 1;
    report.images.bytes += bytes;
    report.images.list.push(`${rel} ${bytes}`);
    const same = existsSync(to) && sha256(readFileSync(to)) === sha256(readFileSync(from));
    if (same) report.images.unchanged += 1;
    else {
      report.images.copied += 1;
      if (!dryRun) {
        mkdirSync(dirname(to), { recursive: true });
        copyFileSync(from, to);
      }
    }
  }
  return report;
}

function main(argv) {
  const args = [...argv];
  const root = args.shift();
  if (!root || root.startsWith("--")) {
    console.error(
      "usage: node scripts/sync-docs.mjs <extracted root> --version 0.7.0 --locales en,he [--out dir] [--assets dir] [--report file]",
    );
    process.exit(2);
  }
  let version = "";
  let locales = ["en", "he"];
  let out = "src/content/docs";
  let assets = "src/assets/docs";
  let reportFile = "";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--version") version = args[++i] ?? "";
    else if (args[i] === "--locales") locales = (args[++i] ?? "").split(",").filter(Boolean);
    else if (args[i] === "--out") out = args[++i] ?? out;
    else if (args[i] === "--assets") assets = args[++i] ?? assets;
    else if (args[i] === "--report") reportFile = args[++i] ?? "";
  }
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    console.error("sync-docs: --version x.y.z is required");
    process.exit(2);
  }
  const report = syncDocs({
    root: resolve(root),
    version,
    locales,
    out: resolve(out),
    assets: resolve(assets),
  });
  if (reportFile) writeFileSync(resolve(reportFile), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`pages: ${JSON.stringify(report.pages)}`);
  console.log(`written: ${JSON.stringify(report.written)}`);
  console.log(`links rewritten or kept, by kind: ${JSON.stringify(report.links)}`);
  console.log(
    `images: ${report.images.files} files, ${report.images.bytes} bytes (copied ${report.images.copied}, unchanged ${report.images.unchanged})`,
  );
  console.log(`stale translations: ${report.stale.length ? report.stale.join(", ") : "none"}`);
  console.log(`missing: ${report.missing.length ? report.missing.join(", ") : "none"}`);
  console.log(
    `unknown links (made text): ${report.unknownLinks.length ? report.unknownLinks.join(" | ") : "none"}`,
  );
  console.log(
    `not in the registry (left as they are): ${report.extra.length ? report.extra.join(", ") : "none"}`,
  );
  console.log(`FINISHED-sync-docs ${Object.values(report.pages).reduce((a, b) => a + b, 0)} pages`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2));
}
