import type { ImageMetadata } from "astro";
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

const files = import.meta.glob<ImageMetadata>("../assets/screens/*/*.png", {
  eager: true,
  import: "default",
});

/** The captured screenshot for a screen and locale, or null while it is missing. */
export function findScreen(locale: Locale, screen: ScreenKey): ImageMetadata | null {
  return files[`../assets/screens/${locale}/${screen}.png`] ?? null;
}

export function isScreenKey(value: string | null | undefined): value is ScreenKey {
  return value != null && (screenKeys as readonly string[]).includes(value);
}
