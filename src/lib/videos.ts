import videos from "../content/videos.json";
import type { Locale } from "../i18n/locales";

/** One line of a storyboard (src/content/videos.json): a card or a step, in en and he, with the
 *  docs/claims.md rows it rests on. */
export interface VideoLine {
  en: string;
  he: string;
  claims: string[];
}

export interface Storyboard {
  title: VideoLine;
  takeaway: VideoLine;
  steps: (VideoLine & { seconds: number; poster?: boolean })[];
}

/** The three videos' storyboards: what scripts/record-video.mjs records and captions, and what
 *  the site's "What the video shows" lists say. */
export const storyboards = Object.fromEntries(
  Object.entries(videos).filter(([key]) => !key.startsWith("$")),
) as Record<string, Storyboard>;

/** Latin runs inside Hebrew text, bidi-isolated for the page (docs/copy/he-voice.md). */
const LATIN = /[A-Za-z][A-Za-z0-9./-]*(?:[ -][A-Za-z0-9][A-Za-z0-9./-]*)*/g;
const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);

/** A step's line as page HTML in a locale: escaped, and in Hebrew each Latin run in <bdi>. */
export function stepHtml(line: VideoLine, locale: Locale): string {
  const text = line[locale];
  if (locale !== "he") return escapeHtml(text);
  let out = "";
  let at = 0;
  for (const m of text.matchAll(LATIN)) {
    out += `${escapeHtml(text.slice(at, m.index))}<bdi>${escapeHtml(m[0])}</bdi>`;
    at = m.index + m[0].length;
  }
  return out + escapeHtml(text.slice(at));
}
