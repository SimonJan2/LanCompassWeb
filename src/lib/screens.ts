import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SiteTheme } from "../config/site";
import type { Locale } from "../i18n/locales";
import slotTable from "../content/screen-slots.json";

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

/** The kinds of slot that draw a screen (src/content/screen-slots.json, W11). */
export type SlotKind = "news" | "atlas" | "band" | "loop" | "figure";

/** The capture sets a site theme shows: light → Survey, dark → Night chart, auto → both
 *  (Survey first, Night chart behind a prefers-color-scheme: dark source). */
export function screenSets(theme: SiteTheme): ScreenSet[] {
  if (theme === "dark") return ["night-chart"];
  if (theme === "auto") return ["survey", "night-chart"];
  return ["survey"];
}

/** Below this window width a slot loads its phone crop (D-PHONE-SCREENS). */
export const PHONE_MEDIA = `(max-width: ${slotTable.breakpoint - 1}px)`;

/** A served picture: its same-origin path and its size in pixels. */
export interface ServedScreen {
  src: string;
  width: number;
  height: number;
}

/** A WebP file's pixel size, from its header (lossy VP8, lossless VP8L or extended VP8X). */
export function webpSize(b: Buffer): { width: number; height: number } | null {
  if (
    b.length < 30 ||
    b.toString("ascii", 0, 4) !== "RIFF" ||
    b.toString("ascii", 8, 12) !== "WEBP"
  )
    return null;
  const chunk = b.toString("ascii", 12, 16);
  if (chunk === "VP8 ")
    return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  if (chunk === "VP8L") {
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") return { width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1 };
  return null;
}

const publicDir = join(process.cwd(), "public");

/**
 * A served screen, /screens/<set>/<locale>/<file>, or null while it is missing. The capture
 * script derives these files from its record (media-library/screens/) at exactly the size each
 * slot draws them at device scale 2; they keep stable, same-origin paths, so a page's image URLs
 * cost almost nothing in its first round trip (W11: hashed URLs did not fit /he/ and
 * /he/product/).
 */
export function servedScreen(set: ScreenSet, locale: Locale, file: string): ServedScreen | null {
  const rel = `screens/${set}/${locale}/${file}`;
  const path = join(publicDir, rel);
  if (!existsSync(path)) return null;
  const size = webpSize(readFileSync(path));
  return size ? { src: `/${rel}`, ...size } : null;
}

/** A slot's two pictures of a key in one set: the crop a desktop draws (for the loop, the whole
 *  window) and, where the slot has one, the phone crop. */
export function slotPictures(
  slot: SlotKind,
  set: ScreenSet,
  locale: Locale,
  screen: ScreenKey,
): { desktop: ServedScreen | null; phone: ServedScreen | null } {
  const hasPhone = slotTable.slots[slot].phone !== null;
  return {
    desktop: servedScreen(set, locale, `${screen}.${slot}.webp`),
    phone: hasPhone ? servedScreen(set, locale, `${screen}.${slot}-phone.webp`) : null,
  };
}

/** The whole window of a key, 2880 px wide: a cropped figure's "Open the full screen". */
export function fullWindow(set: ScreenSet, locale: Locale, screen: ScreenKey): ServedScreen | null {
  return servedScreen(set, locale, `${screen}.webp`);
}

export function isScreenKey(value: string | null | undefined): value is ScreenKey {
  return value != null && (screenKeys as readonly string[]).includes(value);
}
