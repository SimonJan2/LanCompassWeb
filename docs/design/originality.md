# Originality: why LanCompass does not read as NetBox Labs

W1 put the compass's emerald on a near-black page with a grid-paper pattern, in the standard SaaS section rhythm. The W1.1 research ([`web-roadmap/research/W1_1_RESEARCH.md`](../../../lancompass-data/web-roadmap/research/W1_1_RESEARCH.md)) measured that combination against netboxlabs.com's shipped CSS and found it in the same family. W1.1 replaces the identity. This file records what changed and the numbers behind it. `tests/identity.spec.ts` keeps it true.

## The rule

The identity differs from NetBox Labs on at least three of four axes. W1.1 differs on all four:

| Axis             | NetBox Labs                                                                | W1                                           | W1.1                                                                                                                   |
| ---------------- | -------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Base luminance   | dark-first, near-black `#090B0B`                                           | dark-first, near-black `#0B0D10`             | **light-first** survey paper `#F4F1EA`; at most two deep-indigo night bands per page                                   |
| Accent hue       | teal `#00F2D4`, mint `#8FEEB4`                                             | emerald `#10B981` / mint `#34D399` site-wide | **indigo ink** actions `#1C2140`; emerald only in the mark and the "documented" state                                  |
| Background motif | `pattern.svg` grids                                                        | 48 px grid paper                             | **cartographic**: generated contour lines, a bearing scale, registration marks, mono marginalia; no grid               |
| Page rhythm      | hero → proof → alternating screenshot pillars → bento → integrations → CTA | the same                                     | **editorial atlas**: datasheet, bearing-numbered sections, one large screenshot per idea, an atlas index, a map legend |

