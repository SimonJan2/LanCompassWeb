# Going public — the operator's checklist

The site is ready to publish when every box below is ticked. Each item says how to check it and
where it stood at the W10 site check (night E, 2026-11-07, on `main` at `89dc3f9` plus night E's
changes). The checks are the operator's own steps: the site cannot do them for you. The full gate,
its numbers and its defects are in `lancompass-data/web-roadmap/Reports/WEB_NIGHT_E_RUN_REPORT.md`.

## 1. The name

- [ ] **Trademark search cleared for "LanCompass"** (LANCOM is the near mark to look at).
  - How to check: your own clearance search, in Israel and wherever you sell.
  - State: open. Nothing on the site depends on it, but the name is on every page.

## 2. The address, the inbox and the form

- [ ] **Domain registered, and `PUBLIC_SITE_URL` set** (DECISIONS.md D-DOMAIN).
  - How to check: build with `PUBLIC_SITE_URL=https://<your domain>`. Every page's canonical,
    `hreflang` and `og:url` start with it (view the page source); `/robots.txt` ends with
    `Sitemap: https://<your domain>/sitemap-index.xml`; the feeds' ids use it. Put the domain in
    the nginx example of `docs/headers.md` too (its `server_name` marker).
  - State: empty — the build falls back to `http://localhost:4321`. The container test checks a
    build with `https://lancompass.example` (night E: every URL absolute and on that origin).
- [ ] **`PUBLIC_CONTACT_EMAIL` set** (D-CONTACT, D-LICENCE-PATH).
  - How to check: `/contact/`, `/security/#disclosure` and `/accessibility/` show the address
    and no `TODO(operator): set PUBLIC_CONTACT_EMAIL` marker; with the domain set too, the build
    writes `/.well-known/security.txt` (RFC 9116: `Contact`, `Expires` 180 days ahead,
    `Preferred-Languages`, `Canonical`, `Policy`). Rebuild at least every 180 days, or its
    `Expires` passes.
  - State: empty — the markers show, and there is no `security.txt` (a file without `Contact`
    is invalid).
- [ ] **`PUBLIC_FORM_ENDPOINT` set**, or the decision to keep the `mailto:` button (D-LICENCE-PATH).
  - How to check: `/pilot/#apply` and `/contact/` show the form; a test submission reaches you;
    the CSP's `form-action` names the endpoint's origin (`dist/_headers`); `/privacy/` names the
    service that receives the submissions (its legal-review marker, below).
  - State: empty — the pages show a `mailto:` button (a marker while the address is empty too).

## 3. The release key, compared by eye

- [ ] **The fingerprint on `/verify/` compared once with the signing machine's key** (W6).
  - How to check: on the signing machine, `openssl pkey -pubin -in lancompass-release.pub -outform DER | sha256sum`;
    the hex digest, in capitals in pairs, must read
    `C0:47:0E:92:CE:F4:F9:DC:EC:DC:35:23:D5:8D:2A:82:DF:8E:B6:73:04:31:E3:AD:B2:47:D6:D2:17:E5:51:8D`,
    as `/verify/#release-key`, `/he/verify/` and `/security/#verification` print it.
  - State: open for you. Night E recomputed it from the 0.7.0 bundle's own `lancompass-release.pub`:
    equal to the site's, to `src/content/fingerprints.json` and to `INSTALL.md` and
    `INSTALL.he.md` §1 at `v0.7.0`. The comparison with the machine that signs is yours alone.

## 4. The Hebrew

- [ ] **Native Hebrew review**, with `docs/copy/he-review.md`.
  - How to check: read every row (W1 to W10, each with its literal back-gloss); mark what reads
    translated; then delete the marker at the top of `src/content/copy/he.ts` and the test line
    that holds it (`tests/content.spec.ts`, "only the Hebrew review marker").
  - State: open. Night E counted 867 Hebrew strings the site writes itself: every one has its row.

## 5. The legal pages

- [ ] **Legal review of `/privacy`, `/accessibility`, `/licensing` and `/pilot`**, in both languages.
  - How to check: each page shows "TODO(operator): legal review of this page before going
    public."; `/privacy/` and `/accessibility/` also carry questions in their text (the form
    service, the retention period, what the host logs; the last manual accessibility review).
    When the lawyer is done: answer them in the text, set `legalReview: false` in the two
    `.mdx` files' front matter (both languages), delete the banners in `pilot.astro` and
    `licensing.astro`, and take those pages out of `todoAllowed` in `tests/helpers.ts` — the tests
    then hold every page to no visible marker.
  - The accessibility statement says IS 5568 Part 1 (2023) at AA (WCAG 2.0 with national changes),
    tested against WCAG 2.2 AA, checked on 7 November 2026. The regulations ask for an
    accessibility coordinator only of some service providers (public-service providers with 25
    or more employees): whether the company is one is your fact; the statement keeps its marker.
  - State: open (four pages, ten markers in the text).

## 6. The theme

