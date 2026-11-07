#!/usr/bin/env node
/**
 * W8: the product's release notes, copied from its CHANGELOG.md into the site.
 *
 *   node scripts/sync-changelog.mjs <CHANGELOG.md> [--out <dir>] [--docs <dir>]
 *
 * <CHANGELOG.md> is a file extracted from the release tag, for example
 *   git -C ../LanCompass show v0.7.0:CHANGELOG.md > <scratch>/CHANGELOG.md
 * The script never runs git and never reads the product's working tree.
 *
 * It splits the file at `## [x.y.z] — YYYY-MM-DD` (skipping `[Unreleased]`) and writes one file
 * per release, `<out>/<version>.md` (default `src/content/changelog/en`): front matter derived
 * from the notes (version, date, title, summary, the upgrade facts), then the section's text.
 *
 * The text is the product's, verbatim, with exactly two transformations:
 *   1. the parenthesised wave numbers are dropped: ` (v206–v207)`, ` (v214)`, ` (v196–v197, v65)`
 *      (WAVE_NUMBERS; a parenthesis holding anything else, "IPv6 (v47 compatible)", stays);
 *   2. a reference to a product doc page, `Docs → First run` or `Docs → Support → The pilot`,
 *      becomes a link to `/docs/<slug>/` (and `#<heading>`) when the site has that page in
 *      <docs> (default `src/content/docs/en`, W9); otherwise it stays text. References to the
 *      bundle's own files (`INSTALL.md` §6) stay text: they are not pages of the site.
 * Nothing is rephrased, softened or cut. Re-running on the same input changes nothing: a file is
 * written only when its content differs.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** A release heading: `## [0.7.0] — 2026-11-06`. */
const RELEASE_HEADING = /^## \[(\d+\.\d+\.\d+)\] — (\d{4}-\d{2}-\d{2})\s*$/;
/** Any level-2 heading (the end of a section). */
const H2 = /^## /;
/** One wave number: v206, v122.1. */
const WAVE = String.raw`v\d+(?:\.\d+)*`;
/** One wave or a range: v206–v207 (en dash or hyphen). */
const WAVE_RANGE = String.raw`${WAVE}(?:[–-]${WAVE})?`;
/**
 * A parenthesis that holds only wave numbers, with the one space before it:
 * ` (v206–v207)`, ` (v214)`, ` (v196–v197, v65)`.
 */
export const WAVE_NUMBERS = new RegExp(
  String.raw`[ \t]?\(${WAVE_RANGE}(?:,\s*${WAVE_RANGE})*\)`,
  "g",
);
/** `Docs → Title` or `Docs → Title → Heading`, up to a closing bracket or punctuation. */
const DOC_REF = /Docs → ([^→()\n,;.]+?)(?: → ([^→()\n,;.]+?))?(?=[),;.]|$)/gm;

const NUMBER_WORDS = Object.fromEntries(
  [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
  ].map((w, i) => [w, i]),
);

/** The product's heading slugs (frontend/src/lib/docs.ts slugifyHeading at v0.7.0). */
export function slugifyHeading(text) {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}_]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

/** Transformation 1: drop the parenthesised wave numbers. Returns the text and the count. */
export function dropWaveNumbers(text) {
  let count = 0;
  const out = text.replace(WAVE_NUMBERS, () => {
    count += 1;
    return "";
  });
  return { text: out, count };
}

/**
 * The site's docs pages, for transformation 2: slug → its `##`/`###` heading slugs. An empty map
 * when the folder does not exist (W9 not shipped): every reference then stays text.
 * @param {string | null} dir
 * @returns {Map<string, Set<string>>}
 */
export function readDocsIndex(dir) {
  /** @type {Map<string, Set<string>>} */
  const pages = new Map();
  if (!dir || !existsSync(dir)) return pages;
  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith(".md")) continue;
    const text = readFileSync(join(dir, name), "utf8");
    const heads = new Set();
    let fence = false;
    for (const line of text.split("\n")) {
      if (/^\s*(```|~~~)/.test(line)) fence = !fence;
      if (fence) continue;
      const m = /^#{2,3}\s+(.+?)\s*#*\s*$/.exec(line);
      if (m) heads.add(slugifyHeading(m[1].replace(/[`*_]/g, "")));
    }
    pages.set(name.slice(0, -3), heads);
  }
  return pages;
}

/**
 * Transformation 2: `Docs → Title[ → Heading]` → a link to the site's docs page, when it exists.
 * @param {string} text
 * @param {Map<string, Set<string>>} docs
 */