The dark theme (W1.2, `PUBLIC_SITE_THEME=dark`) gives up the base-luminance axis on purpose and keeps the other three; see [Night chart](#night-chart-the-dark-theme-w12).

And every `@surface` / `@accent` colour token is CIEDE2000 ΔE ≥ 15 from each NetBox Labs value: `#090B0B #131515 #02060A #252929 #00F2D4 #8FEEB4 #90EEB4 #023035 #012229 #FFAC00 #FF2F13`. Text-ink tokens are exempt: dark text is near-black on every site.

## NetBox signatures and what LanCompass does instead

| NetBox Labs signature                          | LanCompass W1.1                                                                                                       |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Near-black page                                | Warm off-white paper, graphite ink text                                                                               |
| Bright teal / mint accent on black             | Indigo-ink primary actions on paper; paper actions on night; no glow                                                  |
| Deep-teal surfaces and glows                   | No glows at all. Night bands are deep indigo `#1C2140`                                                                |
| Amber warning accent                           | Drift is a survey red `#B4234A` (paper) / `#F28CA6` (night)                                                           |
| Patterned dark backgrounds                     | Faint generated contour lines (`src/components/motifs/Contours.astro`), bearing scale, registration marks             |
| Geometric grotesque (OpenSauceTwo)             | IBM Plex Sans + IBM Plex Sans Hebrew + IBM Plex Mono: one engineering type system for both scripts                    |
| Bento, tile grids, alternating screenshot rows | Atlas index (typographic list with focus/hover previews), datasheet in mono, map legend, one wide screenshot per idea |
| Rounded cards with soft shadows                | Ruled plates, 2–4 px radii, hairline rules                                                                            |

The compass mark itself is unchanged (`src/assets/brand/`). It always sits on its own app-icon tile, because its white north needle needs the dark tile on paper.

## Measured: W1 tokens (before)

Measured 2026-10-12 with the same ΔE2000 implementation as the test.

| Token                   | Hex       | Min ΔE2000 | Closest NetBox | ≥ 15 |
| ----------------------- | --------- | ---------- | -------------- | ---- |
| `--lc-ink`              | `#0B0D10` | 1.4        | `#02060A`      | ✗    |
| `--lc-ink-raised`       | `#11151A` | 3.5        | `#131515`      | ✗    |
| `--lc-ink-card`         | `#171C22` | 4.7        | `#131515`      | ✗    |
| `--lc-paper`            | `#F7F8F6` | 24.1       | `#90EEB4`      | ✓    |
| `--lc-paper-raised`     | `#FFFFFF` | 25.4       | `#90EEB4`      | ✓    |
| `--lc-signal`           | `#10B981` | 15.2       | `#8FEEB4`      | ✓    |
| `--lc-signal-bright`    | `#34D399` | 9.1        | `#8FEEB4`      | ✗    |
| `--lc-signal-ink`       | `#047857` | 27.5       | `#023035`      | ✓    |
| `--lc-drift`            | `#F5B544` | 4.7        | `#FFAC00`      | ✗    |
| `--lc-drift-ink`        | `#8A5300` | 28.0       | `#FF2F13`      | ✓    |
| `--lc-info`             | `#38BDF8` | 29.9       | `#00F2D4`      | ✓    |
| `--lc-focus`            | `#34D399` | 9.1        | `#8FEEB4`      | ✗    |
| `--lc-text`             | `#EEF1F4` | 25.2       | `#90EEB4`      | ✓    |
| `--lc-text-muted`       | `#A3ADB8` | 28.0       | `#00F2D4`      | ✓    |
| `--lc-text-faint`       | `#8A95A1` | 31.7       | `#00F2D4`      | ✓    |
| `--lc-paper-text`       | `#0B0D10` | 1.4        | `#02060A`      | ✗    |
| `--lc-paper-text-muted` | `#47515C` | 14.4       | `#252929`      | ✗    |

Seven W1 tokens fail, including the three a visitor notices first: the page black, the mint highlight and the amber drift.

## Measured: W1.1 tokens (after)

Every token in `src/styles/tokens.css`. Translucent values are composited over paper; `var()` aliases are resolved.

| Token                   | Tag     | Value                    | Min ΔE2000 | Closest NetBox | ≥ 15   |
| ----------------------- | ------- | ------------------------ | ---------- | -------------- | ------ |
| `--lc-paper`            | surface | `#f4f1ea`                | 23.8       | `#90EEB4`      | ✓      |
| `--lc-paper-raised`     | surface | `#fbf9f4`                | 24.4       | `#90EEB4`      | ✓      |
| `--lc-paper-sunk`       | surface | `#ece7dc`                | 23.2       | `#90EEB4`      | ✓      |
| `--lc-rule`             | surface | `#d9d2c3`                | 23.0       | `#90EEB4`      | ✓      |
| `--lc-rule-strong`      | surface | `#bdb4a2`                | 24.0       | `#FFAC00`      | ✓      |
| `--lc-contour`          | surface | `#e3dccd`                | 22.9       | `#90EEB4`      | ✓      |
| `--lc-control`          | surface | `#7a715f`                | 27.1       | `#252929`      | ✓      |
| `--lc-shadow`           | surface | `rgba(28, 33, 64, 0.14)` | 24.5       | `#90EEB4`      | ✓      |
| `--lc-night`            | surface | `#1c2140`                | 16.2       | `#02060A`      | ✓      |
| `--lc-night-raised`     | surface | `#262c55`                | 18.5       | `#252929`      | ✓      |
| `--lc-night-rule`       | surface | `#454c7e`                | 23.1       | `#252929`      | ✓      |
| `--lc-night-contour`    | surface | `#2a305a`                | 18.8       | `#252929`      | ✓      |
| `--lc-ink`              | text    | `#1a1c22`                | 4.9        | `#131515`      | exempt |
| `--lc-ink-muted`        | text    | `#4a4e5a`                | 14.3       | `#252929`      | exempt |
| `--lc-ink-faint`        | text    | `#5e6270`                | 21.0       | `#252929`      | exempt |
| `--lc-night-text`       | text    | `#eeece6`                | 23.5       | `#90EEB4`      | exempt |
| `--lc-night-muted`      | text    | `#b9bcd0`                | 30.1       | `#00F2D4`      | exempt |
| `--lc-action`           | accent  | `#1c2140`                | 16.2       | `#02060A`      | ✓      |
| `--lc-action-hover`     | accent  | `#2b3263`                | 19.9       | `#012229`      | ✓      |
| `--lc-action-text`      | text    | `var(--lc-paper)`        | 23.8       | `#90EEB4`      | exempt |
| `--lc-focus`            | accent  | `#2f5bd3`                | 29.5       | `#012229`      | ✓      |
| `--lc-focus-night`      | accent  | `#f4f1ea`                | 23.8       | `#90EEB4`      | ✓      |
| `--lc-documented`       | accent  | `#036b4e`                | 23.6       | `#023035`      | ✓      |
| `--lc-documented-line`  | accent  | `#0b8a63`                | 28.7       | `#8FEEB4`      | ✓      |
| `--lc-documented-night` | accent  | `#10b981`                | 15.2       | `#8FEEB4`      | ✓      |
| `--lc-documented-wash`  | surface | `#dcebe0`                | 17.8       | `#90EEB4`      | ✓      |
| `--lc-drift`            | accent  | `#b4234a`                | 24.5       | `#FF2F13`      | ✓      |
| `--lc-drift-night`      | accent  | `#f28ca6`                | 27.2       | `#FF2F13`      | ✓      |
| `--lc-drift-wash`       | surface | `#f6e0e4`                | 33.2       | `#FFAC00`      | ✓      |
| `--lc-observed`         | accent  | `#2f5bd3`                | 29.5       | `#012229`      | ✓      |
| `--lc-observed-night`   | accent  | `#9db4ff`                | 36.8       | `#00F2D4`      | ✓      |
| `--lc-observed-wash`    | surface | `#e2e8f7`                | 27.6       | `#00F2D4`      | ✓      |

The lowest surface/accent value is 15.2 (`--lc-documented-night`, the mark's own `#10B981`, used only for the documented state on a night band). The next lowest are the night surface and the action ink, both `#1C2140` at 16.2.

Contrast ratios for every pair are recorded next to each token in `tokens.css`.

## Fonts: bytes per page

Measured in Chromium at 1440 px after scrolling each page to the bottom, so every face the page uses has loaded. Budget: ≤ 120 KB per locale.

| Page                   | Fonts   | Files                                                                                                                                                                                        |
| ---------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                    | 64.4 KB | ibm-plex-mono-latin-400-normal, ibm-plex-sans-hebrew-hebrew-400-normal, ibm-plex-sans-latin-wght-normal                                                                                      |
| `/product/`            | 64.4 KB | ibm-plex-mono-latin-400-normal, ibm-plex-sans-hebrew-hebrew-400-normal, ibm-plex-sans-latin-wght-normal                                                                                      |
| `/security/`           | 64.4 KB | ibm-plex-mono-latin-400-normal, ibm-plex-sans-hebrew-hebrew-400-normal, ibm-plex-sans-latin-wght-normal                                                                                      |
| `/design-partners/`    | 64.4 KB | ibm-plex-mono-latin-400-normal, ibm-plex-sans-hebrew-hebrew-400-normal, ibm-plex-sans-latin-wght-normal                                                                                      |
| `/contact/`            | 64.4 KB | ibm-plex-mono-latin-400-normal, ibm-plex-sans-hebrew-hebrew-400-normal, ibm-plex-sans-latin-wght-normal                                                                                      |
| `/privacy/`            | 64.4 KB | ibm-plex-mono-latin-400-normal, ibm-plex-sans-hebrew-hebrew-400-normal, ibm-plex-sans-latin-wght-normal                                                                                      |
| `/accessibility/`      | 64.4 KB | ibm-plex-mono-latin-400-normal, ibm-plex-sans-hebrew-hebrew-400-normal, ibm-plex-sans-latin-wght-normal                                                                                      |
| `/he/`                 | 64.4 KB | ibm-plex-mono-latin-400-normal, ibm-plex-sans-hebrew-hebrew-400-normal, ibm-plex-sans-hebrew-hebrew-600-normal, ibm-plex-sans-hebrew-latin-400-normal, ibm-plex-sans-hebrew-latin-600-normal |
| `/he/product/`         | 64.4 KB | ibm-plex-mono-latin-400-normal, ibm-plex-sans-hebrew-hebrew-400-normal, ibm-plex-sans-hebrew-hebrew-600-normal, ibm-plex-sans-hebrew-latin-400-normal, ibm-plex-sans-hebrew-latin-600-normal |
| `/he/security/`        | 64.4 KB | ibm-plex-mono-latin-400-normal, ibm-plex-sans-hebrew-hebrew-400-normal, ibm-plex-sans-hebrew-hebrew-600-normal, ibm-plex-sans-hebrew-latin-400-normal, ibm-plex-sans-hebrew-latin-600-normal |
| `/he/design-partners/` | 64.4 KB | ibm-plex-mono-latin-400-normal, ibm-plex-sans-hebrew-hebrew-400-normal, ibm-plex-sans-hebrew-hebrew-600-normal, ibm-plex-sans-hebrew-latin-400-normal, ibm-plex-sans-hebrew-latin-600-normal |
| `/he/contact/`         | 64.4 KB | ibm-plex-mono-latin-400-normal, ibm-plex-sans-hebrew-hebrew-400-normal, ibm-plex-sans-hebrew-hebrew-600-normal, ibm-plex-sans-hebrew-latin-400-normal, ibm-plex-sans-hebrew-latin-600-normal |
| `/he/privacy/`         | 64.4 KB | ibm-plex-mono-latin-400-normal, ibm-plex-sans-hebrew-hebrew-400-normal, ibm-plex-sans-hebrew-hebrew-600-normal, ibm-plex-sans-hebrew-latin-400-normal, ibm-plex-sans-hebrew-latin-600-normal |
| `/he/accessibility/`   | 64.4 KB | ibm-plex-mono-latin-400-normal, ibm-plex-sans-hebrew-hebrew-400-normal, ibm-plex-sans-hebrew-hebrew-600-normal, ibm-plex-sans-hebrew-latin-400-normal, ibm-plex-sans-hebrew-latin-600-normal |

English and Hebrew land within 84 bytes of each other (65,896 vs 65,980 bytes).

| Face                                      | Subset | Bytes  | Loaded on                                                                                        |
| ----------------------------------------- | ------ | ------ | ------------------------------------------------------------------------------------------------ |
| IBM Plex Sans, variable (`wght`)          | Latin  | 45,712 | English pages (preloaded)                                                                        |
| IBM Plex Sans Hebrew 400                  | Hebrew | 5,476  | every page (Hebrew pages preload it; English pages need it for "עברית" in the language switcher) |
| IBM Plex Sans Hebrew 600                  | Hebrew | 5,652  | Hebrew pages (preloaded)                                                                         |
| IBM Plex Sans Hebrew 400, its Latin faces | Latin  | 19,452 | Hebrew pages (preloaded)                                                                         |
| IBM Plex Sans Hebrew 600, its Latin faces | Latin  | 20,692 | Hebrew pages (preloaded)                                                                         |
| IBM Plex Mono 400                         | Latin  | 14,708 | every page                                                                                       |

Three choices came from the Lighthouse LCP budget (1.8 s), not from taste:

- **Plex Mono ships one weight (400).** A 500 face added 14.5 KB above the fold. Faux bold is off (`font-synthesis-weight: none`), so mono set at 500 renders at 400.
- **No Hebrew 500 face.** Hebrew text set at 500 matches the 400 face.
- **Hebrew pages take Latin glyphs from Plex Sans Hebrew's own static Latin faces** (the same IBM Plex Sans design) instead of the 45 KB variable file. The Hebrew LCP element is the lead paragraph, which needs Hebrew 400 plus Latin for "LanCompass" and the punctuation. With the variable file it measured 1.80 s; with the static faces it measures 1.65 s.

## Display-face spike

The brief asked for one alternative Latin display face to be tried for headlines only. Instrument Sans (`@fontsource-variable/instrument-sans` 5.3.0) was installed, set as the headline face, built and screenshotted beside Plex at 1440 px in both locales: `web-roadmap/Reports/W1_1/spike/plex-vs-instrument-{en,he}-1440.png`.

Not kept, and the package was removed:

- In English it is tighter and more fashionable, which pulls the page back towards generic modern SaaS — the problem W1.1 exists to fix.
- In Hebrew it changes nothing in the Hebrew letters (it has no Hebrew), but every Latin product name inside a Hebrew headline switches family, so mixed lines lose the shared Plex metrics.
- Plex Sans at display sizes with −0.035 em tracking already carries the headline.

## Night chart: the dark theme (W1.2)

`PUBLIC_SITE_THEME=dark` builds the same identity at night: the chart on the chart table under a
lamp. `auto` ships both palettes and lets the visitor's OS choose. The light theme is unchanged.

### The rule, applied to a dark theme

A dark site gives up the base-luminance axis **on purpose**. The rule needs three of four axes,
so the dark theme keeps the other three exactly as W1.1:

| Axis             | NetBox Labs                    | Night chart (dark)                                                                                              |
| ---------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Base luminance   | near-black `#090B0B`           | **given up on purpose**: dark, but saturated indigo `#171C3C` (L\* 11.5, ΔE 16.1), never near-black             |
| Accent hue       | teal `#00F2D4`, mint `#8FEEB4` | **paper** actions `#F4F1EA` on night; emerald only as "documented" text and lines; no teal, mint, amber or glow |
| Background motif | `pattern.svg` grids            | **cartographic**, unchanged: contour lines in the night tone, bearing scale, registration marks, marginalia     |
| Page rhythm      | hero → proof → pillars → bento | **editorial atlas**, unchanged                                                                                  |

Every dark `@surface` / `@accent` token is ΔE2000 ≥ 15 from each NetBox Labs value, and the page
is not near-black (L\* ≥ 10). `tests/identity.spec.ts` checks both, plus a sweep of every visible
element's computed background and box-shadow colour on every dark page (screenshots and video frames
excluded, as product imagery).

What the measurements forced (research §1):

- **Green is boxed in.** Brighter than the mark's emerald it slides to NetBox mint (`#3CC795`:
  ΔE 11.2); as a dark fill it becomes NetBox deep teal (`#173F45`: ΔE 4.8). "Documented" is the
  mark's emerald as text and lines only, on **indigo** washes.
