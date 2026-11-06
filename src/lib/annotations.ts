import type { Locale } from "../i18n/locales";
import type { ScreenKey, ScreenSet, ScreenVariant } from "./screens";

/** One capture anchor, in image pixels (scripts/capture-screenshots.mjs, W3). */
export interface Anchor {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** src/content/screen-anchors.json: set → locale → key → { clip, full, focus }. */
export type AnchorFile = Partial<
  Record<
    ScreenSet,
    Partial<Record<Locale, Partial<Record<string, Partial<Record<ScreenVariant, Anchor[]>>>>>>
  >
>;

/** A mark on a figure, as CSS percentages of the picture: the anchor's box (x, y, w, h). The
 *  numbered mark is centred on the box's starting corner: its top left, or its top right on a
 *  right-to-left page (AnnotatedScreen.astro's CSS). */
export interface Mark {
  name: string;
  text: string;
  x: string;
  y: string;
  w: string;
  h: string;
}

/** The most marks a figure carries (W4's contract: up to four). */
export const MAX_MARKS = 4;

const pct = (value: number, of: number) => `${Math.round((value / of) * 1000) / 10}%`;

/**
 * The marks of one figure: the recorded anchors of the screen, for every set the build ships, in
 * their recorded order, that have a note and lie in the visible picture. Nothing is ever placed
 * by hand: with no anchors for a set or locale, or when the sets an auto build ships disagree,
 * the figure gets no marks (it keeps its caption).
 */
export function figureMarks(
  file: AnchorFile,
  opts: {
    sets: ScreenSet[];
    locale: Locale;
    screen: ScreenKey | string;
    variant: ScreenVariant;
    notes: Record<string, string>;
    /** The picture's size in image pixels; height is the visible height (a wide crop's band). */
    width: number;
    height: number;
  },
): Mark[] {
  const lists = opts.sets.map((set) => file[set]?.[opts.locale]?.[opts.screen]?.[opts.variant]);
  const first = lists[0];
  if (!first || lists.some((l) => JSON.stringify(l) !== JSON.stringify(first))) return [];
  return first
    .filter((a) => opts.notes[a.name] && a.y < opts.height && a.x < opts.width)
    .slice(0, MAX_MARKS)
    .map((a) => {
      const w = Math.min(a.w, opts.width - a.x);
      const h = Math.min(a.h, opts.height - a.y);
      return {
        name: a.name,
        text: opts.notes[a.name]!,
        x: pct(a.x, opts.width),
        y: pct(a.y, opts.height),
        w: pct(w, opts.width),
        h: pct(h, opts.height),
      };
    });
}
