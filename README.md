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

| Variable               | Effect                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `PUBLIC_SITE_URL`      | Origin for canonical URLs, hreflang, sitemap, Open Graph. Default `http://localhost:4321`.                                            |
| `PUBLIC_CONTACT_EMAIL` | mailto fallback for the forms, disclosure and accessibility contact. Empty → visible `TODO(operator)` marker.                         |
| `PUBLIC_FORM_ENDPOINT` | Forms POST here. Empty → each form is replaced by a mailto: button. Its origin is added to CSP `form-action`.                         |
| `PUBLIC_GITHUB_URL`    | Footer "Source code" link. Empty → not rendered.                                                                                      |
| `PUBLIC_DOCS_URL`      | "Docs" in the navigation and footer. Empty → not rendered.                                                                            |
| `PUBLIC_SITE_THEME`    | `light` (default): survey paper. `dark`: the Night chart. `auto`: both ship, the visitor's OS picks. Any other value fails the build. |

### Theme

The colour theme is a build-time choice, like every `PUBLIC_*` value: set
`PUBLIC_SITE_THEME` in `.env` (or in the build environment) and rebuild. With Docker,
`docker compose up -d --build`.

- `light` builds W1.1 exactly: survey paper, paper OG images and icons, light screenshots
  and videos.
- `dark` builds the **Night chart**: deep indigo ground, paper-ink type, lamp-lit bands, the
  product's Nightwire screenshots and videos, night OG images, a night manifest and
  `theme-color`.
- `auto` ships both palettes. CSS switches with `prefers-color-scheme`, screenshots switch
  with `<picture><source media>` (only the matching image is fetched), each video slot
  renders one player per scheme and hides the other, and there are two `theme-color` metas.
  Social cards stay paper. There is no JavaScript theme logic and no toggle.

How it is built: `<html data-theme>` carries the theme. `src/styles/tokens.css` holds the light
tokens and, after its `@night` marker, every dark value once as a tagged `--lc-dark-*` token
plus the mapping from semantic tokens to them; `src/styles/night.css` holds the few dark
component rules and `src/styles/auto.css` the auto-only ones. A small Vite plugin in
`astro.config.mjs` (`themeCss`) assembles the stylesheet per theme, so a light build carries
no dark CSS at all. Colours outside CSS (OG images, icons, manifest, contour files) come from
`src/lib/palette.ts`.
Release-key fingerprints for `/security#verification` live in `src/content/fingerprints.json`
(`[{ "kid": "...", "purpose": "...", "sha256": "AB:CD:..." }]`). The block renders only when
the list is not empty; it ships empty.

Videos: drop files into `public/media/<light|nightwire>/` as described in
`public/media/README.md`.

## Screenshots

`scripts/capture-screenshots.mjs` signs in to a locally running LanCompass, sets the theme
and language (`en`, `he`) in the capture browser's `localStorage` only, and saves 2× PNGs to
`src/assets/screens/<set>/{en,he}/<screen>.png`. It never changes data or settings.
`LANCOMPASS_CAPTURE_THEME` picks the product theme: `light` (default, the `light/` set the
light site shows) or `nightwire` (the product's default dark theme, the `nightwire/` set the
dark site shows); `dark` is also accepted. `LANCOMPASS_CAPTURE_DIR` writes to another folder
instead, for example `media-library/screens/nightwire`.

`scripts/record-video.mjs <key>` records one product video the same read-only way
(navigation, hover and scrolling; a click only follows a link; never a layer toggle, approve,
dismiss, save, import, sync or enable). Each video is a storyboard in that file: a title card,
five `{ seconds, en, he, run }` steps and an end card. It writes the WebM (1280 × 720, at most
45 s), a poster (`.jpg` and `.webp`, taken at the step marked `poster`) and en + he captions
timed to the same steps. Keys: `drift-review-queue`, `documented-vs-observed`, `hebrew-native`
(always he UI). `LANCOMPASS_VIDEO_UI` (`en` | `he`), `LANCOMPASS_CAPTURE_THEME` (`light` |
`nightwire`) and `LANCOMPASS_VIDEO_DIR` choose the variant and folder (default
`media-library/videos/<set>-<ui>/`). Flags:

