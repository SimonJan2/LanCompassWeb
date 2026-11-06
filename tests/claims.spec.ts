import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

/**
 * The claims register (docs/claims.md) and the copy that cites it. A source check: it reads the
 * files, so it runs once, in the light project (playwright.config.ts runs it nowhere else).
 *
 *  - The register parses: one row per id (C-<AREA>-<n>), each with a claim, a source at the
 *    release tag, a version and its pages.
 *  - Every id cited in src/content/copy/*.ts and src/content/pages/**\/*.mdx exists, and every
 *    row is cited at least once or marked `unused —` with a reason (and then cited nowhere).
 *  - Every figure in the copy (a count, a duration, a percentage, a ratio, a version) appears in
 *    the claim of a row its sentence cites. FIGURE_ALLOWLIST lists the few that are not product
 *    claims, each with its reason.
 *
 * How a citation reaches a string: in a .ts copy file, `// C-X-1` on its own line covers the
 * next line (or the next two, when the next one only names a key) and, when that line opens an
 * object or an array, everything inside it; a trailing `// C-X-1` covers its own line. In .mdx,
 * `{/* C-X-1 *\/}` covers its own block and, alone in a block, the blocks after it up to the
 * next heading or the next citation.
 */

const root = process.cwd();
const ID = /C-[A-Z]+-\d+/g;

interface Row {
  id: string;
  claim: string;
  source: string;
  since: string;
  pages: string;
}

function readRegister(): Row[] {
  const text = readFileSync(join(root, "docs", "claims.md"), "utf8");
  const rows: Row[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^\|\s*(C-[A-Z]+-\d+)\s*\|(.*)\|\s*$/);
    if (!m) continue;
    const cells = m[2]!.split(" | ").map((c) => c.trim());
    const [claim = "", source = "", since = "", pages = ""] = cells;
    rows.push({ id: m[1]!, claim, source, since, pages });
  }
  return rows;
}

/** Figures in a piece of copy: digit runs with their decimal and thousands separators. */
function figures(text: string): string[] {
  const plain = text
    .replace(/<[^>]+>/g, " ")
    .replace(/\{(version|date)\}/g, " ")
    .replace(/[⁦-⁩‎‏]/g, "");
  return [...plain.matchAll(/\d+(?:[.,]\d+)*/g)].map((m) => m[0]);
}

const norm = (figure: string) => figure.replace(/,(?=\d{3}\b)/g, "");

interface Cited {
  file: string;
  line: number;
  text: string;
  ids: string[];
}

/** String literals of a .ts copy file, each with the ids that cite it. */
function citedStrings(file: string): Cited[] {
  const lines = readFileSync(file, "utf8").split("\n");
  const out: Cited[] = [];
  const stack: string[][] = [];
  let pending: string[] = [];
  let inBlockComment = false;
  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (inBlockComment) {
      if (line.includes("*/")) inBlockComment = false;
      return;
    }
    if (line.startsWith("/*")) {
      if (!line.includes("*/")) inBlockComment = true;
      return;
    }
    if (line.startsWith("//")) {
      pending = [...pending, ...(line.match(ID) ?? [])];
      return;
    }
    const strings = [...raw.matchAll(/"((?:[^"\\]|\\.)*)"(\s*:)?/g)];
    const code = raw.replace(/"((?:[^"\\]|\\.)*)"/g, '""');
    const trailing = code.includes("//") ? (code.slice(code.indexOf("//")).match(ID) ?? []) : [];
    const inherited = stack.flat();
    const ids = [...new Set([...inherited, ...pending, ...trailing])];
    for (const s of strings) {
      if (s[2]) continue; // a quoted key, such as "design-partners":
      out.push({ file, line: index + 1, text: JSON.parse(`"${s[1]}"`), ids });
    }
    const body = code.split("//")[0]!;
    for (const ch of body) {
      if (ch === "{" || ch === "[") stack.push([...pending, ...trailing]);
      else if (ch === "}" || ch === "]") stack.pop();
    }
    // A key on its own line ("description:") hands its citation to the value on the next line.
    if (!/:\s*$/.test(body)) pending = [];
  });
  return out;
}

/** Blocks of an .mdx page, each with the ids that cite it. Frontmatter title and lead count. */
function citedBlocks(file: string): Cited[] {
  const text = readFileSync(file, "utf8");
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
  const out: Cited[] = [];
  for (const key of ["title", "lead"]) {
    const value = fm?.[1]!.match(new RegExp(`^${key}: (.*)$`, "m"))?.[1];
    if (value) out.push({ file, line: 1, text: value, ids: [] });
  }
  const body = fm ? text.slice(fm[0].length) : text;
  let carry: string[] = [];
  for (const block of body.split(/\n\s*\n/)) {
    const trimmed = block.trim();
    if (!trimmed || trimmed.startsWith("import ")) continue;
    const comments = [...trimmed.matchAll(/\{\/\*([\s\S]*?)\*\/\}/g)];
    const own = comments.flatMap((c) => c[1]!.match(ID) ?? []);
    const prose = trimmed.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").trim();
    if (trimmed.startsWith("#")) carry = [];
    if (!prose) {
      if (own.length) carry = own;
      continue;
    }
    out.push({ file, line: 0, text: prose, ids: [...new Set([...carry, ...own])] });
  }
  return out;
}

const copyFiles = ["en.ts", "he.ts"].map((f) => join(root, "src", "content", "copy", f));

/** W5: the videos' captions, cards and "What the video shows" lists (src/content/videos.json):
 *  every line names its rows in `claims`, in English and in Hebrew. */