- **Shadows and scrims are indigo** (`#11163A`), never black (`#0B0F28`: ΔE 12.7).
- **Nothing sits below the page.** Elevation goes up in lightness: night → sunk table → raised
  (lamp-lit bands, the observed plate) → card (the vellum film, plates).

### Tokens

Each dark value is defined once in `src/styles/tokens.css` as a tagged `--lc-dark-*` token. The
mapping block (`:root[data-theme="dark"]`) points the semantic tokens at them; components read
semantic tokens only. Translucent values are measured composited over the night page. Contrast
columns are WCAG 2.x against night `#171C3C`, raised `#1F2550`, card `#262C58` and sunk `#1B2046`.

| Token                       | Value                    | Tag      | L*    | Min ΔE2000 | Closest NetBox | ≥ 15 | On night / raised / card / sunk |
| --------------------------- | ------------------------ | -------- | ----- | ---------- | -------------- | ---- | ------------------------------- |
| `--lc-dark-night`           | `#171c3c`                | @surface | 11.5  | 16.1       | `#02060A`      | ✓    | 1.00 / 1.13 / 1.25 / 1.06       |
| `--lc-dark-sunk`            | `#1b2046`                | @surface | 13.9  | 17.8       | `#02060A`      | ✓    | 1.06 / 1.07 / 1.18 / 1.00       |
| `--lc-dark-raised`          | `#1f2550`                | @surface | 16.5  | 19.0       | `#252929`      | ✓    | 1.13 / 1.00 / 1.10 / 1.07       |
| `--lc-dark-card`            | `#262c58`                | @surface | 19.7  | 19.1       | `#252929`      | ✓    | 1.25 / 1.10 / 1.00 / 1.18       |
| `--lc-dark-contour`         | `#2a305a`                | @surface | 21.4  | 18.8       | `#252929`      | ✓    | 1.32 / 1.16 / 1.05 / 1.24       |
| `--lc-dark-rule`            | `#3a4170`                | @surface | 29.0  | 21.0       | `#252929`      | ✓    | 1.71 / 1.51 / 1.37 / 1.62       |
| `--lc-dark-rule-strong`     | `#4e5690`                | @surface | 38.4  | 26.1       | `#252929`      | ✓    | 2.41 / 2.13 / 1.93 / 2.28       |
| `--lc-dark-lamp-rule`       | `#edebf2`                | @surface | 93.4  | 27.5       | `#90EEB4`      | ✓    | 14.01 / 12.35 / 11.22 / 13.24   |
| `--lc-dark-control`         | `#7880b8`                | @surface | 55.0  | 37.5       | `#252929`      | ✓    | 4.40 / 3.88 / 3.52 / 4.16       |
| `--lc-dark-shadow`          | `rgba(17, 22, 58, 0.6)`  | @surface | 9.9   | 16.6       | `#02060A`      | ✓    | 1.04 / 1.18 / 1.30 / 1.10       |
| `--lc-dark-scrim`           | `rgba(17, 22, 58, 0.72)` | @surface | 9.9   | 16.6       | `#02060A`      | ✓    | 1.04 / 1.18 / 1.30 / 1.10       |
| `--lc-dark-ink`             | `#edebf2`                | @text    | 93.4  | exempt     | —              | —    | 14.01 / 12.35 / 11.22 / 13.24   |
| `--lc-dark-ink-muted`       | `#b7bbd4`                | @text    | 76.3  | exempt     | —              | —    | 8.73 / 7.70 / 6.99 / 8.25       |
| `--lc-dark-ink-faint`       | `#9a9fc0`                | @text    | 66.1  | exempt     | —              | —    | 6.38 / 5.63 / 5.11 / 6.03       |
| `--lc-dark-ink-he`          | `#e4e2ec`                | @text    | 90.3  | exempt     | —              | —    | 12.93 / 11.39 / 10.35 / 12.22   |
| `--lc-dark-action`          | `#f4f1ea`                | @accent  | 95.2  | 23.8       | `#90EEB4`      | ✓    | 14.68 / 12.94 / 11.76 / 13.88   |
| `--lc-dark-action-hover`    | `#ffffff`                | @accent  | 100.0 | 25.4       | `#90EEB4`      | ✓    | 16.56 / 14.60 / 13.26 / 15.65   |
| `--lc-dark-action-text`     | `#171c3c`                | @text    | 11.5  | exempt     | —              | —    | 1.00 / 1.13 / 1.25 / 1.06       |
| `--lc-dark-focus`           | `#c9d3ff`                | @accent  | 85.1  | 32.3       | `#00F2D4`      | ✓    | 11.24 / 9.90 / 9.00 / 10.62     |
| `--lc-dark-documented`      | `#22b583`                | @accent  | 65.8  | 15.9       | `#8FEEB4`      | ✓    | 6.31 / 5.56 / 5.06 / 5.97       |
| `--lc-dark-documented-line` | `#10b981`                | @accent  | 66.8  | 15.2       | `#8FEEB4`      | ✓    | 6.53 / 5.75 / 5.23 / 6.17       |
| `--lc-dark-documented-wash` | `#232c52`                | @surface | 19.1  | 17.7       | `#252929`      | ✓    | 1.23 / 1.08 / 1.02 / 1.16       |
| `--lc-dark-drift`           | `#f28ca6`                | @accent  | 69.7  | 27.2       | `#FF2F13`      | ✓    | 7.16 / 6.31 / 5.73 / 6.77       |
| `--lc-dark-drift-wash`      | `#3a2142`                | @surface | 17.4  | 19.2       | `#252929`      | ✓    | 1.16 / 1.03 / 1.07 / 1.10       |
| `--lc-dark-observed`        | `#9db4ff`                | @accent  | 74.2  | 36.8       | `#00F2D4`      | ✓    | 8.21 / 7.23 / 6.57 / 7.76       |
| `--lc-dark-observed-wash`   | `#252f66`                | @surface | 21.5  | 19.2       | `#012229`      | ✓    | 1.32 / 1.17 / 1.06 / 1.25       |

