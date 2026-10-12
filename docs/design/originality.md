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
