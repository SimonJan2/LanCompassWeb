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

/** The kinds of slot that draw a screen (src/content/screen-slots.json, W11). W13's showcase adds
 *  three that draw both sets in every build: the sweep (the home), the slider (/product) and the
 *  twin frames (/pilot, and the sweep's still state). */
export type SlotKind = "news" | "atlas" | "band" | "loop" | "figure" | "sweep" | "compare" | "twin";

/** A slot's picture: its size, and (W13) the slot whose file it reuses (`from`), if any. */
interface SlotPicture {
  width: number;
  height: number;
  serve: number;
  quality?: number;
  from?: string;
}

interface Slot {
  keys: string[];
  crop: SlotPicture | null;
  full?: SlotPicture;
  phone: SlotPicture | null;
  /** W13: the slot draws both sets in every build (a light or dark build keeps these files). */
  both?: boolean;
}

const slots = slotTable.slots as unknown as Record<SlotKind, Slot>;

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

/** The served file names of a slot's two pictures of a key: the desktop crop (or, for a slot that
 *  draws the whole window, `<key>.<slot>.webp` at the slot's serve width) and the phone crop. A
 *  picture with `from` reuses that picture's file (W13: the showcase draws the crops W11 cut). */
function slotFiles(slot: SlotKind, screen: string): { desktop: string; phone: string | null } {
  const s = slots[slot];
  const desktop = s.crop?.from ?? slot;
  const phone = s.phone ? (s.phone.from ?? `${slot}-phone`) : null;
  return {
    desktop: `${screen}.${desktop}.webp`,
    phone: phone ? `${screen}.${phone}.webp` : null,
  };
}

/** A slot's two pictures of a key in one set: the crop a desktop draws (for the loop, the sweep
 *  and the slider, the whole window) and, where the slot has one, the phone crop. */
export function slotPictures(
  slot: SlotKind,
  set: ScreenSet,
  locale: Locale,
  screen: ScreenKey,
): { desktop: ServedScreen | null; phone: ServedScreen | null } {
  const files = slotFiles(slot, screen);
  return {
    desktop: servedScreen(set, locale, files.desktop),
    phone: files.phone ? servedScreen(set, locale, files.phone) : null,
  };
}

/**
 * W13: the served files every build carries in both sets (astro.config.mjs → screensForTheme): the
 * pictures of the slots that draw both sets (`both` in screen-slots.json: the sweep, the slider,
 * the twin frames) and each /product figure's two crops, which its Survey | Night chart switch
 * shows in the other set on request. File names only (the same in every locale).
 */
export function bothSetFiles(): string[] {
  const out = new Set<string>();
  for (const [slot, s] of Object.entries(slots) as [SlotKind, Slot][]) {
    if (!s.both && slot !== "figure") continue;
    for (const key of s.keys) {
      const files = slotFiles(slot, key);
      out.add(files.desktop);
      if (files.phone) out.add(files.phone);
    }
  }
  return [...out].sort();
}

/** The whole window of a key, 2880 px wide: a cropped figure's "Open the full screen". */
export function fullWindow(set: ScreenSet, locale: Locale, screen: ScreenKey): ServedScreen | null {
  return servedScreen(set, locale, `${screen}.webp`);
}

export function isScreenKey(value: string | null | undefined): value is ScreenKey {
  return value != null && (screenKeys as readonly string[]).includes(value);
}
