import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/** Long-form pages, one MDX file per page and locale: `src/content/pages/<locale>/<page>.mdx`. */
const pages = defineCollection({
  loader: glob({ pattern: "*/*.mdx", base: "./src/content/pages" }),
  schema: z.object({
    eyebrow: z.string(),
    title: z.string(),
    lead: z.string(),
    updated: z.string(),
    /** Shows a visible TODO(operator) legal-review marker above the text. */
    legalReview: z.boolean().default(false),
  }),
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "an ISO date, YYYY-MM-DD");
const semver = z.string().regex(/^\d+\.\d+\.\d+$/, "a version, x.y.z");

/**
 * W8: the release notes, one file per release and locale: `src/content/changelog/<locale>/
 * <version>.md`. The English files are written by scripts/sync-changelog.mjs from the product's
 * CHANGELOG.md at the release tag (the product's words; never edit them by hand). The Hebrew
 * files are written natively per release (DECISIONS.md D-NOTES-HE): the headline changes, the
 * upgrade steps in full and every known issue, shortened. A malformed file fails the build.
 */
const changelog = defineCollection({
  // The id is `<locale>/<version>`, as written (the default slug would turn 0.7.0 into 070).
  loader: glob({
    pattern: "*/*.md",
    base: "./src/content/changelog",
    generateId: ({ entry }) => entry.replace(/\.md$/, ""),
  }),
  schema: z
    .object({
      version: semver,
      date: isoDate,
      title: z.string().min(1),
      summary: z.string().min(1),
      /** English (from the notes): the version the Upgrading section upgrades from. */
      upgradesFrom: semver.nullable().optional(),
      /** English (from the notes): the database migrations the opening paragraph counts. */
      migrations: z
        .object({ count: z.number().int().positive(), first: z.string(), last: z.string() })
        .nullable()
        .optional(),
      /** English (from the notes): the top-level items under Known issues. */
      knownIssues: z.number().int().nonnegative().optional(),
      /** English: the section of CHANGELOG.md the file was copied from. */
      source: z.string().optional(),
      /** Hebrew: the day its summary was last written (the English notes are authoritative). */
      written: isoDate.optional(),
    })
    .strict(),
});

/** W9: the product's seven docs categories, in its order (registry.json at the release tag). */
const docsCategories = [
  "getting-started",
  "how-to",
  "ipam",
  "inventory",
  "integrations",
  "operations",
  "system",
] as const;

/**
 * W9: the product's built-in docs at its release tag, in English and Hebrew: `src/content/docs/
 * <locale>/<slug>.md`, written by scripts/sync-docs.mjs (the product's words; never edit them by
 * hand). Front matter: the product's own (title, description, category, keywords) and what the
 * sync adds: the version, the article's place in the product's registry, and for a translation
 * `stale` (the English article changed after it was translated). A malformed file fails the build.
 */
const docs = defineCollection({
  loader: glob({
    pattern: "*/*.md",
    base: "./src/content/docs",
    generateId: ({ entry }) => entry.replace(/\.md$/, ""),
  }),
  schema: z
    .object({
      title: z.string().min(1),
      description: z.string().min(1),
      category: z.enum(docsCategories),
      keywords: z.string().optional(),
      version: semver,
      order: z.number().int().nonnegative(),
      stale: z.boolean().optional(),
    })
    .strict(),
});

export const collections = { pages, changelog, docs };