Contrast pairs in use (text needs ≥ 4.5:1, UI graphics ≥ 3:1):

| Pair                                               | Ratio              |
| -------------------------------------------------- | ------------------ |
| Night text `#171C3C` on the paper action `#F4F1EA` | 14.68              |
| Night text on the action hover `#FFFFFF`           | 16.56              |
| Documented `#22B583` on its indigo wash `#232C52`  | 5.15               |
| Documented line `#10B981` on its wash              | 5.33               |
| Drift `#F28CA6` on its wash `#3A2142`              | 6.15               |
| Observed `#9DB4FF` on its wash `#252F66`           | 6.20               |
| Ink `#EDEBF2` on the drift wash / documented wash  | 12.04 / 11.44      |
| Faint ink `#9A9FC0` on the observed / drift wash   | 4.83 / 5.48        |
| Focus ring `#C9D3FF` on raised                     | 9.90               |
| Control border `#7880B8` on night / raised / card  | 4.40 / 3.88 / 3.52 |
| Drift badge text (night) on drift `#F28CA6`        | 7.16               |

Changes from the research palette (all still ΔE ≥ 15 and every pair above):

- **Contour** `#2A305A` instead of `#232A52`: the same value as the existing night-tone contour
  files, so the inline hero contours and the cached `/contours/*-night.svg` match, and the lines
  stay visible on the lamp-lit bands (1.16:1 on raised, against 1.06:1 for `#232A52`).
