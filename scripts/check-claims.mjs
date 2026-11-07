#!/usr/bin/env node
/**
 * W10: checks docs/claims.md against the product's release tag, read-only, with git.
 *
 *   node scripts/check-claims.mjs <product repo> <tag> [--sample <n> --seed <hex>]
 *
 * For every row of the register it reads the "Source at <tag>" cell and resolves each file it
 * names to a path in the product's tree at the tag, then asks git whether that path exists there
 * (`git cat-file -e <tag>:<path>`; a folder counts). Nothing is checked out and nothing is written.
 *
 * How a source cell is read (split into clauses on the semicolons outside parentheses; quoted
 * evidence — "…" — is dropped first, so a quoted `backups/` or `.env` is not taken for a file):
 *   - "CL"                → CHANGELOG.md; every "§ [x.y.z]" or "§ x.y.z" must be one of its
 *                           `## [x.y.z]` sections, and the words after it ("The map", "Known
 *                           issues") are looked up as a heading or a bold lead in that section;
 *   - "README"            → README.md;
 *   - "Docs `name.md`"    → frontend/src/content/docs/en/name.md (`he/name.md` → the Hebrew twin);
 *                           "§ Heading" after it is looked up as a heading of that article;
 *   - a backticked path   → that path at the tag root (`INSTALL.md` and `INSTALL.he.md` are
 *                           scripts/release/…, as the register's own rows spell them elsewhere);
 *                           `dir/*.md` checks the folder and counts its files;
 *   - files that live in the signed bundle or in a night's evidence, not in the repository
 *     (`MANIFEST.json`, `SHA256SUMS`, `sbom.cdx.json`, `lancompass-release.pub`, `w6-facts/…`,
 *     the product's `dist/`) are listed as "outside the tag" and not failed: night C read them
 *     from the bundle (Reports/WEB_NIGHT_C/w6-facts/).
 * Quoted evidence in a clause ("Every 15 minutes") is looked up, word for word, in the files that
 * clause names ("…" splits a quote into pieces that must each be there; Markdown emphasis, code
 * marks, comment markers and line breaks are ignored).
 * A missing path or CL section fails the run (exit 1). A heading or a quote not found is a
 * note, not a failure: the register may cite loosely, and the twenty-row reading settles it.
 *
 * --sample n --seed hex: also prints n rows picked by a seeded shuffle (mulberry32 over the
 * seed's 32 bits, Fisher–Yates over the rows in file order), so a re-run picks the same rows.
 * W10 seeds it with the start commit's first eight hex digits.
 *
 * Runs on the host (Node 18 is enough). Ends with FINISHED-check-claims.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const positional = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const [repo, tag] = positional;
if (!repo || !tag) {
  console.error(
    "usage: node scripts/check-claims.mjs <product repo> <tag> [--sample n --seed hex]",
  );
  process.exit(2);
}
const sampleSize = Number(flag("--sample") ?? 0);
const seedHex = flag("--seed") ?? "";

const site = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = "frontend/src/content/docs";
/** The bundle's top-level files that the repository keeps under scripts/release/. */
const ALIAS = {
  "INSTALL.md": "scripts/release/INSTALL.md",
  "INSTALL.he.md": "scripts/release/INSTALL.he.md",
  "install.sh": "scripts/release/install.sh",
  "upgrade.sh": "scripts/release/upgrade.sh",
};
/** Named in a source cell, but a file of the signed bundle or of a night's evidence. */
const OUTSIDE = [
  /^MANIFEST\.json$/,
  /^SHA256SUMS(\.sig)?$/,
  /^sbom\.cdx\.json$/,
  /^lancompass-release\.pub$/,
  /^images\.tar\.gz$/,
  /^w6-facts\//,
  /^\d+-[a-z0-9-]+\.txt$/,
  /^dist\/?$/,
  /^lancompass-\d/,
];

const git = (...a) =>
  execFileSync("git", ["-C", repo, ...a], { encoding: "utf8", maxBuffer: 64 << 20 });