- [ ] **The published theme chosen** (D-THEME): `light`, `dark` or `auto`.
  - How to check: set `PUBLIC_SITE_THEME` in the deploy; `<html data-theme="…">` says it. All
    three build, test and hold the budgets (night E's final gate).
  - State: open — `.env.example` keeps `light`. Recommended: `auto` (the product's own pair,
    Survey by day and Night chart under a dark scheme, at no JavaScript cost).

## 7. The decisions still open

Every decision in `lancompass-data/web-roadmap/DECISIONS.md` was unanswered at night E; each wave
took its default. Answer the ones you want changed:

| Decision            | The default in effect                                                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D-THEME             | builds cover `light`, `dark` and `auto`; `.env.example` keeps `light` (item 6)                                                                                                                         |
| D-CAPTURE           | pictures from the signed 0.7.0 bundle on a throwaway stack (`lcweb-cap`)                                                                                                                               |
| D-SCREENS           | fifteen screen keys, Survey and Night chart, en and he, full window and a crop per slot (W11)                                                                                                          |
| D-VIDEO-WRITES      | the queue story applies one batch and undoes it, on the throwaway stack only                                                                                                                           |
| D-DOWNLOADS         | no public download: `/verify/` publishes the facts; the bundle comes from you                                                                                                                          |
| D-SBOM              | the release's CycloneDX file served from `/verify/`, its SHA-256 beside it                                                                                                                             |
| D-FINGERPRINTS      | the release key only                                                                                                                                                                                   |
| D-EDITIONS          | no edition names: every licence includes every feature                                                                                                                                                 |
| D-PRICING           | no prices: "editions and prices follow the pilot — talk to us"                                                                                                                                         |
| D-PROCUREMENT       | nothing about public-sector buying on the site                                                                                                                                                         |
| D-LICENCE-PATH      | the form when `PUBLIC_FORM_ENDPOINT` is set, else `mailto:` (item 2)                                                                                                                                   |
| D-PILOT             | `/pilot/`, with `/design-partners/` redirected to it                                                                                                                                                   |
| D-NOTES-HE          | a native Hebrew summary per release, linking the English notes                                                                                                                                         |
| D-DOCS              | the product's 65 + 65 help pages at `/docs/` and `/he/docs/`                                                                                                                                           |
| D-DOCS-SEARCH       | no search: the index, "On this page" and the browser's find                                                                                                                                            |
| D-GITHUB            | no "Source code" link                                                                                                                                                                                  |
| D-DOMAIN, D-CONTACT | empty (item 2)                                                                                                                                                                                         |
| D-CRAWLERS          | `robots.txt` names the search, user and training agents and allows them all; the training group says it is your choice — change its `Allow: /` to `Disallow: /` to refuse it, and say so on `/privacy` |

## 8. The markers

Every `TODO(operator)` marker in the repository at night E (line numbers as of that night).
The visible ones disappear as items 2, 4 and 5 are done.

| File                                                             | Line   | Kind            | What it waits for                                                                               |
| ---------------------------------------------------------------- | ------ | --------------- | ----------------------------------------------------------------------------------------------- |
| `src/content/pages/en/accessibility.mdx`, `he/accessibility.mdx` | 34     | legal           | confirm the statement against the regulations; the date of the last manual accessibility review |
| `src/content/pages/en/accessibility.mdx`, `he/accessibility.mdx` | 40     | a decision      | whether the company must name an accessibility coordinator, and who                             |
| `src/content/pages/en/privacy.mdx`, `he/privacy.mdx`             | 26     | legal · contact | the service that receives form submissions, where and how long it keeps them                    |
| `src/content/pages/en/privacy.mdx`, `he/privacy.mdx`             | 30     | legal           | the retention period                                                                            |
| `src/content/pages/en/privacy.mdx`, `he/privacy.mdx`             | 38     | legal · domain  | what the static host logs, once the host is chosen                                              |
| `src/layouts/LongformLayout.astro`                               | 101    | legal           | the review banner on `/privacy` and `/accessibility` (`legalReview: true`)                      |
| `src/pages/[...lang]/pilot.astro`                                | 42     | legal           | the review banner on `/pilot`                                                                   |
| `src/pages/[...lang]/licensing.astro`                            | 40     | legal           | the review banner on `/licensing`                                                               |
| `src/components/ContactEmail.astro`                              | 20     | contact         | `PUBLIC_CONTACT_EMAIL` (on `/contact`, `/security#disclosure`, `/accessibility`)                |
| `src/i18n/en.json`, `src/i18n/he.json`                           | 122    | contact         | `PUBLIC_CONTACT_EMAIL` (the form's `mailto:` fallback)                                          |
| `src/pages/[...lang]/verify.astro`                               | 52, 54 | a guard         | shown only if `releases.json` or `fingerprints.json` lose the release's facts — never today     |
| `docs/headers.md`                                                | 43     | domain          | the real domain in the nginx example                                                            |
| `src/content/copy/he.ts`                                         | 8      | review          | the native Hebrew review (item 4)                                                               |

Not markers but text about them: `.env.example:8`, `README.md:48` and `:240`,
`src/config/site.ts:36`, `src/content.config.ts:13`, `src/components/ContactEmail.astro:2`,
`src/pages/[...lang]/verify.astro:8`, and this file. Tests that hold them: `tests/content.spec.ts`,
`tests/flags.spec.ts`, `tests/helpers.ts` (`todoAllowed`). `docs/copy/he-review.md` quotes two of
them and names them once in its W10 note.

## 9. The checks, green

- [ ] **The full check set green in the theme you publish** (and, best, in all three).
  - How to check, in the repository: `npm ci`, `npm run check`, `npm run build`,
    `npm run format:check`, `npm run links` in `node:22`; `npm run test`, `npm run lhci`,
    `LHCI_THEME=dark npm run lhci`, `LHCI_THEME=auto npm run lhci` in
    `mcr.microsoft.com/playwright:v1.64.0-noble` (README → Testing). The claims against the tag,
    on the host: `node scripts/check-claims.mjs ../LanCompass v0.7.0` (0 missing). The image:
    `docker compose up -d --build`, then `docker/smoke.sh` and `tests/container.spec.ts` with
    `DOCKER_BASE_URL`.
  - State: green at night E's final gate in light, dark and auto, except what the night's
    report lists as defects with their owners.