export function linkDocRefs(text, docs) {
  let linked = 0;
  let kept = 0;
  const out = text.replace(DOC_REF, (whole, title, heading) => {
    const slug = slugifyHeading(title);
    const heads = docs.get(slug);
    if (!heads) {
      kept += 1;
      return whole;
    }
    linked += 1;
    const anchor =
      heading && heads.has(slugifyHeading(heading)) ? `#${slugifyHeading(heading)}` : "";
    return `[${whole}](/docs/${slug}/${anchor})`;
  });
  return { text: out, linked, kept };
}

/**
 * The first sentence of a paragraph: up to the first full stop that ends a word (followed by a
 * space, or the end), so the stops inside "0.6.1" or "`e01081d7`)." mid-number do not count.
 */
export function firstSentence(paragraph) {
  const flat = paragraph.replace(/\s+/g, " ").trim();
  const m = /^(.+?[.!?])(?=\s+\S|$)/.exec(flat);
  return (m ? m[1] : flat).trim();
}

const plain = (s) => s.replace(/`/g, "").replace(/\*\*/g, "");

/**
 * The parts of a section: the intro paragraph (before the first heading or list), the `###`
 * headings, and the facts the at-a-glance box shows.
 * @param {string} body
 */
export function sectionFacts(body) {
  const lines = body.split("\n");
  const introLines = [];
  for (const line of lines) {
    if (/^(###|- )/.test(line)) break;
    if (line.trim() === "" && introLines.length) break;
    if (line.trim() !== "") introLines.push(line);
  }
  const intro = introLines.join("\n");
  const headings = lines.filter((l) => l.startsWith("### ")).map((l) => l.slice(4).trim());
  const upgrading = headings.find((h) => /^Upgrading from /.test(h)) ?? null;
  const upgradesFrom = upgrading ? upgrading.replace(/^Upgrading from /, "") : null;
  // Top-level list items under ### Known issues.
  let knownIssues = 0;
  let inKnown = false;
  for (const line of lines) {
    if (line.startsWith("### ")) inKnown = line.slice(4).trim() === "Known issues";
    else if (inKnown && line.startsWith("- ")) knownIssues += 1;
  }
  const flatIntro = intro.replace(/\s+/g, " ");
  const mig = /\b(\w+) database migrations \(`([^`]+)` → `([^`]+)`\)/.exec(flatIntro);
  let migrations = null;
  if (mig) {
    const word = mig[1].toLowerCase();
    const count = /^\d+$/.test(word) ? Number(word) : NUMBER_WORDS[word];
    if (count !== undefined) migrations = { count, first: mig[2], last: mig[3] };
  }
  // The leads of the first list: `- **Lead.** text` (an item's wrapped lines joined first).
  const items = [];
  for (const line of lines) {
    if (line.startsWith("### ") && items.length) break;
    if (line.startsWith("- ")) items.push(line.slice(2));
    else if (items.length && /^\s+\S/.test(line)) items[items.length - 1] += ` ${line.trim()}`;
  }
  const leads = items
    .map((item) => /^\*\*(.+?)\*\*/.exec(item)?.[1])
    .filter((lead) => lead !== undefined);
  let title;
  let summary;
  if (intro) {
    const first = firstSentence(intro);
    summary = plain(first);
    title = plain(first.split(/: | — /)[0]).replace(/[.]$/, "");
  } else {
    // A section with no intro (0.6.1: only a Fixed list): its first heading, and its list's leads.
    title = headings[0] ?? "";
    const parts = leads.map((lead, i) => {
      const t = plain(lead).replace(/[.]$/, "");
      return i === 0 ? t : t.replace(/^(A|An|The) /, (a) => a.toLowerCase());
    });
    summary = `${title}: ${parts.join("; ")}.`;
  }
  return { intro, headings, upgradesFrom, knownIssues, migrations, title, summary };
}

/**
 * Split a CHANGELOG.md into its releases, newest first, as written.
 * @param {string} text
 * @returns {{ version: string; date: string; body: string; sourceLines: number }[]}
 */
export function parseChangelog(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = RELEASE_HEADING.exec(lines[i]);
    if (!m) continue;
    let j = i + 1;
    while (j < lines.length && !H2.test(lines[j])) j++;
    const section = lines.slice(i + 1, j);
    while (section.length && section[0].trim() === "") section.shift();
    while (section.length && section[section.length - 1].trim() === "") section.pop();
    out.push({ version: m[1], date: m[2], body: section.join("\n"), sourceLines: section.length });
    i = j - 1;
  }
  return out;
}

const q = (s) => JSON.stringify(s);

/**
 * One release's file: front matter, then the text with the two transformations.
 * @param {{ version: string; date: string; body: string }} release
 * @param {Map<string, Set<string>>} docs
 */
export function releaseFile(release, docs) {
  const waves = dropWaveNumbers(release.body);
  const refs = linkDocRefs(waves.text, docs);
  const facts = sectionFacts(waves.text);
  const fm = [
    "---",
    `version: ${q(release.version)}`,
    `date: ${q(release.date)}`,
    `title: ${q(facts.title)}`,
    `summary: ${q(facts.summary)}`,
    `upgradesFrom: ${facts.upgradesFrom === null ? "null" : q(facts.upgradesFrom)}`,
    facts.migrations
      ? `migrations: { count: ${facts.migrations.count}, first: ${q(facts.migrations.first)}, last: ${q(facts.migrations.last)} }`
      : "migrations: null",
    `knownIssues: ${facts.knownIssues}`,
    `source: ${q(`CHANGELOG.md § [${release.version}] — ${release.date}`)}`,
    "---",
    "",
  ].join("\n");
  const text = `${fm}\n${refs.text}\n`;
  return {
    text,
    facts,
    waves: waves.count,
    linked: refs.linked,
    kept: refs.kept,
    installRefs: (refs.text.match(/`INSTALL(?:\.he)?\.md` §\s?\d+/g) ?? []).length,
    lines: refs.text.split("\n").length,
  };
}

/**
 * The whole sync: returns one row per release (and writes the files unless `dryRun`).
 * @param {{ input: string; out: string; docs: string | null; dryRun?: boolean }} opts
 */
export function syncChangelog({ input, out, docs, dryRun = false }) {
  const releases = parseChangelog(readFileSync(input, "utf8"));
  const docsIndex = readDocsIndex(docs);
  if (!dryRun) mkdirSync(out, { recursive: true });
  const rows = [];
  for (const release of releases) {
    const file = join(out, `${release.version}.md`);
    const made = releaseFile(release, docsIndex);
    const before = existsSync(file) ? readFileSync(file, "utf8") : null;
    const status = before === made.text ? "unchanged" : before === null ? "new" : "changed";
    if (!dryRun && status !== "unchanged") writeFileSync(file, made.text);
    rows.push({
      version: release.version,
      date: release.date,
      status,
      sourceLines: release.sourceLines,
      bodyLines: made.lines,
      waveNumbersDropped: made.waves,
      docRefsLinked: made.linked,
      docRefsKeptAsText: made.kept,
      installRefsKeptAsText: made.installRefs,
      title: made.facts.title,
      summary: made.facts.summary,
      upgradesFrom: made.facts.upgradesFrom,
      migrations: made.facts.migrations,
      knownIssues: made.facts.knownIssues,
    });
  }
  const written = new Set(rows.map((r) => `${r.version}.md`));
  const extra = existsSync(out)
    ? readdirSync(out).filter((f) => f.endsWith(".md") && !written.has(f))
    : [];
  return { rows, extra };
}

function main(argv) {
  const args = [...argv];
  const input = args.shift();
  if (!input || input.startsWith("--")) {
    console.error(
      "usage: node scripts/sync-changelog.mjs <CHANGELOG.md> [--out <dir>] [--docs <dir>]",
    );
    process.exit(2);
  }
  let out = "src/content/changelog/en";
  let docs = "src/content/docs/en";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--out") out = args[++i] ?? out;
    else if (args[i] === "--docs") docs = args[++i] ?? docs;
  }
  const { rows, extra } = syncChangelog({
    input: resolve(input),
    out: resolve(out),
    docs: resolve(docs),
  });
  for (const r of rows) {
    console.log(
      [
        r.version,
        r.date,
        r.status,
        `lines ${r.sourceLines} -> ${r.bodyLines}`,
        `wave numbers dropped ${r.waveNumbersDropped}`,
        `doc refs linked ${r.docRefsLinked}, kept ${r.docRefsKeptAsText}`,
        `INSTALL refs kept ${r.installRefsKeptAsText}`,
        `upgrades from ${r.upgradesFrom ?? "-"}`,
        `migrations ${r.migrations ? r.migrations.count : "-"}`,
        `known issues ${r.knownIssues}`,
      ].join(" | "),
    );
    console.log(`  title: ${r.title}`);
    console.log(`  summary: ${r.summary}`);
  }
  if (extra.length) console.log(`not in this changelog (left as they are): ${extra.join(", ")}`);
  console.log(`FINISHED-sync-changelog ${rows.length} releases`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2));
}
