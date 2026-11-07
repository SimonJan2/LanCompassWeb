# LanCompass website

The public site for LanCompass: a static, bilingual (English at `/`, Hebrew at `/he/`)
marketing site built with Astro. It makes no request to any third party at runtime, sets no
cookies, and works without JavaScript.

## Requirements

Node 22 or later (`.nvmrc`). Everything below also runs in containers, which is how it is
run on hosts without a suitable Node or Chrome:

```bash
docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp -v "$PWD":/app -w /app node:22 npm ci
docker run --rm --network host --user "$(id -u):$(id -g)" -e HOME=/tmp -v "$PWD":/app -w /app \
  mcr.microsoft.com/playwright:v1.64.0-noble npm run test
```

Use the `node:22` image for install, check, build and links, and the Playwright image (its tag
must match the pinned `@playwright/test`) for tests, Lighthouse and screenshot capture.

## Commands

| Command                        | What it does                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------- |
| `npm ci`                       | Install the locked dependencies.                                              |
| `npm run dev`                  | Dev server on http://localhost:4321.                                          |
| `npm run build`                | Static build into `dist/`.                                                    |
| `npm run preview`              | Serve `dist/` on http://localhost:4321.                                       |
| `npm run check`                | `astro check`: Astro and TypeScript diagnostics (strictest tsconfig).         |
| `npm run format:check`         | Prettier check (`npm run format` writes).                                     |
| `npm run test`                 | Builds four test sites (`pretest`) and runs the Playwright suite in `tests/`. |
| `npm run lhci`                 | Lighthouse CI budgets (`lighthouserc.json`) against `dist/`. Build first.     |
| `LHCI_THEME=dark npm run lhci` | Builds `dist-lhci-dark` and runs the same URLs and budgets against it.        |
| `npm run links`                | `linkinator` over `dist/`, internal links only. Build first.                  |
| `npm run capture`              | Screenshots from a running LanCompass demo estate (see below).                |

Ports: dev and preview use 4321; the test suite also serves the flags build on 4322, the dark
build on 4323 and the auto build on 4324.

## Configuration (`PUBLIC_*`)

All optional; copy `.env.example` to `.env` or set them in the build environment. An empty
value switches the feature off. They are read at build time by `src/config/site.ts`.

| Variable               | Effect                                                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PUBLIC_SITE_URL`      | Origin for canonical URLs, hreflang, sitemap, Open Graph. Default `http://localhost:4321`.                                                                                                  |
| `PUBLIC_CONTACT_EMAIL` | mailto fallback for the forms, disclosure and accessibility contact. Empty → visible `TODO(operator)` marker.                                                                               |
| `PUBLIC_FORM_ENDPOINT` | Forms POST here. Empty → each form is replaced by a mailto: button. Its origin is added to CSP `form-action`.                                                                               |
| `PUBLIC_DOCS_URL`      | "Docs" in the navigation and footer. Empty → not rendered.                                                                                                                                  |
| `PUBLIC_SITE_THEME`    | `light` (default): survey paper. `dark`: the Night chart. `auto`: both ship, the visitor's OS picks. Any other value fails the build.                                                       |
| `PUBLIC_SITE_INDEXING` | `true` (default; empty is `true`). `false`: a preview — every response carries `X-Robots-Tag: noindex` and `robots.txt` lists no sitemap. No HTML changes. Any other value fails the build. |

### Preview mode

W12 (DECISIONS.md D-INDEXING): while the site lives at a preview address
(`https://lancompass.simonlab.xyz`), the deploy sets `PUBLIC_SITE_INDEXING=false`. The build then
adds `X-Robots-Tag: noindex` to the `/*` block of `dist/_headers` (`astro.config.mjs` →
`headersNoindex`), which Netlify and Cloudflare Pages apply to every response and the Docker
image turns into nginx headers (`docker/render-nginx-headers.mjs`): pages, assets, images,
feeds and 404s alike. `robots.txt` still allows every crawler (a crawler has to fetch a page to
read its `noindex`) and leaves out its `Sitemap:` line. Not one HTML byte changes. To leave
preview: set `PUBLIC_SITE_URL` to the LanCompass domain, remove `PUBLIC_SITE_INDEXING`, rebuild,
and add a 301 from the preview address to the domain at the edge (`docs/go-public.md`).

### Theme

