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

export const collections = { pages };
