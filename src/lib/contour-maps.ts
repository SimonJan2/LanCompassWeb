import { contourPaths, type Hill } from "./contours";

/** The fixed contour maps used behind sections. Deterministic: same seed, same map. */
export const contourMaps = {
  hero: [
    { x: 1180, y: 120, radius: 520, rings: 6, seed: 7 },
    { x: 180, y: 640, radius: 300, rings: 3, seed: 23 },
  ],
  band: [
    { x: 1050, y: 360, radius: 460, rings: 8, seed: 41 },
    { x: 120, y: 60, radius: 260, rings: 5, seed: 5 },
  ],
  quiet: [{ x: 1300, y: 80, radius: 420, rings: 7, seed: 13 }],
} satisfies Record<string, Hill[]>;

export type ContourMap = keyof typeof contourMaps;

/**
 * Stroke colours, repeated from src/styles/tokens.css (--lc-contour and
 * --lc-night-contour) because a standalone SVG file cannot read CSS variables.
 */
export const contourTones = { paper: "#e3dccd", night: "#2a305a" } as const;

export type ContourTone = keyof typeof contourTones;

/** A standalone SVG file: every fourth ring is a slightly heavier index contour. */
export function contourSvg(map: ContourMap, tone: ContourTone): string {
  const paths = contourPaths(contourMaps[map])
    .map((d, i) => `<path d="${d}"${i % 4 === 0 ? ' stroke-width="1.6"' : ""}/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 720" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="${contourTones[tone]}" stroke-width="1" vector-effect="non-scaling-stroke">${paths}</g></svg>`;
}