The colour theme is a build-time choice, like every `PUBLIC_*` value: set
`PUBLIC_SITE_THEME` in `.env` (or in the build environment) and rebuild. With Docker,
`docker compose up -d --build`.

- `light` builds W1.1 exactly: survey paper, paper OG images and icons, light screenshots
  and videos.
- `dark` builds the **Night chart**: deep indigo ground, paper-ink type, lamp-lit bands, the
  product's Night chart screenshots and videos, night OG images, a night manifest and
  `theme-color`.
- `auto` ships both palettes. CSS switches with `prefers-color-scheme`, screenshots switch
  with `<picture><source media>` (only the matching image is fetched), each video slot
  renders one player whose Night chart recording sits behind a dark `<source>`, and there are
  two `theme-color` metas. Social cards stay paper. Since W13 (DECISIONS.md D-THEME, D-SWITCH)
  `auto` is the published theme (`.env.example`, `compose.yaml`) and carries a two-state
  light/dark switch, described below; `light` and `dark` have none.

**The switch** (W13, `auto` only): `src/components/ThemeSwitch.astro` in the header, beside the
language menu, and in the mobile menu. It offers the opposite of the scheme on screen (a moon or
a sun drawn in CSS, and a name such as "Switch to dark theme"). A press renders the other
scheme; `localStorage["lc-theme"]` keeps the choice only when it differs from the system's, and
choosing the system's scheme again removes it. The switch's code in `src/scripts/site.ts`
(dropped from light and dark builds at build time: `__LC_AUTO__`) applies a stored choice by
turning `<html data-theme="auto">` into `light` or `dark`; the auto stylesheet carries the dark
rules once more under `:root[data-theme="dark"]`, so an override renders exactly as the pure
build. It does so when the site's module runs, not before the first paint: a blocking boot script
in `<head>` (the first design) cost the English home and `/docs/topology/` their 1.8 s LCP budget,
so a visitor who chose an override may see the system's scheme for a moment — nobody else sees
any change. It points every scheme-keyed `<source>` and `theme-color` at the override's set,
follows other tabs (`storage`), and still switches the page when storage is blocked; on the home
(`src/scripts/home-theme.ts`) the atlas previews show their Night chart files under a dark
override and a video that has not played loads the override's recording on its first play.
Without JavaScript the button is not shown and the system's scheme decides, as before. `/privacy`
names the one key it may keep.

