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

/**
 * The pictures AnnotatedScreen draws marks on: /product shows full windows, uncropped. The build
 * writes a position rule for exactly these (markRules); a figure asked for another variant or
 * crop fails the build until it is added here.
 */
export const MARKED_PICTURES: readonly { variant: ScreenVariant; crop: "full" | "wide" }[] = [
  { variant: "full", crop: "full" },
];

/**
 * A mark's position as a short class name. The site's CSP has no 'unsafe-inline', so a mark
 * cannot carry its position in a style attribute (the browser drops it behind nginx); the class
 * names a rule in the page's own stylesheet instead (markRules, through astro.config.mjs).
 * FNV-1a over the four values: the same position is the same class on every page and build.
 */
export function markClass(m: Pick<Mark, "x" | "y" | "w" | "h">): string {
  const key = `${m.x};${m.y};${m.w};${m.h}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fm-${hash.toString(36)}`;
}

/**
 * The stylesheet that places every mark a build can draw: for each locale, each screen with
 * notes, each anchor that has a note and each picture in MARKED_PICTURES, the mark figureMarks
 * makes, as one rule `.fm-…{--x:…;--y:…;--w:…;--h:…}` (the span's custom properties reach its
 * frame and its link). `size` gives a picture's size in
 * image pixels (null when it is not captured). Two positions with one class fail the build.
 */
export function markRules(
  file: AnchorFile,
  opts: {
    sets: ScreenSet[];
    locales: readonly Locale[];
    notes: (locale: Locale) => Record<string, { notes: Record<string, string> }>;
    size: (
      locale: Locale,
      screen: string,
      variant: ScreenVariant,
    ) => { width: number; height: number } | null;
  },
): string {
  const rules = new Map<string, string>();
  for (const locale of opts.locales) {
    for (const [screen, figure] of Object.entries(opts.notes(locale))) {
      for (const { variant, crop } of MARKED_PICTURES) {
        const size = opts.size(locale, screen, variant);
        if (!size) continue;
        for (const name of Object.keys(figure.notes)) {
          const marks = figureMarks(file, {
            sets: opts.sets,
            locale,
            screen,
            variant,
            notes: { [name]: figure.notes[name]! },
            width: size.width,
            height: crop === "wide" ? size.width / 2 : size.height,
          });
          for (const m of marks) {
            const cls = markClass(m);
            const rule = `.${cls}{--x:${m.x};--y:${m.y};--w:${m.w};--h:${m.h}}`;
            const before = rules.get(cls);
            if (before !== undefined && before !== rule) {
              throw new Error(`markClass: two positions share ${cls}: ${before} / ${rule}`);
            }
            rules.set(cls, rule);
          }
        }
      }
    }
  }
  return [...rules.values()].sort().join("\n");
}

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
