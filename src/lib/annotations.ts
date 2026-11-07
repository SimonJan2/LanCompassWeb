import type { Locale } from "../i18n/locales";
import type { ScreenKey, ScreenSet } from "./screens";

/** One capture anchor, in units of 2 per CSS px inside its picture
 *  (scripts/capture-screenshots.mjs). */
export interface Anchor {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A crop's clip in the product's window, CSS px. */
export interface Clip {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** One key's anchors in one set and locale: per picture ("full", "figure", "figure-phone", …)
 *  the named anchors inside it, and each crop's clip. */
export type AnchorEntry = { clips?: Record<string, Clip> } & {
  [picture: string]: Anchor[] | Record<string, Clip> | undefined;
};

/** src/content/screen-anchors.json: set → locale → key → { clips, full, <picture>… }. */
export type AnchorFile = Partial<
  Record<ScreenSet, Partial<Record<Locale, Partial<Record<string, AnchorEntry>>>>>
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

/**
 * The pictures AnnotatedScreen draws marks on (W11): /product's figures show the desktop crop
 * above the breakpoint and the phone crop below it, so each mark has one position per picture,
 * a class with the picture's prefix, and its rule inside the picture's media query. A note whose
 * anchor is not in a picture gets the prefix's `-0` class: no mark at that width.
 */
export const MARKED_PICTURES = [
  { picture: "figure", prefix: "fm", media: "(min-width: 960px)" },
  { picture: "figure-phone", prefix: "fp", media: "(max-width: 959px)" },
] as const;

export type MarkedPicture = (typeof MARKED_PICTURES)[number]["picture"];

/**
 * A mark's position as a short class name. The site's CSP has no 'unsafe-inline', so a mark
 * cannot carry its position in a style attribute (the browser drops it behind nginx); the class
 * names a rule in the page's own stylesheet instead (markRules, through astro.config.mjs).
 * FNV-1a over the four values: the same position is the same class on every page and build.
 */
export function markClass(m: Pick<Mark, "x" | "y" | "w" | "h">, prefix = "fm"): string {
  const key = `${m.x};${m.y};${m.w};${m.h}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${prefix}-${hash.toString(36)}`;
}

/** A picture's size in anchor units (its clip × 2), from the first set's record; null when the
 *  key, set, locale or picture has no clip. */
export function pictureSize(
  file: AnchorFile,
  set: ScreenSet,
  locale: Locale,
  screen: string,
  picture: string,
): { width: number; height: number } | null {
  const clip = file[set]?.[locale]?.[screen]?.clips?.[picture];
  return clip ? { width: clip.width * 2, height: clip.height * 2 } : null;
}

const pct = (value: number, of: number) => `${Math.round((value / of) * 1000) / 10}%`;

/**
 * The marks of one picture: the recorded anchors of the screen, for every set the build ships, in
 * their recorded order, that have a note and lie in the visible picture. Nothing is ever placed
 * by hand: with no anchors for a set or locale, or when the sets an auto build ships disagree,
 * the picture gets no marks (the figure keeps its caption and its legend).
 */
export function figureMarks(
  file: AnchorFile,
  opts: {
    sets: ScreenSet[];
    locale: Locale;
    screen: ScreenKey | string;
    picture: string;
    notes: Record<string, string>;
    /** The picture's size in anchor units; height is the visible height (a wide crop's band). */
    width: number;
    height: number;
  },
): Mark[] {
  const lists = opts.sets.map(
    (set) => file[set]?.[opts.locale]?.[opts.screen]?.[opts.picture] as Anchor[] | undefined,
  );
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

/** One note of a figure: its text, and its mark in each marked picture (absent where the
 *  picture does not hold the note's anchor). */
export interface FigureNote {
  name: string;
  text: string;
  marks: Partial<Record<MarkedPicture, Mark>>;
}

/**
 * A figure's notes, in the copy's order (up to MAX_MARKS): every note keeps its legend item at
 * every width; its mark appears in the pictures whose crop holds its anchor (W11: "a crop that
 * loses a note's thing loses the mark, not the note").
 */
export function figureNotes(
  file: AnchorFile,
  opts: {
    sets: ScreenSet[];
    locale: Locale;
    screen: ScreenKey | string;
    notes: Record<string, string>;
  },
): FigureNote[] {
  return Object.entries(opts.notes)
    .slice(0, MAX_MARKS)
    .map(([name, text]) => {
      const marks: Partial<Record<MarkedPicture, Mark>> = {};
      for (const { picture } of MARKED_PICTURES) {
        const size = pictureSize(file, opts.sets[0]!, opts.locale, opts.screen, picture);
        if (!size) continue;
        const [m] = figureMarks(file, { ...opts, picture, notes: { [name]: text }, ...size });
        if (m) marks[picture] = m;
      }
      return { name, text, marks };
    });
}

/**
 * The stylesheet that places every mark a build can draw: for each locale, each screen with
 * notes and each note, its mark in each marked picture, as one rule `.fm-…{--x:…;--y:…;--w:…;
 * --h:…}` inside the picture's media query (the span's custom properties reach its frame and its
 * link). Two positions with one class fail the build.
 */
export function markRules(
  file: AnchorFile,
  opts: {
    sets: ScreenSet[];
    locales: readonly Locale[];
    notes: (locale: Locale) => Record<string, { notes: Record<string, string> }>;
  },
): string {
  const blocks: string[] = [];
  for (const { picture, prefix, media } of MARKED_PICTURES) {
    const rules = new Map<string, string>();
    for (const locale of opts.locales) {
      for (const [screen, figure] of Object.entries(opts.notes(locale))) {
        for (const note of figureNotes(file, {
          sets: opts.sets,
          locale,
          screen,
          notes: figure.notes,
        })) {
          const m = note.marks[picture];
          if (!m) continue;
          const cls = markClass(m, prefix);
          const rule = `.${cls}{--x:${m.x};--y:${m.y};--w:${m.w};--h:${m.h}}`;
          const before = rules.get(cls);
          if (before !== undefined && before !== rule) {
            throw new Error(`markClass: two positions share ${cls}: ${before} / ${rule}`);
          }
          rules.set(cls, rule);
        }
      }
    }
    blocks.push(
      `@media ${media}{\n${[...rules.values()].sort().join("\n")}\n.${prefix}-0{display:none}\n}`,
    );
  }
  return blocks.join("\n");
}
