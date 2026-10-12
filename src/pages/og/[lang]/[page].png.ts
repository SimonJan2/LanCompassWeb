import type { APIRoute, GetStaticPaths } from "astro";
import { getEntry } from "astro:content";
import { getCopy } from "../../../content/copy";
import { localeCodes, locales, pageKeys, type Locale, type PageKey } from "../../../i18n";
import { site } from "../../../config/site";
import { renderOgImage } from "../../../lib/og";

type OgPage = PageKey | "404";

export const getStaticPaths = (() =>
  localeCodes.flatMap((locale) =>
    [...pageKeys, "404" as const].map((page) => ({
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
  } else if (page === "design-partners") {
    eyebrow = copy.partners.eyebrow;
    title = copy.partners.title;
  } else if (page === "contact") {
    eyebrow = copy.contact.eyebrow;
    title = copy.contact.lead;
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
