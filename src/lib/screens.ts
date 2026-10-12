import type { ImageMetadata } from "astro";
import type { SiteTheme } from "../config/site";
import type { Locale } from "../i18n/locales";

/** The product screens the capture script records, by key. */
export const screenKeys = [
  "dashboard",
  "ipam-tree",
  "rack",
  "topology-observed",
  "review",
  "deep-discovery",
  "nac",
  "compliance",
] as const;

export type ScreenKey = (typeof screenKeys)[number];

/** The product theme a capture was taken in: its light theme, or Nightwire (its default). */
export type ScreenSet = "light" | "nightwire";

const files = import.meta.glob<ImageMetadata>("../assets/screens/*/*/*.png", {
  eager: true,
  import: "default",
});

/** The capture sets a site theme shows: light → light, dark → Nightwire, auto → both
 *  (light first, Nightwire behind a prefers-color-scheme: dark source). */
export function screenSets(theme: SiteTheme): ScreenSet[] {
  if (theme === "dark") return ["nightwire"];
  if (theme === "auto") return ["light", "nightwire"];
  return ["light"];
}

/** The captured screenshot for a theme, locale and screen, or null while it is missing. */
export function findScreen(
  theme: SiteTheme | ScreenSet,
  locale: Locale,
  screen: ScreenKey,
): ImageMetadata | null {
  const set: ScreenSet = theme === "dark" || theme === "nightwire" ? "nightwire" : "light";
  return files[`../assets/screens/${set}/${locale}/${screen}.png`] ?? null;
}

export function isScreenKey(value: string | null | undefined): value is ScreenKey {
  return value != null && (screenKeys as readonly string[]).includes(value);
}