const videoFile = join(root, "src", "content", "videos.json");
interface VideoLine {
  en: string;
  he: string;
  claims?: string[];
}
function videoLines(): Cited[] {
  const data = JSON.parse(readFileSync(videoFile, "utf8")) as Record<
    string,
    { title: VideoLine; takeaway: VideoLine; steps: VideoLine[] }
  >;
  return Object.entries(data)
    .filter(([key]) => !key.startsWith("$"))
    .flatMap(([key, b]) =>
      [b.title, b.takeaway, ...b.steps].flatMap((line, i) =>
        (["en", "he"] as const).map((lang) => ({
          file: `${videoFile} ${key} line ${i + 1} ${lang}`,
          line: 0,
          text: line[lang],
          ids: line.claims ?? [],
        })),
      ),
    );
}
const mdxFiles = readdirSync(join(root, "src", "content", "pages")).flatMap((locale) =>
  readdirSync(join(root, "src", "content", "pages", locale))
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => join(root, "src", "content", "pages", locale, f)),
);

/** Figures that are not claims about the product, with the reason each one is here. */
const FIGURE_ALLOWLIST: { match: RegExp; reason: string }[] = [
  {
    match: /^(10\.20\.0\.0\/16|10\.20\.12\.0\/24 · lobby|sw-core-02 → ap-lobby-3)$/,
    reason: "labels drawn on the hero's Two sheets illustration, not product claims",
  },
  { match: /^404$/, reason: "the HTTP status of the not-found page" },
  {
    match: /WCAG 2\.1.*5568/,
    reason: "the accessibility page's metadata: the standards this site meets (a legal page)",
  },
  {
    match: /DC-A01/,
    reason: "the demo estate's rack name, shown in the hebrew-native video (a label, not a claim)",
  },
];
/** Whole files outside the product's claims: the legal pages (W10 owns their wording). */
const FILE_ALLOWLIST: { match: RegExp; reason: string }[] = [
  {
    match: /\/(accessibility|privacy)\.mdx$/,
    reason:
      "legal pages: their figures are the standards, dates and contrast ratios of this site itself",
  },
];

test.describe("claims register", () => {
  const rows = readRegister();
  const byId = new Map(rows.map((r) => [r.id, r]));
  const cited = [
    ...copyFiles.flatMap(citedStrings),
    ...mdxFiles.flatMap(citedBlocks),
    ...videoLines(),
  ];

  test("every video line (caption, card, step) cites at least one row (W5)", () => {
    const lines = videoLines();
    expect(lines.length).toBe(3 * 7 * 2);
    expect(lines.filter((l) => l.ids.length === 0).map((l) => l.file)).toEqual([]);
  });

  test("the register parses: unique ids, each row with a claim, a source, a version and pages", () => {
    expect(rows.length).toBeGreaterThan(60);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    for (const r of rows) {
      expect(r.claim.length, r.id).toBeGreaterThan(10);
      expect(r.source, `${r.id} source`).toMatch(/\S/);
      expect(r.since, `${r.id} since`).toMatch(/^0\.\d+\.\d+$/);
      expect(r.pages, `${r.id} pages`).toMatch(/\S/);
    }
  });

  test("every cited id exists in the register", () => {
    const unknown = cited.flatMap((c) =>
      c.ids.filter((id) => !byId.has(id)).map((id) => `${c.file}:${c.line} cites ${id}`),
    );
    expect(unknown).toEqual([]);
  });

  test("every row is cited, or marked unused with a reason (and then cited nowhere)", () => {
    const citedIds = new Set(cited.flatMap((c) => c.ids));
    const problems: string[] = [];
    for (const r of rows) {
      const unused = /^unused — \S/.test(r.pages);
      if (!unused && !citedIds.has(r.id)) problems.push(`${r.id} is never cited`);
      if (unused && citedIds.has(r.id)) problems.push(`${r.id} is marked unused but cited`);
    }
    expect(problems).toEqual([]);
  });

  test("every figure in the copy appears in a row its sentence cites", () => {
    const failures: string[] = [];
    for (const c of cited) {
      if (FILE_ALLOWLIST.some((a) => a.match.test(c.file))) continue;
      if (FIGURE_ALLOWLIST.some((a) => a.match.test(c.text))) continue;
      const claimFigures = new Set(
        c.ids.flatMap((id) => figures(byId.get(id)?.claim ?? "")).map(norm),
      );
      for (const figure of figures(c.text)) {
        if (!claimFigures.has(norm(figure)))
          failures.push(
            `${c.file.replace(root, "")}:${c.line} "${figure}" not in ${c.ids.join(", ") || "(no citation)"}: ${c.text.slice(0, 90)}`,
          );
      }
    }
    expect(failures).toEqual([]);
  });

  test("the parser sees the citations it should (a self-check)", () => {
    const en = citedStrings(copyFiles[0]!);
    const datasheet = en.find((c) => c.text.startsWith("24: English and Hebrew complete"));
    expect(datasheet?.ids).toEqual(["C-LANG-1"]);
    const items = en.filter((c) => c.text === "Proxmox");
    expect(items[0]?.ids).toContain("C-INT-1");
    const security = mdxFiles.find((f) => f.endsWith("/en/security.mdx"))!;
    const list = citedBlocks(security).find((b) => b.text.includes("RFC 2136"));
    expect(list?.ids).toEqual(expect.arrayContaining(["C-RO-1", "C-NAC-2"]));
    expect(figures("SNMP <bdi>v1</bdi>, 1,594 and 3.6–4.2+")).toEqual(["1", "1,594", "3.6", "4.2"]);
  });
});
