import type { ImageMetadata } from "astro";
import type { SiteTheme } from "../config/site";
import type { Locale } from "../i18n/locales";

/** The product screens the capture script records, by key (DECISIONS.md D-SCREENS). A key
 *  with no capture renders the placeholder frame (ScreenshotFrame.astro). */
export const screenKeys = [
  "dashboard",
  "ipam-tree",
  "rack",
  "topology-observed",
  "review",
  "nac",
  "compliance",
  "discovery-queue",
  "map-ages",
  "ask-the-map",
  "design-studio",
  "rack-studio",
  "ip-plan",
  "licence",
  "gallery",
] as const;

export type ScreenKey = (typeof screenKeys)[number];

/** The product theme a capture was taken in: Survey (the product's default light theme) or
 *  Night chart (its default dark theme), the site's own pair (W3). */
export type ScreenSet = "survey" | "night-chart";

const files = import.meta.glob<ImageMetadata>("../assets/screens/*/*/*.png", {
  eager: true,
  import: "default",
});

/** The capture sets a site theme shows: light → Survey, dark → Night chart, auto → both
 *  (Survey first, Night chart behind a prefers-color-scheme: dark source). */
export function screenSets(theme: SiteTheme): ScreenSet[] {
  if (theme === "dark") return ["night-chart"];
  if (theme === "auto") return ["survey", "night-chart"];
  return ["survey"];
}

/** Which capture a slot shows: the full window, or the focus crop around the screen's main
 *  element (`<key>.focus.png`) for slots narrower than the window. */
export type ScreenVariant = "full" | "focus";

/** The captured screenshot for a theme, locale and screen, or null while it is missing. A
 *  focus slot falls back to the full window while its crop is missing. */
export function findScreen(
  theme: SiteTheme | ScreenSet,
  locale: Locale,
  screen: ScreenKey,
  variant: ScreenVariant = "full",
): ImageMetadata | null {
  const set: ScreenSet = theme === "dark" || theme === "night-chart" ? "night-chart" : "survey";
  const dir = `../assets/screens/${set}/${locale}`;
  const crop = variant === "focus" ? files[`${dir}/${screen}.focus.png`] : undefined;
  return crop ?? files[`${dir}/${screen}.png`] ?? null;
}

export function isScreenKey(value: string | null | undefined): value is ScreenKey {
  return value != null && (screenKeys as readonly string[]).includes(value);
}