const exists = (path) => {
  try {
    execFileSync("git", ["-C", repo, "cat-file", "-e", `${tag}:${path.replace(/\/$/, "")}`], {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
};
const showCache = new Map();
const show = (path) => {
  if (!showCache.has(path)) {
    try {
      showCache.set(path, git("show", `${tag}:${path}`));
    } catch {
      showCache.set(path, "");
    }
  }
  return showCache.get(path);
};
const commit = git("rev-parse", `${tag}^{commit}`).trim();

/** The register's rows, as tests/claims.spec.ts reads them. */
const rows = [];
for (const line of readFileSync(join(site, "docs", "claims.md"), "utf8").split("\n")) {
  const m = line.match(/^\|\s*(C-[A-Z]+-\d+)\s*\|(.*)\|\s*$/);
  if (!m) continue;
  const [claim = "", source = "", since = "", pages = ""] = m[2].split(" | ").map((c) => c.trim());
  rows.push({ id: m[1], claim, source, since, pages });
}

/** Clauses of a source cell: split on ";" outside parentheses and quotes. */
function clauses(cell) {
  const out = [];
  let depth = 0;
  let quoted = false;
  let cur = "";
  for (const ch of cell) {
    if (ch === '"') quoted = !quoted;
    if (!quoted && ch === "(") depth++;
    if (!quoted && ch === ")") depth = Math.max(0, depth - 1);
    if (ch === ";" && depth === 0 && !quoted) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** A clause with its quoted evidence blanked, for reading file names. */
const unquoted = (clause) => clause.replace(/"[^"]*"/g, '""');

/** Markdown reduced to comparable text: no emphasis, code marks, link targets or escapes. */
const plain = (md) =>
  md
    .replace(/^[ \t]*#+[ \t]*/gm, "")
    .toLowerCase()
    .replace(/\]\([^)]*\)/g, "")
    .replace(/[`*_\\[\]]/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/\s+/g, " ");

/** Whether a quoted piece of evidence is in one of the texts, word for word ("…" splits it). */
const quoteFound = (quote, texts) =>
  plain(quote)
    .split(/…|\.\.\./)
    .map((f) => f.trim())
    .filter((f) => f.length >= 4)
    .every((f) => texts.some((t) => plain(t).includes(f)));

const looksLikePath = (t) =>
  !/[\s:=,]/.test(t) &&
  (/\//.test(t) ||
    /\.(md|py|json|ya?ml|ts|txt|pub|sig|sh|gz)$/.test(t) ||
    /^[A-Z][A-Z0-9_]+$/.test(t));

/** Text cut at the first "," "(" "—" ";" or quote, for a heading lookup. */
const headingAfter = (s) =>
  s
    .replace(/^[\s\]]+/, "")
    .split(/[,(—;"]/)[0]
    .replace(/[`_*]/g, "")
    .trim();

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/[`_*"“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** The headings and bold leads of a Markdown text (or of one CHANGELOG section). */
function anchors(md) {
  const out = [];
  for (const line of md.split("\n")) {
    const h = line.match(/^#{1,6}\s+(.*)$/);
    if (h) out.push(norm(h[1]));
    for (const b of line.matchAll(/\*\*([^*]+)\*\*/g)) out.push(norm(b[1]));
  }
  return out;
}

function changelogSection(version) {
  const cl = show("CHANGELOG.md");
  const start = cl.indexOf(`## [${version}]`);
  if (start === -1) return null;
  const next = cl.indexOf("\n## [", start + 5);
  return cl.slice(start, next === -1 ? undefined : next);
}

/** Words after "§": a quoted lead ("The pilot-release arc"), or plain words up to , ( — ;. */
function leadsAfter(rest) {
  const quoted = rest.match(/^\s*((?:"[^"]+"(?:\s*(?:and|,)\s*)?)+)/);
  if (quoted) return [...quoted[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const words = headingAfter(rest.split('"')[0]);
  if (!words || /^\d{4}-/.test(words) || /paragraph|^header$|^the section/i.test(words)) return [];
  return [words];
}

const results = [];
let missing = 0;
for (const row of rows) {
  const checks = [];
  const outside = [];
  const notes = [];
  for (const raw of clauses(row.source)) {
    const clause = unquoted(raw);
    const isDocs = /^Docs\b/.test(clause);
    const isCl = /^CL\b/.test(clause);
    /** The texts this clause cites, for its quoted evidence. */
    const texts = [];
    if (isCl) {
      const ok = exists("CHANGELOG.md");
      checks.push({ path: "CHANGELOG.md", ok });
      const versions = [...raw.matchAll(/§\s*\[?(\d+\.\d+\.\d+)\]?/g)];
      if (versions.length === 0) texts.push(show("CHANGELOG.md"));
      versions.forEach((m, i) => {
        const section = changelogSection(m[1]);
        checks.push({ path: `CHANGELOG.md § [${m[1]}]`, ok: section !== null });
        if (!section) return;
        texts.push(section);
        const end = i + 1 < versions.length ? versions[i + 1].index : raw.length;
        for (const lead of leadsAfter(raw.slice(m.index + m[0].length, end))) {
          const found =
            anchors(section).some((a) => a === norm(lead) || a.startsWith(norm(lead))) ||
            quoteFound(lead, [section]);
          if (!found) notes.push(`CL § ${m[1]}: no heading or lead "${lead}"`);
        }
      });
    }
    if (/^README\b/.test(clause)) {
      checks.push({ path: "README.md", ok: exists("README.md") });
      texts.push(show("README.md"));
    }
    const tokens = [...clause.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    for (const token of tokens) {
      if (!looksLikePath(token)) continue;
      if (OUTSIDE.some((re) => re.test(token))) {
        outside.push(token);
        continue;
      }
      let path = ALIAS[token] ?? token;
      if (/^(en|he)\//.test(token)) path = `${DOCS}/${token}`;
      else if (isDocs && !token.includes("/")) path = `${DOCS}/en/${token}`;
      if (path.includes("*")) {
        const dir = path.slice(0, path.lastIndexOf("/"));
        const ext = path.slice(path.lastIndexOf("*") + 1);
        const ok = exists(dir);
        const count = ok
          ? git("ls-tree", "--name-only", `${tag}:${dir}`)
              .split("\n")
              .filter((n) => n.endsWith(ext)).length
          : 0;
        checks.push({ path: `${path} (${count} files)`, ok: ok && count > 0 });
        continue;
      }
      const ok = exists(path);
      checks.push({ path, ok });
      if (ok && !path.endsWith("/")) texts.push(show(path));
      // "(N files)" after a folder: count its files.
      const n = clause.match(
        new RegExp(`\`${token.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}\`\\s*\\((\\d+) files\\)`),
      );
      if (ok && n && path.endsWith("/")) {
        const count = git("ls-tree", "--name-only", `${tag}:${path.replace(/\/$/, "")}`)
          .split("\n")
          .filter(Boolean).length;
        if (count !== Number(n[1])) notes.push(`${path}: ${count} files, the row says ${n[1]}`);
      }
      // "`x.md` § Heading" (a doc, INSTALL.md, SECURITY.md …): the heading in that file.
      if (ok && path.endsWith(".md")) {
        const after = clause.slice(clause.indexOf(`\`${token}\``) + token.length + 2);
        const sec = after.match(/^\s*§\s*([^§;]*(?:,\s*§[^§;]*)*)/);
        if (sec) {
          for (const part of sec[1].split(/,\s*§\s*/)) {
            // "§ Trust boundaries 3" is item 3 under that heading; "§ 3 step 4" is a numbered section.
            const words = headingAfter(part).replace(/\s+\d+[a-z]?$/, "");
            if (!words || /^\d/.test(words) || /paragraph|^intro$/i.test(words)) continue;
            const found = anchors(show(path)).some(
              (a) => a === norm(words) || a.startsWith(norm(words)) || a.includes(norm(words)),
            );
            if (!found) notes.push(`${path}: no heading "${words}"`);
          }
        }
      }
    }
    // Quoted evidence ("…") must be in a file this clause names, word for word.
    if (texts.length) {
      for (const m of raw.matchAll(/"([^"]{4,})"/g)) {
        if (!quoteFound(m[1], texts)) notes.push(`quote not found in its source: "${m[1]}"`);
      }
    }
  }
  const failed = checks.filter((c) => !c.ok);
  missing += failed.length;
  results.push({ row, checks, outside, notes, failed });
}

console.log(
  `check-claims: ${rows.length} rows in docs/claims.md, against ${tag} (${commit.slice(0, 8)})`,
);
console.log("");
for (const { row, checks, outside, notes, failed } of results) {
  const paths = checks.map((c) => `${c.ok ? "ok" : "MISSING"} ${c.path}`).join(" · ");
  const out = outside.length ? ` · outside the tag: ${outside.join(", ")}` : "";
  console.log(
    `${failed.length ? "FAIL" : "pass"} ${row.id} | ${paths || "no tag path named"}${out}`,
  );
  for (const n of notes) console.log(`     note: ${n}`);
}
const noPath = results.filter((r) => r.checks.length === 0).map((r) => r.row.id);
const totalChecks = results.reduce((n, r) => n + r.checks.length, 0);
const totalNotes = results.reduce((n, r) => n + r.notes.length, 0);
const totalOutside = results.reduce((n, r) => n + r.outside.length, 0);
console.log("");
console.log(
  `rows ${rows.length} · tag paths and sections checked ${totalChecks} · missing ${missing} · rows naming no tag path ${noPath.length}${noPath.length ? ` (${noPath.join(", ")})` : ""} · references outside the tag ${totalOutside} · notes (a heading or a quote not found) ${totalNotes}`,
);

if (sampleSize > 0) {
  if (!/^[0-9a-f]{8}$/i.test(seedHex)) {
    console.error("--seed must be eight hex digits");
    process.exit(2);
  }
  // mulberry32
  let s = parseInt(seedHex, 16) >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const order = rows.map((r) => r.id);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const picked = order.slice(0, sampleSize);
  console.log("");
  console.log(
    `sample: ${sampleSize} rows, seed ${seedHex.toLowerCase()} (mulberry32, Fisher–Yates over file order)`,
  );
  console.log(picked.join(" "));
}
console.log(`FINISHED-check-claims missing=${missing}`);
process.exit(missing ? 1 : 0);
