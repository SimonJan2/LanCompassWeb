import { existsSync } from "node:fs";
import { join } from "node:path";
import type { SiteTheme } from "../config/site";
import { localeCodes, type Locale } from "../i18n/locales";

/**
 * Video files in public/media/<set>/ (see public/media/README.md):
 *   <key>.<ui>.webm (or .mp4)   the recording, <ui> = the product's interface language
 *   <key>.<ui>.webp (or .jpg)   its poster
 *   <key>.<ui>.<lang>.vtt       captions in en and he, timed to that recording
 * <set> is the product theme it was recorded in: light, or nightwire (dark builds).
 */
export type MediaSet = "light" | "nightwire";

export interface VideoFiles {
  set: MediaSet;
  ui: Locale;
  mp4: string | null;
  webm: string | null;
  poster: string | null;
  captions: { locale: Locale; src: string }[];
}

/** Videos whose interface is always one language, whatever the page locale. */
const fixedUi: Record<string, Locale> = { "hebrew-native": "he" };

const mediaDir = join(process.cwd(), "public", "media");

function maybe(file: string): string | null {
  return existsSync(join(mediaDir, file)) ? `/media/${file}` : null;
}

function variant(key: string, set: MediaSet, ui: Locale): VideoFiles {
  const stem = `${set}/${key}.${ui}`;
  return {
    set,
    ui,
    mp4: maybe(`${stem}.mp4`),
    webm: maybe(`${stem}.webm`),
    poster: maybe(`${stem}.webp`) ?? maybe(`${stem}.jpg`),
    captions: localeCodes
      .map((locale) => ({ locale, src: maybe(`${stem}.${locale}.vtt`) }))
      .filter((c): c is { locale: Locale; src: string } => c.src !== null),
  };
}

export const hasVideo = (files: VideoFiles) => files.mp4 !== null || files.webm !== null;

/**
 * The recording for a media set and page locale. Resolution order: theme, then locale,
 * then fallback — the set's variant in the page's language (or the video's fixed
 * language), the set's other languages, then the same order in the other set. Returns the
 * first variant that exists, or the preferred (empty) one while none does.
 */
export function videoFiles(key: string, set: MediaSet, locale: Locale): VideoFiles {
  const preferred = fixedUi[key] ?? locale;
  const order = [preferred, ...localeCodes.filter((code) => code !== preferred)];
  const other: MediaSet = set === "light" ? "nightwire" : "light";
  const variants = [set, other].flatMap((s) => order.map((ui) => variant(key, s, ui)));
  return variants.find(hasVideo) ?? variants[0]!;
}

/** The media sets a site theme shows: light → light, dark → Nightwire, auto → both. */
export function mediaSets(theme: SiteTheme): MediaSet[] {
  if (theme === "dark") return ["nightwire"];
  if (theme === "auto") return ["light", "nightwire"];
  return ["light"];
}