- `--check` signs in and walks every step without recording, and fails if a link or element a
  step needs is missing. Run it before spending a recording.
- `--publish` also copies the recording to `public/media/<set>/<key>.<ui>.*`.
- `--cards <dir>` renders the title and end card to PNG; it needs neither the product nor a
  login.

Both scripts fill `media-library/` (light and Nightwire, en and he); see
`media-library/README.md`, then copy the site's set into `public/media/` (or use `--publish`).

```bash
docker run --rm --network host --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -e LANCOMPASS_DEMO_URL=http://localhost:3010 \
  -e LANCOMPASS_DEMO_USER -e LANCOMPASS_DEMO_PASS -e LANCOMPASS_CAPTURE_THEME=light \
  -v "$PWD":/app -w /app mcr.microsoft.com/playwright:v1.64.0-noble npm run capture
```

```bash
docker run --rm --network host --ipc=host --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -e LANCOMPASS_DEMO_USER -e LANCOMPASS_DEMO_PASS \
  -e LANCOMPASS_CAPTURE_THEME=nightwire -e LANCOMPASS_VIDEO_UI=he \
  -v "$PWD":/app -w /app mcr.microsoft.com/playwright:v1.64.0-noble \
  node scripts/record-video.mjs documented-vs-observed --check
```

Rebuild afterwards: `ScreenshotFrame` picks the files up automatically and serves them as
AVIF + WebP with `srcset`. Until a file exists, a schematic placeholder of the same 16:10
shape is shown. Check every capture for non-demo data before committing.

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
  layouts/         BaseLayout (head, SEO, header, footer), LongformLayout (MDX pages)
  components/      SiteHeader, MobileNav, LanguageSwitcher, SiteFooter, Button, Eyebrow,
                   SectionHeading, FeatureCard, AtlasIndex, Datasheet, MapLegend, TwoSheets,
                   ScreenshotFrame, StepTimeline, ComparisonRow, VideoSlot, CTABand, Prose,
                   form/, motifs/ (Contours, BearingScale, RegistrationMarks, Marginalia)
  content/         copy/{en,he}.ts (structured pages), pages/{en,he}/*.mdx, fingerprints.json
  i18n/            locales.ts (the locale list), en.json, he.json (UI strings)
  config/site.ts   PUBLIC_* configuration
  styles/          tokens.css (design tokens), global.css (Tailwind + base), fonts.css
  scripts/         the small client scripts (site, two sheets, forms, scroll-spy)
  lib/             build-time helpers: screenshots, OG images, WOFF2 decoding, media
  assets/          brand/ (compass mark), screens/{light,nightwire}/{en,he}/ (captures)
scripts/           capture-screenshots.mjs, record-video.mjs, build-test.mjs, lhci.mjs
media-library/     captured screens and videos (light + Nightwire, en + he), not built
tests/             Playwright specs
docs/headers.md    security headers and nginx equivalents
docs/design/       originality.md: the identity, measured against NetBox Labs (ΔE, fonts)
docs/copy/         he-voice.md (how Hebrew is written), he-review.md (every Hebrew string, glossed)
```

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

| File                                                | Role                                                                                                                                                                              |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Dockerfile`                                        | Build stage (`npm ci --omit=dev`, `astro build`) and nginx runtime stage with OCI labels and a health check.                                                                      |
| `compose.yaml`                                      | One `web` service: read-only filesystem with a `/tmp` tmpfs, all capabilities dropped, `no-new-privileges`, CPU and memory limits, log rotation, health check.                    |
| `docker/nginx/nginx.conf`, `docker/nginx/site.conf` | Trailing-slash redirects, per-locale 404 pages, gzip, immutable caching for `/_astro/`, `/healthz`.                                                                               |
| `docker/render-nginx-headers.mjs`                   | Turns the built `dist/_headers` into nginx `add_header` lines at image build, so `public/_headers` stays the single source of the CSP and the form endpoint's origin is included. |
| `docker/smoke.sh`                                   | Checks a running container.                                                                                                                                                       |
| `tests/container.spec.ts`                           | Loads every page under the real headers and fails on any CSP violation or console error: `DOCKER_BASE_URL=http://localhost:8088 npx playwright test tests/container.spec.ts`.     |

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
itself. Keep the site on a private preview URL until the trademark search is cleared.
