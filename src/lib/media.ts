import { existsSync } from "node:fs";
import { join } from "node:path";
import { localeCodes, type Locale } from "../i18n/locales";

/** Files the operator drops into public/media/ (see public/media/README.md). */
export interface VideoFiles {
  mp4: string | null;
  webm: string | null;
  poster: string | null;
  captions: { locale: Locale; src: string }[];
}

const mediaDir = join(process.cwd(), "public", "media");

function maybe(file: string): string | null {
  return existsSync(join(mediaDir, file)) ? `/media/${file}` : null;
}

export function videoFiles(key: string): VideoFiles {
  return {
    mp4: maybe(`${key}.mp4`),
    webm: maybe(`${key}.webm`),
    poster: maybe(`${key}.jpg`) ?? maybe(`${key}.webp`),
    captions: localeCodes
      .map((locale) => ({ locale, src: maybe(`${key}.${locale}.vtt`) }))
      .filter((c): c is { locale: Locale; src: string } => c.src !== null),
  };
}
