# Going public — the operator's checklist

Where the site stands after W12 (web night F, 2026-11-07, on `main` at `18db65a` plus night F's
changes), and the steps only the operator can take. The site is public at
`https://lancompass.simonlab.xyz` as a **preview** that asks search engines not to index it
(DECISIONS.md D-INDEXING); it moves to a LanCompass domain later. Night F's report, with every
check and number, is `lancompass-data/web-roadmap/Reports/WEB_NIGHT_F_RUN_REPORT.md`.

## 1. Done by the operator (2026-11-07)

- [x] **The Hebrew read** (D-HEBREW-REVIEW): the operator read the site's Hebrew and approved it.
      The marker in `src/content/copy/he.ts` is gone. Hebrew written after that read is marked
      "new (W12)", "new (W13)" in `docs/copy/he-review.md` and waits for the next read.
- [x] **The release key's fingerprint looked at** (W6): it reads
      `C0:47:0E:92:CE:F4:F9:DC:EC:DC:35:23:D5:8D:2A:82:DF:8E:B6:73:04:31:E3:AD:B2:47:D6:D2:17:E5:51:8D`
      on `/verify/#release-key`, `/he/verify/` and `/security/#verification`. Its comparison on
      the signing machine is still open (7.1).
- [x] **Every open question answered** (DECISIONS.md, 2026-11-07): the address, the contact, the
      way in, indexing, the banners, the privacy facts, the coordinator, the Hebrew, the theme.

## 2. Done by W12 (night F)

- [x] **No visible marker in the deployed build.** With `PUBLIC_CONTACT_EMAIL` set, no page shows
      a `TODO(operator)` marker (the container test crawls every page in the sitemap). A build
      without the address still shows the contact markers: that safety net stays.
- [x] **The legal banners removed** from `/privacy`, `/accessibility`, `/licensing` and `/pilot`
      (D-LEGAL-BANNERS); the lawyer's reading is 6.1.
