/**
 * The site's colours for places that cannot read CSS custom properties: Open Graph
 * images and icons (sharp), standalone contour SVG files, the web manifest and the
 * theme-color meta. Every value repeats a token in src/styles/tokens.css, and
 * tests/theme.spec.ts checks that they still match. This is the only module that holds
 * colour literals outside tokens.css.
 */
export const palettes = {
  /** Survey paper (tokens.css, :root). */
  light: {
    page: "#f4f1ea", // --lc-paper
    raised: "#fbf9f4", // --lc-paper-raised
    sunk: "#ece7dc", // --lc-paper-sunk
    contour: "#e3dccd", // --lc-contour
    rule: "#bdb4a2", // --lc-rule-strong
    ink: "#1a1c22", // --lc-ink
    inkMuted: "#4a4e5a", // --lc-ink-muted
    observed: "#2f5bd3", // --lc-observed
    drift: "#b4234a", // --lc-drift
    documented: "#0b8a63", // --lc-documented-line
    nightContour: "#2a305a", // --lc-night-contour
  },
  /** Night chart (tokens.css, --lc-dark-*). */
  dark: {
    page: "#171c3c", // --lc-dark-night
    raised: "#262c58", // --lc-dark-card (the vellum film)
    sunk: "#1f2550", // --lc-dark-raised (the observed plate)
    contour: "#2a305a", // --lc-dark-contour
    rule: "#4e5690", // --lc-dark-rule-strong
    ink: "#edebf2", // --lc-dark-ink
    inkMuted: "#b7bbd4", // --lc-dark-ink-muted
    observed: "#9db4ff", // --lc-dark-observed
    drift: "#f28ca6", // --lc-dark-drift
    documented: "#10b981", // --lc-dark-documented-line
    nightContour: "#2a305a", // --lc-dark-contour
  },
} as const;

export type PaletteName = keyof typeof palettes;
export type Palette = (typeof palettes)[PaletteName];