- **A sunk table** `#1B2046` (ΔE 17.8) between night and raised: the light theme's sunk sections
  (datasheet, footer, alternate sections) otherwise landed on the same raised indigo as the
  lamp-lit bands and merged with them.
- **Control** `#7880B8` (ΔE 37.5): the research table had no dark control border; this passes 3:1
  on every dark surface.
- **Lamp rule** `#EDEBF2`: the paper-ink top rule of a lamp-lit band.

### Typography on dark

Light ink on a dark ground reads heavier (research §4).

- **English** (Plex Sans variable): body 370, display 520, against 400 and 560 in light.
- **Hebrew** (static Plex Sans Hebrew): the 300 experiment was run and **not kept**.

| Hebrew dark pages (Lighthouse, mobile, median of 3) | Fonts   | LCP `/he/` | LCP `/he/product/` | CLS `/he/product/` | Result                    |
| --------------------------------------------------- | ------- | ---------- | ------------------ | ------------------ | ------------------------- |
| 400 body, ink `#E4E2EC` (kept)                      | 66.0 KB | 1.65 s     | 1.50 s             | 0.000              | all budgets pass          |
| 300 body + its Latin 300, ink `#EDEBF2`             | 92.4 KB | 1.66 s     | 1.65 s             | **0.027**          | CLS budget (≤ 0.02) fails |

The 300 faces stayed inside the 120 KB font budget and the 1.8 s LCP budget, but the late swap
from 400 to 300 shifted the product page's layout past the CLS budget, and every Hebrew page paid
26 KB more. Hebrew body text keeps 400 with its ink lowered to `#E4E2EC` (12.93:1 on night); the
Hebrew display cut stays 600.

### Imagery on dark

- **Two sheets**: the observed sheet is a raised indigo plate with periwinkle dotted lines, the
  vellum a translucent card film with paper-ink lines and boxes, the drift mark pink, the
  resolved link emerald, registration marks paper ink at reduced opacity. Timeline, pause,
  offscreen pause and the reduced-motion frame are unchanged.
- **Screenshots** are the product's Nightwire captures (`src/assets/screens/nightwire/`). That
  theme is near-black and cyan, close to NetBox, which is acceptable inside product imagery but
  never in site tokens. Frames get a `--lc-rule-strong` hairline and a card-indigo mat, so the
  product window reads as an object on the table, not as the page.
- **OG images**: indigo ground, paper title, the compass tile, the two-sheets motif in night
  colours (`src/lib/og.ts` with `src/lib/palette.ts`). `auto` keeps paper cards: social cards
  have no colour scheme.
