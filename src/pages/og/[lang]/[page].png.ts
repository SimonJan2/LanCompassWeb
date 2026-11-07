import type { APIRoute, GetStaticPaths } from "astro";
import { getEntry } from "astro:content";
import { getCopy } from "../../../content/copy";
import {
  localeCodes,
  locales,
  pageKeys,
  sectionKeys,
  type Locale,
  type PageKey,
  type SectionKey,
} from "../../../i18n";
import { site } from "../../../config/site";
import { renderOgImage } from "../../../lib/og";

/** A section's pages (W8: every release's notes) share the section's card. */
type OgPage = PageKey | SectionKey | "404";

export const getStaticPaths = (() =>
  localeCodes.flatMap((locale) =>
    [...pageKeys, ...sectionKeys, "404" as const].map((page) => ({
      params: { lang: locale, page },
      props: { locale, page },
    })),
  )) satisfies GetStaticPaths;

const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+—\s+LanCompass$/, "");

export const GET: APIRoute = async ({ props }) => {
  const { locale, page } = props as { locale: Locale; page: OgPage };
  const copy = getCopy(locale);
  let eyebrow: string;
  let title: string;
  if (page === "home") {
    eyebrow = copy.home.hero.chips.join(" · ");
    title = copy.home.hero.title;
  } else if (page === "404") {
    eyebrow = copy.notFound.eyebrow;
    title = copy.notFound.title;
  } else if (page === "product") {
    eyebrow = copy.product.eyebrow;
    title = copy.product.title;
  } else if (page === "pilot") {
    eyebrow = copy.pilot.eyebrow;
    title = copy.pilot.title;
  } else if (page === "licensing") {
    eyebrow = copy.licensing.eyebrow;
    title = copy.licensing.title;
  } else if (page === "contact") {
    eyebrow = copy.contact.eyebrow;
    title = copy.contact.lead;
  } else if (page === "videos") {
    eyebrow = copy.videoText.eyebrow;
    title = copy.videoText.title;
  } else if (page === "verify") {
    eyebrow = copy.verify.eyebrow;
    title = copy.verify.title;
  } else if (page === "changelog") {
    eyebrow = copy.changelog.eyebrow;
    title = copy.changelog.title;
  } else if (page === "docs") {
    eyebrow = copy.docs.eyebrow;
    title = copy.docs.title;
  } else {
    const entry = await getEntry("pages", `${locale}/${page}`);
    eyebrow = entry?.data.eyebrow ?? copy.meta[page].title;
    title = entry?.data.title ?? copy.meta[page].title;
  }
  const png = await renderOgImage({
    title: strip(title),
    eyebrow: strip(eyebrow),
    rtl: locales[locale].dir === "rtl",
    // Social cards have no colour scheme: only a dark build gets the night card.
    tone: site.theme === "dark" ? "dark" : "light",
  });
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
};