**Both themes on the page** (W13, D-SHOWCASE, every build): the home's dusk sweep after What's new
(`DuskSweep.astro`: a stage that stays put, a scroll-driven mask, CSS only; twin frames under reduced
motion), `/product`'s slider before Fig. 1 (`CompareSlider.astro`, a native range input), a
"Survey | Night chart" control on each `/product` figure (cloned from one `<template>` by
`src/scripts/showcase.ts`; the other set's crop loads only when chosen), and twin frames under
`/pilot`'s hero (`TwinFrames.astro`). Their pictures are the slots `sweep`, `compare` and `twin`
in `src/content/screen-slots.json`; a light or dark build keeps exactly the other set's files they
use (`astro.config.mjs` → `screensForTheme`).

**Pictures as windows, on a table** (W14, DECISIONS.md D-FRAME and D-TABLE, every build): the site
keeps its palette, which the product shares, and every product picture is drawn as an app window
(`ScreenshotFrame.astro`): an edge ΔE2000 ≥ 15 from its ground, 10 px corners, a two-layer indigo
lift by day and a periwinkle glow by night (`src/styles/night.css`), and a title bar that names
it — "LanCompass" and the release the pictures show, CSS generated content from
`--lc-window-label`, which `themeCss` writes from `media-library/screens/CAPTURED.json`
(`product_version`), so a new capture renames every window with no HTML change. The videos'
players get the same edge, corners and lift, without a bar. The sections that show the product sit
on the chart table (`--lc-table`, a hairline in `--lc-table-rule` at its top and bottom): What's new
with the dusk sweep, the Hebrew band and the videos on the home, `/product`'s slider and `/pilot`'s
twin frames — the last two run the whole window's width from inside the centred column through a
`border-image` outset. The tokens and their distances are in `docs/design/originality.md`.

How it is built: `<html data-theme>` carries the theme. `src/styles/tokens.css` holds the light
tokens and, after its `@night` marker, every dark value once as a tagged `--lc-dark-*` token
plus the mapping from semantic tokens to them; `src/styles/night.css` holds the few dark
component rules and `src/styles/auto.css` the auto-only ones. A small Vite plugin in
`astro.config.mjs` (`themeCss`) assembles the stylesheet per theme, so a light build carries
no dark CSS at all. Colours outside CSS (OG images, icons, manifest, contour files) come from
`src/lib/palette.ts`.
Signing keys live in `src/content/fingerprints.json` (W6): one entry per key,
`{ "id": "release", "label": {en, he}, "purpose": {en, he}, "sha256": "C0:47:…", "firstRelease":
"0.6.0", "lastRelease": null, "claim": "C-VER-1" }` (`kid` only for a licence key). The value is
the SHA-256 of the key's DER form, upper case and colon-separated, exactly as the installer
prints it; a malformed entry fails the build. `/security#verification` shows the active keys,
and `/verify/` the release key with its history: a retired key stays, with its `lastRelease`.

**At each release** (W6): add the release's `bundle` and `sbom` facts to
`src/content/releases.json`, each value copied from a command on the signed bundle
(`sha256sum`, `stat -c %s`, the `.sha256` file, the SBOM's `specVersion` and `components`), copy
the SBOM byte for byte into `public/verify/`, and rebuild. `/.well-known/security.txt` (RFC 9116)
is written only when `PUBLIC_CONTACT_EMAIL` and `PUBLIC_SITE_URL` are both set; it expires 180
days after the build, so rebuild before then.

The way in (W7): `/pilot/` (the product's first 30 days, the success worksheet, support, the
clean exit, the design-partner offer and the application form at `#apply`) and `/licensing/`
(the evaluation, the licence, its states, read-only, editions and prices, buyers' questions).
Every call to action goes to `/pilot/#apply`. The old `/design-partners/` answers 301 in
`docker/nginx/site.conf`; for any other host the build leaves a meta-refresh page there (not in
the sitemap). W12 removed their legal-review banners (DECISIONS.md D-LEGAL-BANNERS): a
lawyer's reading of `/privacy`, `/accessibility`, `/licensing` and `/pilot` stays on the
operator's checklist (`docs/go-public.md`), not on the pages.

Release notes (W8): `/changelog/` lists every release, newest first, and `/changelog/<version>/`
shows its notes — the product's own `CHANGELOG.md` section, verbatim (the wave numbers dropped,
`Docs → …` references linked to `/docs/` pages the site has) — after an "At a glance" box. The
English files in `src/content/changelog/en/` are written by the sync script, never by hand; the
Hebrew pages in `src/content/changelog/he/` are summaries written natively (headline changes, the
upgrade steps in full, every known issue), each with its `written` date and its `he-review.md`
rows. Atom feeds: `/changelog/feed.xml`, `/he/changelog/feed.xml`. **At each release:**

```sh
git -C ../LanCompass show v0.8.0:CHANGELOG.md > /tmp/CHANGELOG.md   # the tag, never the tree
node scripts/sync-changelog.mjs /tmp/CHANGELOG.md                   # writes src/content/changelog/en
```

then add the release to `src/content/releases.json` (with `summary_en` — the sync prints it —
and `summary_he`), write `src/content/changelog/he/<version>.md`, and rebuild. A second run of the
sync on the same file changes nothing.

Docs (W9): `/docs/` and `/he/docs/` are the product's own help, as it ships in the release: the
65 articles of its registry in English and Hebrew, in the product's seven categories and order,
each at `/docs/<slug>/` with the category navigation (a `<details>` on a phone), "On this page"
and a version line. The files in `src/content/docs/` and the images in `src/assets/docs/` are
written by the sync script, never by hand (they are left out of Prettier and of Tailwind's
sources). A Hebrew article the product marks as translated from an older English file shows the
product's own notice. There is no search (DECISIONS.md D-DOCS-SEARCH). `PUBLIC_DOCS_URL`, when
set, still wins in the header and footer. **At each release:**

```sh
git -C ../LanCompass archive -o /tmp/docs.tar v0.8.0 frontend/src/content/docs frontend/public/docs-img
mkdir /tmp/docs && tar -xf /tmp/docs.tar -C /tmp/docs
node scripts/sync-docs.mjs /tmp/docs --version 0.8.0 --locales en,he
```

then rebuild; a second run on the same archive changes nothing. Re-run the changelog sync after
it, so the notes' `Docs → …` references link the new pages.

Videos: drop files into `public/media/<survey|night-chart>/` as described in
`public/media/README.md`.

## Screenshots

Product screens come from the **signed release bundle**, run on a throwaway stack of their own
(`scripts/capture-stack/README.md`: the bundle checked, `lcweb-cap` up, the admin, the demo
estate, the staged writes, the teardown). `scripts/capture-screenshots.mjs` signs in to that
stack, sets the theme and language (`en`, `he`) in the capture browser's `localStorage` only,
renders the 1440 × 900 window at device scale 3, and saves into `media-library/screens/<set>/<locale>/`,
for each of the fifteen keys (`src/lib/screens.ts`), the full window (`<key>.png`, 2880 × 1800)
and, for every slot that shows the key, a crop of the slot's size around the one thing its
caption names (`<key>.<slot>.png`, and `<key>.<slot>-phone.png` where a phone gets its own; W11).
`src/content/screen-slots.json` holds the slots: the width each draws its picture at 1,440 and
390 px, the crop that fits it (never wider, so the product's text is drawn at its own size or
larger), the served width (twice the drawn width: sharp at device scale 2) and each key's task
focus. From the record it derives the served files, `public/screens/<set>/<locale>/*.webp`, at
exactly those sizes; their stable same-origin paths keep the home and product pages inside their
first round trip, and nginx caches them like the other media files. It records each crop's clip
and up to four named anchors per picture in `src/content/screen-anchors.json`, and the capture
(bundle checksum, release key, demo load time, routes, each slot's focus and clip, staged
writes) in `media-library/screens/CAPTURED.json`. `LANCOMPASS_CAPTURE_THEME` picks the product
theme: `survey` (Survey, the product's default light theme: the light site's set) or
`night-chart` (Night chart, its default dark theme: the dark site's set; `auto` ships both).
`--check` walks every key and slot without writing a file and fails on a missing route, element
or focus; `--keys a,b` and `--locales en` narrow a run; `--probe <key>` prints the page's
`data-*` attributes and each slot's focus and clip, and saves a screenshot to `.tmp/probe/`;
`--derive` rewrites the served files from the record without a browser, and `--slots a,b` limits
a run to some slot kinds (W13 derived the showcase's whole windows with
`--derive --keys map-ages,dashboard --slots sweep,compare`, rewriting no other file). W13's three
showcase slots (`sweep`, `compare`, `twin`) draw both sets in every build; their other pictures
reuse another slot's crop as it is (`from` in the slot table), so a capture cuts nothing twice.

`scripts/record-video.mjs <key>` records one product video on the same capture stack
(navigation, hover, scrolling, the Q key, opening a card or a preview). Its one kind of write
is DECISIONS.md D-VIDEO-WRITES: the queue story applies one group as one batch and undoes it in
one step, only with `LANCOMPASS_VIDEO_WRITES=lcweb-cap` against the capture stack's own web port,
each write logged to `LANCOMPASS_WRITES_LOG`. Each video is a storyboard: a title card, five
`{ seconds, en, he, claims }` steps and an end card in `src/content/videos.json` (the captions,
the cards, each slot's title and the `/videos/` page, the videos' text alternative that each
slot links to), and each step's `run` in the script. It writes the WebM (1280 × 720, at most 45 s), a poster (`.jpg` and `.webp`, taken at
the step marked `poster`) and en + he captions timed to the same steps. Keys:
`drift-review-queue`, `documented-vs-observed`, `hebrew-native` (always he UI).
`LANCOMPASS_VIDEO_UI` (`en` | `he`), `LANCOMPASS_CAPTURE_THEME` (`survey` | `night-chart`) and
`LANCOMPASS_VIDEO_DIR` choose the variant and folder (default
`media-library/videos/<set>-<ui>/`). Flags:

- `--check` signs in and walks every step without recording, and fails if a link or element a
  step needs is missing. Run it before spending a recording.
- `--publish` also copies the recording to `public/media/<set>/<key>.<ui>.*`.
- `--cards <dir>` renders the title and end card to PNG; it needs neither the product nor a
  login.

Both scripts fill `media-library/` (Survey and Night chart; en and he); see
`media-library/README.md`, then copy the site's set into `public/media/` (or use `--publish`).

```bash
docker run --rm --network host --ipc=host --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -e LANCOMPASS_DEMO_URL=http://127.0.0.1:4186 \
  -e LANCOMPASS_DEMO_USER -e LANCOMPASS_DEMO_PASS -e LANCOMPASS_CAPTURE_THEME=survey \
  -v "$PWD":/app -w /app mcr.microsoft.com/playwright:v1.64.0-noble npm run capture -- --check
```

```bash
docker run --rm --network host --ipc=host --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -e LANCOMPASS_DEMO_URL=http://127.0.0.1:4186 -e LANCOMPASS_DEMO_USER -e LANCOMPASS_DEMO_PASS \
  -e LANCOMPASS_CAPTURE_THEME=night-chart -e LANCOMPASS_VIDEO_UI=he \
  -v "$PWD":/app -w /app mcr.microsoft.com/playwright:v1.64.0-noble \
  node scripts/record-video.mjs documented-vs-observed --check
```

Rebuild afterwards: `ScreenshotFrame` picks the served files up automatically, one `<picture>`
per slot with one candidate per `<source>` (the phone crop below 960 px, the desktop crop as the
`<img>`, and in `auto` the Night chart twin of each). Until a file exists, a schematic
placeholder of the same 16:10 shape is shown. `tests/legibility.spec.ts` measures every slot at
1,440 and 390 px. Check every crop for non-demo data before committing.

## Adding a locale (for example `ar`)

1. Add it to `src/i18n/locales.ts` (label, `htmlLang`, `dir`, `ogLocale`).
2. Add `src/i18n/ar.json` (same keys as `en.json`) and register it in `src/i18n/index.ts`.
3. Add `src/content/copy/ar.ts` typed as `Copy` (the compiler lists every missing string) and
   register it in `src/content/copy/index.ts`.
4. Add `src/content/pages/ar/{security,privacy,accessibility}.mdx`.

Routes, hreflang, the sitemap, the language switcher, OG images and the tests all read the
locale list. Layout uses logical properties only, so right-to-left needs no extra CSS.

## Layout

```
src/
  pages/           routes: [...lang]/*.astro (en has no prefix), [lang]/404.astro, og/, icons
  layouts/         BaseLayout (head, SEO, header, footer), LongformLayout (MDX pages, the
                   release notes), DocsLayout (W9: the docs articles)
  components/      SiteHeader, MobileNav, LanguageSwitcher, SiteFooter, Button, Eyebrow,
                   SectionHeading, FeatureCard, AtlasIndex, Datasheet, MapLegend, TwoSheets,
                   ScreenshotFrame, StepTimeline, ComparisonRow, VideoSlot, CTABand, Prose,
                   form/, motifs/ (Contours, BearingScale, RegistrationMarks, Marginalia)
  content/         copy/{en,he}.ts (structured pages), pages/{en,he}/*.mdx, fingerprints.json,
                   releases.json (product releases, newest first: the one "current release"),
                   changelog/{en,he}/<version>.md (W8: the product's notes; the Hebrew summaries),
                   docs/{en,he}/<slug>.md (W9: the product's help at the release tag)
  i18n/            locales.ts (the locale list), en.json, he.json (UI strings)
  config/site.ts   PUBLIC_* configuration
  styles/          tokens.css (design tokens), global.css (Tailwind + base), fonts.css
  scripts/         the small client scripts (site, two sheets, forms, scroll-spy)
  lib/             build-time helpers: screenshots, OG images, WOFF2 decoding, media
  assets/          brand/ (compass mark)
scripts/           capture-screenshots.mjs, record-video.mjs, build-test.mjs, lhci.mjs,
                   capture-stack/ (the throwaway stack from the signed bundle),
                   sync-changelog.mjs (W8: the release notes from CHANGELOG.md at a tag),
                   sync-docs.mjs (W9: the docs from an archive of the tag),
                   check-claims.mjs (W10: each claim row's sources exist at the release tag)
media-library/     captured screens (Survey + Night chart: the whole windows and each slot's
                   crop) and videos, en + he, not built; public/screens/ holds the served crops
tests/             Playwright specs
docs/headers.md    security headers and nginx equivalents
docs/design/       originality.md: the identity, measured against NetBox Labs (ΔE, fonts)
docs/copy/         he-voice.md (how Hebrew is written), he-review.md (every Hebrew string, glossed)
docs/claims.md     the claims register: every product fact the site states, with its source at
                   the product's release tag; the copy cites its rows (tests/claims.spec.ts)
docs/go-public.md  W10: the operator's checklist before going public, with every TODO(operator)
```

### Product claims

Every sentence about the product cites a row of [`docs/claims.md`](docs/claims.md) in a comment
beside it (`// C-MAP-1` in `src/content/copy/*.ts`, `{/* C-SEC-3 */}` in `.mdx`), and every figure
in the copy appears in the row it cites. `tests/claims.spec.ts` checks both, and that every row is
cited or marked `unused —` with a reason. At a product release: re-read each row's source at the
new tag, change what changed, add the release to `src/content/releases.json` (the datasheet's
Release row, What's new and the JSON-LD read it), and run the tests. On the host (Node 18 is
enough), `node scripts/check-claims.mjs ../LanCompass v0.7.0` checks with `git` that every file
and `CHANGELOG.md` section a row cites is at the tag (exit 1 on a missing one) and notes a cited
heading or quoted phrase it cannot find there; `--sample 20 --seed <8 hex digits>` also picks
rows to re-read by hand. `tests/release.spec.ts` holds every place that names the current
release to the newest entry.

## Identity and motion

"Survey paper": a light, warm paper base with graphite ink, deep-indigo night bands (at most
two per page), cartographic motifs (contour lines, a bearing scale, registration marks, mono
marginalia) and an editorial page rhythm. The compass emerald appears only in the mark and in
the "documented" state. Every colour token in `src/styles/tokens.css` is tagged
(`@surface`, `@accent`, `@text`) with its contrast ratios; `tests/identity.spec.ts` checks the
distance rule. See `docs/design/originality.md`.

"Night chart" (`PUBLIC_SITE_THEME=dark`) is the same chart on the chart table at night: deep
indigo `#171C3C` ground (never near-black), paper-ink type, lamp-lit raised bands under a
paper-ink rule, the vellum as a translucent indigo film, drift in survey pink, the observed
network in periwinkle, and the compass emerald only for "documented" text and lines. No green
fills, teal, glows or black shadows. Every dark token passes the same ΔE rule; the table is in
`originality.md` → Night chart.

Motion is native and CSS-only: cross-document View Transitions between pages (the wordmark and
the page title are shared elements), section reveals with scroll-driven animations, and the
12 s Two sheets loop. All of it sits behind `prefers-reduced-motion: no-preference`. Springs
are `linear()` curves defined once as tokens (`--lc-spring`, `--lc-spring-calm`).

Client JavaScript is under 2 KB gzipped per page: header state, the mobile sheet, disclosure
menus, the Two sheets offscreen pause, form messages, and the product page scroll-spy.
Section reveals and page transitions need no JavaScript. Everything works without it.

## Dependencies

Exact versions are pinned in `package.json` and `package-lock.json`.

| Package                              | Version | Why                                                                                                                              |
| ------------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `astro`                              | 7.3.8   | The static site generator.                                                                                                       |
| `@astrojs/mdx`                       | 8.0.3   | Long-form pages in MDX.                                                                                                          |
| `@astrojs/sitemap`                   | 3.7.4   | `sitemap-index.xml` with hreflang.                                                                                               |
| `tailwindcss`                        | 4.3.3   | Utility CSS on top of the design tokens.                                                                                         |
| `@tailwindcss/vite`                  | 4.3.3   | Tailwind's Vite plugin.                                                                                                          |
| `sharp`                              | 0.35.5  | Image pipeline (AVIF/WebP), icons and OG images.                                                                                 |
| `@fontsource-variable/ibm-plex-sans` | 5.3.0   | Self-hosted IBM Plex Sans, variable (Latin subset only): display and text.                                                       |
| `@fontsource/ibm-plex-sans-hebrew`   | 5.3.0   | Self-hosted IBM Plex Sans Hebrew 400/600 (Hebrew subset), plus its static Latin 400/600 faces, which Hebrew pages use for Latin. |
| `@fontsource/ibm-plex-mono`          | 5.3.0   | Self-hosted IBM Plex Mono 400 (Latin subset): identifiers, the datasheet, marginalia.                                            |
| `@astrojs/check` (dev)               | 0.9.10  | `astro check`.                                                                                                                   |
| `typescript` (dev)                   | 6.0.3   | Required peer of `@astrojs/check` (supports TypeScript 5 and 6, not 7).                                                          |
| `@playwright/test` (dev)             | 1.64.0  | End-to-end tests, screenshot capture, Chromium for Lighthouse.                                                                   |
| `@axe-core/playwright` (dev)         | 4.13.0  | Accessibility checks.                                                                                                            |
| `@lhci/cli` (dev)                    | 0.15.1  | Lighthouse budgets.                                                                                                              |
| `linkinator` (dev)                   | 8.1.0   | Internal link check.                                                                                                             |
| `prettier` (dev)                     | 3.9.10  | Formatting.                                                                                                                      |
| `prettier-plugin-astro` (dev)        | 1.1.1   | Lets Prettier format `.astro` files; without it the format check cannot cover the components.                                    |

No UI kit, animation library, icon font or analytics SDK. Icons are drawn inline in
`src/components/Icon.astro`. OG images set text in the same IBM Plex fonts through a
small WOFF2 decoder (`src/lib/woff2.ts`, Node's built-in Brotli) instead of another font package.

## Docker

The repository ships a production image: a multi-stage `Dockerfile` that builds the site with
Node 22 and serves `dist/` with unprivileged nginx (`nginxinc/nginx-unprivileged:1.30.5-alpine`,
about 94 MB, runs as uid 101 on port 8080).

```bash
cp .env.example .env              # optional: PUBLIC_* values, host port and bind address
docker compose up -d --build      # http://localhost:8088
docker compose ps                 # STATUS shows (healthy) once /healthz answers
docker/smoke.sh                   # 40 checks: pages, 404s, redirects, headers, caching, theme
docker/smoke.sh http://localhost:8088 dark   # the same against a dark build
docker compose down
```

| File                                                | Role                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Dockerfile`                                        | Build stage (`npm ci --omit=dev`, `astro build`) and nginx runtime stage with OCI labels and a health check.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `compose.yaml`                                      | One `web` service: read-only filesystem with a `/tmp` tmpfs, all capabilities dropped, `no-new-privileges`, CPU and memory limits, log rotation, health check.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `docker/nginx/nginx.conf`, `docker/nginx/site.conf` | Trailing-slash redirects, per-locale 404 pages, gzip, immutable caching for `/_astro/`, `/healthz`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `docker/render-nginx-headers.mjs`                   | Turns the built `dist/_headers` into nginx `add_header` lines at image build, so `public/_headers` stays the single source of the CSP and the form endpoint's origin is included.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `docker/smoke.sh`                                   | Checks a running container.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `tests/container.spec.ts`                           | Loads every page under the real headers and fails on any CSP violation or console error: `DOCKER_BASE_URL=http://localhost:8088 npx playwright test tests/container.spec.ts`. W10: also every header `docs/headers.md` lists, behind a TLS proxy and without one; with `EXPECT_SITE_URL` set to the image's `PUBLIC_SITE_URL`, the absolute URLs. W12: `EXPECT_NOINDEX=1` for an image built with `PUBLIC_SITE_INDEXING=false` (then `X-Robots-Tag: noindex` on every response and no sitemap in `robots.txt`; without it, no such header), and `EXPECT_NO_MARKERS=1` for an image built with the contact address (then no page in its sitemap shows a `TODO(operator)` marker). |

`PUBLIC_*` values are **build arguments**: set them in `.env` (compose reads it) and rebuild with
`--build`. `PUBLIC_SITE_URL` defaults to `http://localhost:<port>`; set the real origin for
anything other than local use. `PUBLIC_SITE_THEME=dark` in `.env` and
`docker compose up -d --build` serve the dark site; the image's
`org.lancompass.site-theme` label records the theme it was built with.

TLS: the container speaks plain HTTP. Put it behind your TLS proxy (set
`LANCOMPASS_WEB_BIND=127.0.0.1` when the proxy runs on the same host) and forward
`X-Forwarded-Proto: https`. nginx then adds `Strict-Transport-Security` and the CSP's
`upgrade-insecure-requests`; over plain HTTP it leaves both out, so the site also works on a
LAN address without TLS.

## Deployment

Any static host. Apply the headers in `public/_headers` (Netlify, Cloudflare Pages), the
nginx equivalents in `docs/headers.md`, or run the Docker image above, which applies them
itself. Since W12 the site is public at a preview address that asks search engines not to index
it (`PUBLIC_SITE_INDEXING=false`, above); it moves to the LanCompass domain once the operator's
remaining steps in [`docs/go-public.md`](docs/go-public.md) are done.