- [x] **The privacy notice rewritten from the answers** (D-PRIVACY-FACTS, D-LICENCE-PATH): email
      only, what the template asks for, Cloudflare and its policy, the servers' logs (at most 30
      days), messages kept 12 months after the last one, your rights, the date. A build with
      `PUBLIC_FORM_ENDPOINT` set shows one marker on `/privacy/` ("name the form service on this
      page before using a form"), because the text describes email only.
- [x] **The accessibility statement completed** (D-COORDINATOR): no coordinator (fewer than 25
      employees), requests to the contact address; the latest review is the automated check of
      7 November 2026. A manual review is not claimed (6.2).
- [x] **Preview mode** (D-INDEXING): `PUBLIC_SITE_INDEXING=false` sends `X-Robots-Tag: noindex`
      on every response and leaves the sitemap out of `robots.txt`; no HTML changes (README →
      Preview mode, `docs/headers.md`).
- [x] **The edge measured** (`docs/headers.md` → "Behind Cloudflare"), with the fixes (5.2).

**Done by W13 (night F):** the published theme is `auto` (`.env.example` and `compose.yaml`
default to it; D-THEME), with a two-state light/dark switch in the header and the mobile menu
(D-SWITCH: the choice is kept in `lc-theme` only when it differs from the system's scheme,
pictures and videos follow it, and `/privacy` names it). A stored choice is applied when the
site's script runs, not before the first paint: a blocking boot script cost two pages their LCP
budget, so night F took the brief's fallback, step 3. Both official themes are on the page
(D-SHOWCASE: the home's dusk sweep, `/product`'s slider and each figure's Survey | Night chart
control, `/pilot`'s twin frames). README → Theme.

Sections 3 to 7 are open: only the operator can do them.

## 3. The name (open)

- [ ] **Trademark search for "LanCompass"** — LANCOM is the near mark to look at.
  - Step: your own clearance search, in Israel and wherever you sell.
  - Nothing on the site depends on it, but the name is on every page.

## 4. The domain and the inbox (open)

- [ ] **Register `lancompass.com`, with its mail (Google Workspace), and test
      `hello@lancompass.com`** (D-CONTACT).
  - On 2026-11-07 the domain was not registered (NXDOMAIN; the .com registry's RDAP answered
    404), and it still was not at 17:15, after the deploy of 17:11 put the address live. The
    site publishes the address by your decision; until the domain and its mail exist, mail to it
    bounces, and whoever registers the domain first would receive it.
  - Step: register the domain, set up the mailbox, send it a test mail from outside, and reply.
    The address is live since 2026-11-07 at 17:11 (5.1): do it now.

## 5. The deploy and the edge (open)

### 5.1 The deploy

- [x] **Three lines in `LanCompassWeb/.env`**, then rebuild (keep `PUBLIC_SITE_URL` as it is,
      `https://lancompass.simonlab.xyz`):

  ```text
  PUBLIC_CONTACT_EMAIL=hello@lancompass.com
  PUBLIC_SITE_INDEXING=false
  PUBLIC_SITE_THEME=auto
  ```

  `PUBLIC_SITE_THEME=auto` is W13's (both themes and the light/dark switch); without W13,
  keep the theme you have.

  ```bash
  cd /home/simonj/Documents/github/LanCompassWeb && LANCOMPASS_WEB_REVISION="$(git rev-parse --short HEAD)" docker compose up -d --build
  ```

  - Check: `curl -sI https://lancompass.simonlab.xyz/ | grep -i x-robots-tag` prints
    `x-robots-tag: noindex`; `/contact/` shows `hello@lancompass.com` and its button opens a mail
    with the template; `https://lancompass.simonlab.xyz/.well-known/security.txt` answers 200
    with `Contact: mailto:hello@lancompass.com`; the sun or moon switch is in the header (and in
    the mobile menu) and flips the whole site, pictures included. Rebuild at least every 180
    days, or `security.txt`'s `Expires` passes.
  - Done on 2026-11-07 at 17:11 (`docker compose up -d --build`, with the `.env` lines), checked
    at 17:12–17:15: `x-robots-tag: noindex` on every response, the address on every page that
    needs it and no marker left, `security.txt` 200 (`Expires: 2027-05-06`), the switch in the
    header. Through Cloudflare the address is rewritten by its e-mail obfuscation (5.2).

### 5.2 Cloudflare

- [ ] **Network Error Logging off; the header rewrite off; HSTS aligned; e-mail address
      obfuscation off** — the four steps and their `curl` checks in `docs/headers.md` → "Behind
      Cloudflare". NEL first: the privacy notice names Cloudflare as the site's deliverer and
      says nothing of browser error reports to it. The obfuscation, seen after the deploy, shows
      a visitor without JavaScript "[email protected]" and turns the mail buttons into a
      Cloudflare page.

## 6. The lawyer and a manual walk (open)

### 6.1 The lawyer

- [ ] **A lawyer's reading of `/privacy`, `/accessibility`, `/licensing` and `/pilot`**, in both
      languages (D-LEGAL-BANNERS: the banners are gone; the reading stays here).
  - Step: send the four pages (or their `.mdx` and copy files) to the lawyer. Legal citations
    (laws, articles) are theirs to add; the pages make no promise you did not give.
  - The access logs: the privacy notice promises at most 30 days. The container's logs
    (`compose.yaml`: Docker's `json-file`, 3 × 10 MB) rotate by size, not by age, so at low
    traffic a line can stay longer than 30 days; the proxy's logs are yours too. Make sure both
    are deleted within 30 days (for example a daily job that removes older files), or ask the
    lawyer for other wording.

### 6.2 A manual accessibility walk

- [ ] **A keyboard and screen-reader walk** of the main pages, in both languages, on a phone and
      a desktop (NVDA or VoiceOver).
  - Step: walk them; then add the date to `/accessibility/` ("the latest review"), in both
    `src/content/pages/{en,he}/accessibility.mdx`. Until then the statement claims only the
    automated check.

## 7. The release key, the leftovers, leaving preview (open)

### 7.1 The release key

- [ ] **Compare the fingerprint once on the MacBook, the signing machine** (W6):

  ```bash
  openssl pkey -pubin -in lancompass-release.pub -outform DER | shasum -a 256
  ```

  - Use the OpenSSL the signing script uses (`scripts/release/` in the product). The hex digest,
    in capitals in pairs, must read the fingerprint in item 1.

- [ ] **Decide whether this server keeps its copy of `~/lancompass-release-key/`** (the private
      key, mode 0600, and the public key). Signing happens on the MacBook; a second copy of the
      private key is a second place to protect. If it is not needed here, move it to offline
      storage or delete it.

### 7.2 Leftovers in the working tree

- [ ] **Delete the git-ignored leftovers** `dist-lhci-dark/`, `dist-lhci-auto/` (2026-10-12) and
      `.tmp/` in `LanCompassWeb/` (night E's defect 12): old build output that still holds
      retired file names. Nothing ships from them.

  ```bash
  cd /home/simonj/Documents/github/LanCompassWeb && rm -r dist-lhci-dark dist-lhci-auto .tmp
  ```

### 7.3 Leaving preview (when the LanCompass domain is ready)

- [ ] Set `PUBLIC_SITE_URL=https://<the domain>` and remove `PUBLIC_SITE_INDEXING` from `.env`;
      rebuild (5.1's command); add a 301 from `lancompass.simonlab.xyz` to the domain in
      Cloudflare (Rules → Redirect Rules). Then check: no `x-robots-tag` on the domain,
      `robots.txt` ends with `Sitemap: https://<the domain>/sitemap-index.xml`, and every page's
      canonical starts with the domain. Answer D-CRAWLERS (DECISIONS.md) before this step.

## 8. The markers

Every `TODO(operator)` in the repository after night F, from
`git grep -n "TODO(operator)"` (generated; line numbers as of night F). None shows in the deploy:
the visible ones need a value the deploy sets, or a form service it does not use.

| File                                                 | Line   | Kind    | Shows only when                                                                                       |
| ---------------------------------------------------- | ------ | ------- | ----------------------------------------------------------------------------------------------------- |
| `src/components/ContactEmail.astro`                  | 20     | contact | `PUBLIC_CONTACT_EMAIL` is empty (on `/contact`, `/security#disclosure`, `/accessibility`, `/privacy`) |
| `src/i18n/en.json`, `src/i18n/he.json`               | 122    | contact | `PUBLIC_CONTACT_EMAIL` is empty (the `mailto:` button on `/pilot#apply` and `/contact`)               |
| `src/content/pages/en/privacy.mdx`, `he/privacy.mdx` | 27     | form    | `PUBLIC_FORM_ENDPOINT` is set: name the form service on `/privacy/` before using a form               |
| `src/pages/[...lang]/verify.astro`                   | 52, 54 | a guard | `releases.json` or `fingerprints.json` lose the release's facts — never today                         |

Text about the markers, not markers: `.env.example:8`, `README.md:48`, `:298`, `:390`,
`src/config/site.ts:38`, `src/components/ContactEmail.astro:2`, `src/pages/[...lang]/verify.astro:8`,
this file, and `docs/copy/he-review.md` (the W10 note, `:836`; the `ui.form.noContact` gloss,
`:1299`). Tests that hold them: `tests/content.spec.ts`, `tests/flags.spec.ts`,
`tests/container.spec.ts`, `tests/helpers.ts` (`todoAllowed`, now empty; `FORM_SERVICE_MARKER`).

Gone with W12: the legal-review banners (`LongformLayout.astro`, `pilot.astro`,
`licensing.astro`), the statement's two markers and the notice's three (both languages), the
Hebrew-review marker (`src/content/copy/he.ts`) and the `server_name` marker in
`docs/headers.md`.

## 9. The decisions in effect

Every decision in `lancompass-data/web-roadmap/DECISIONS.md` (W2–W13), as the site applies it:

| Decision             | In effect                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| D-THEME              | answered: `auto` with a two-state light/dark switch (W13); `light` and `dark` keep building and passing                                     |
| D-CAPTURE            | pictures from the signed 0.7.0 bundle on a throwaway stack (`lcweb-cap`)                                                                    |
| D-SCREENS            | fifteen screen keys, Survey and Night chart, en and he, full window and a crop per slot (W11)                                               |
| D-VIDEO-WRITES       | the queue story applies one batch and undoes it, on the throwaway stack only                                                                |
| D-DOWNLOADS          | no public download: `/verify/` publishes the facts; the bundle comes from you                                                               |
| D-SBOM               | the release's CycloneDX file served from `/verify/`, its SHA-256 beside it                                                                  |
| D-FINGERPRINTS       | the release key only                                                                                                                        |
| D-EDITIONS           | no edition names: every licence includes every feature                                                                                      |
| D-PRICING            | no prices: "editions and prices follow the pilot — talk to us"                                                                              |
| D-PROCUREMENT        | nothing about public-sector buying on the site                                                                                              |
| D-LICENCE-PATH       | answered: email only — the `mailto:` button with its template; `PUBLIC_FORM_ENDPOINT` stays empty                                           |
| D-PILOT              | `/pilot/`, with `/design-partners/` redirected to it                                                                                        |
| D-NOTES-HE           | a native Hebrew summary per release, linking the English notes                                                                              |
| D-DOCS               | the product's 65 + 65 help pages at `/docs/` and `/he/docs/`                                                                                |
| D-DOCS-SEARCH        | no search: the index, "On this page" and the browser's find                                                                                 |
| D-GITHUB             | no "Source code" link                                                                                                                       |
| D-DOMAIN, D-CONTACT  | answered: `https://lancompass.simonlab.xyz` as a preview; `hello@lancompass.com` (4, 5.1)                                                   |
| D-CRAWLERS           | blank — moot while the site is a preview; `robots.txt` allows every agent and names the training group as your choice. Answer it before 7.3 |
| D-INDEXING           | answered: not indexed while at the preview address (`PUBLIC_SITE_INDEXING=false`)                                                           |
| D-LEGAL-BANNERS      | answered: removed; the lawyer's reading is 6.1                                                                                              |
| D-PRIVACY-FACTS      | answered: messages 12 months after the last one; Cloudflare delivers the site; your servers' logs at most 30 days; requests by email only   |
| D-COORDINATOR        | answered: fewer than 25 employees, so no coordinator; requests to the contact address                                                       |
| D-HEBREW-REVIEW      | answered: read and approved on 2026-11-07; new Hebrew is marked for the next read                                                           |
| D-SHOWCASE, D-SWITCH | answered: the four showcase pieces and the switch (W13)                                                                                     |

## 10. The checks, green

- [ ] **The full check set green in the theme you publish** (and, best, in all three).
  - In the repository: `npm ci`, `npm run check`, `npm run build`, `npm run format:check`,
    `npm run links` in `node:22`; `npm run test`, `npm run lhci`, `LHCI_THEME=dark npm run lhci`,
    `LHCI_THEME=auto npm run lhci` in `mcr.microsoft.com/playwright:v1.64.0-noble` (README →
    Testing). The claims against the tag, on the host:
    `node scripts/check-claims.mjs ../LanCompass v0.7.0` (0 missing).
  - The image, with your deploy's values: `docker/smoke.sh <url> auto`, and
    `DOCKER_BASE_URL=<url> EXPECT_SITE_URL=https://lancompass.simonlab.xyz EXPECT_SECURITY_TXT=1 EXPECT_NOINDEX=1 EXPECT_NO_MARKERS=1 EXPECT_CONTACT_EMAIL=hello@lancompass.com npx playwright test tests/container.spec.ts`.
  - State: green at night F's final gate in light, dark and auto, and on the operator build
    (night F's report).
