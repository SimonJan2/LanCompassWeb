# Security headers

The site ships `public/_headers` (Netlify and Cloudflare Pages format). The build
copies it to `dist/_headers` and, when `PUBLIC_FORM_ENDPOINT` is set, adds that
endpoint's origin to `form-action` (see `headersFormAction` in `astro.config.mjs`).

Every page is static. There are no inline scripts and no inline styles (Astro is
configured with `build.inlineStylesheets: "never"` and `vite.build.assetsInlineLimit: 0`),
so the policy needs neither `'unsafe-inline'` nor hashes. The only inline `<script>`
is the JSON-LD data block, which browsers never execute and CSP does not govern.

| Header                       | Value                                                                                                                                                                                                                                                                                         | Why                                                                                                  |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `Content-Security-Policy`    | `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' [form endpoint origin]; frame-ancestors 'none'; upgrade-insecure-requests` | Nothing loads from a third party. `img-src data:` covers browser-generated form-control images only. |
| `Strict-Transport-Security`  | `max-age=63072000; includeSubDomains`                                                                                                                                                                                                                                                         | Add `preload` only after submitting the domain to the preload list.                                  |
| `Referrer-Policy`            | `strict-origin-when-cross-origin`                                                                                                                                                                                                                                                             |                                                                                                      |
| `Permissions-Policy`         | `camera=(), microphone=(), geolocation=(), payment=(), usb=()`                                                                                                                                                                                                                                |                                                                                                      |
| `X-Content-Type-Options`     | `nosniff`                                                                                                                                                                                                                                                                                     |                                                                                                      |
| `X-Frame-Options`            | `DENY`                                                                                                                                                                                                                                                                                        | For old browsers; `frame-ancestors 'none'` is the modern control.                                    |
| `Cross-Origin-Opener-Policy` | `same-origin`                                                                                                                                                                                                                                                                                 |                                                                                                      |

`/_astro/*` files are content-hashed, so they get `Cache-Control: public, max-age=31536000, immutable`.
The product screens (`/screens/<set>/<locale>/*.webp`, W11) and videos (`/media/*`) keep stable
paths: the production image's nginx (`docker/nginx/site.conf`, its rule for media files) gives
them `Cache-Control: public, max-age=3600`, so a re-capture reaches visitors within the hour. W13's
light/dark switch adds no file and no header: its code is part of the site's one module script
(`/_astro/`), so the CSP needs no hash and no `'unsafe-inline'`.

Three kinds of same-origin file need their content types, and nothing else (the CSP is
unchanged: no new origin). W8's release-note feeds, `/changelog/feed.xml` and
`/he/changelog/feed.xml`, are Atom 1.0: `application/atom+xml; charset=utf-8` (nginx: a location in
`site.conf` and `application/atom+xml` in `charset_types` and `gzip_types`; Netlify and Cloudflare:
their own block in `public/_headers`).

| File                                                 | Content type                      | Written                                                                                                                                    |
| ---------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `/.well-known/security.txt`                          | `text/plain; charset=utf-8`       | by the build (`astro.config.mjs`, RFC 9116), only when `PUBLIC_CONTACT_EMAIL` and `PUBLIC_SITE_URL` are both set; `Expires` 180 days ahead |
| `/verify/lancompass-<version>-offline.sbom.cdx.json` | `application/json; charset=utf-8` | copied from `public/verify/`, byte-identical to the release's SBOM                                                                         |

`security.txt` is unsigned. Without a contact address there is no file: a `security.txt` without
`Contact` is invalid. Rebuild at least every 180 days, or the file's `Expires` passes.

**Preview mode** (W12, `PUBLIC_SITE_INDEXING=false`, DECISIONS.md D-INDEXING): the build adds one
more line to the `/*` block of `dist/_headers`, `X-Robots-Tag: noindex`, so every response asks
search engines not to index it — pages, assets, images, feeds, redirects and 404s (the image's
nginx gets it through `docker/render-nginx-headers.mjs`). `robots.txt` then still allows every
crawler (it must fetch a page to read the header) and lists no sitemap. An indexed build
(`true`, the default) sends no `X-Robots-Tag`; it is not in the table above because only a
preview sends it.

## nginx

```nginx
server {
    listen 443 ssl http2;
    server_name lancompass.simonlab.xyz; # the preview address (D-DOMAIN); the LanCompass domain later
    root /srv/lancompass-web/dist;

    # Replace https://forms.example.com with PUBLIC_FORM_ENDPOINT's origin, or drop it when unset.
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://forms.example.com; frame-ancestors 'none'; upgrade-insecure-requests" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    # While the address is a preview (PUBLIC_SITE_INDEXING=false); drop it with the flag.
    add_header X-Robots-Tag "noindex" always;

    location /_astro/ {
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        # add_header in a location replaces the server-level ones; repeat them here.
        add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; object-src 'none'; frame-ancestors 'none'" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Robots-Tag "noindex" always;
    }

    # Trailing-slash URLs map to directory index files (Astro build.format "directory").
    location / {
        try_files $uri $uri/index.html $uri.html =404;
    }

    # The design-partners page is now the pilot page (W7). The build also leaves a small
    # meta-refresh page at the old URL for hosts without this rule.
    location ~ ^/(he/)?design-partners/?$ {
        return 301 /$1pilot/;
    }

    # Locale-aware 404 pages.
    location /he/ {
        try_files $uri $uri/index.html =404;
        error_page 404 /he/404.html;
    }
    error_page 404 /404.html;
}
```

## 404 pages per locale

The build writes `/404.html` (English) and `/he/404.html` (Hebrew). Cloudflare Pages
serves the nearest `404.html` automatically. On Netlify, add a `_redirects` file with
`/he/*  /he/404.html  404` to get the Hebrew page for unknown `/he/` URLs.

## Behind Cloudflare

The live site is the Docker image (`compose.yaml`) behind a proxy on the operator's network and
Cloudflare, at `https://lancompass.simonlab.xyz`. Visitors receive what the edge sends, not
exactly what nginx sends. Measured on **2026-11-07 at 13:49 (+02:00)** with `curl -sI` and plain
`GET`s of `/`, `/pilot/`, `/docs/` and `/.well-known/security.txt` (night F's evidence:
`lancompass-data/web-roadmap/Reports/WEB_NIGHT_F/w12-edge-masked/`); "the site sends" is the
image's own value (the table above, and `docker/smoke.sh` on the image).

| Header                                                                                       | The site sends                      | The public address sends                                    | What it means                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| X-Frame-Options                                                                              | DENY                                | SAMEORIGIN                                                  | Weaker only in old browsers: the CSP's `frame-ancestors 'none'` still forbids every frame in current ones.                                                                         |
| Strict-Transport-Security                                                                    | max-age=63072000; includeSubDomains | max-age=15552000; includeSubDomains; preload                | Six months instead of two years. `preload` does nothing here: only a registrable domain can be submitted to the preload list, and `lancompass.simonlab.xyz` is a subdomain.        |
| X-XSS-Protection                                                                             | —                                   | 1; mode=block                                               | Obsolete: current browsers ignore it, and the CSP is the control.                                                                                                                  |
| NEL and Report-To                                                                            | —                                   | `cf-nel`, reports to `a.nel.cloudflare.com` (failures only) | Asks every visitor's browser to report network errors to Cloudflare: a third party the privacy notice does not name. The notice is written for the state after this is turned off. |
| Set-Cookie                                                                                   | —                                   | none on `/`, `/pilot/` or `/docs/`                          | As it must be: the site sets no cookie (`/privacy/`).                                                                                                                              |
| CSP, Referrer-Policy, Permissions-Policy, X-Content-Type-Options, Cross-Origin-Opener-Policy | as the table above                  | the same                                                    | Unchanged by the edge.                                                                                                                                                             |

At 13:49 `/.well-known/security.txt` answered 404 there: the deployed image was built without
`PUBLIC_CONTACT_EMAIL`. Every response says `server: cloudflare` and `cf-cache-status: DYNAMIC`.

**Measured again on 2026-11-07 at 17:15, after the deploy of 17:11** (the preview build, with the
contact address): every response carries `x-robots-tag: noindex`, and `security.txt` answers 200
with `Contact: mailto:hello@lancompass.com`. The four differences in the table are unchanged (the
fixes below are still to do), and the pages that show the address have a fifth, in their bodies.

### E-mail address obfuscation, in the page bodies

Cloudflare's Email Address Obfuscation (Scrape Shield; on by default) rewrites the ten pages that
show the contact address — `/contact/`, `/security/`, `/accessibility/`, `/privacy/` and
`/pilot/`, in both languages:

- each address in the text becomes `[email protected]` in a `__cf_email__` span;
- each `mailto:` link becomes `/cdn-cgi/l/email-protection#…` (the address and the template's
  subject and body, encoded);
- the page gains Cloudflare's `/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js`
  (1,239 B; 656 B transferred), which writes them back after the page loads.

Checked in Chromium on 2026-11-07 at about 17:14, on `/pilot/` and `/contact/`:

| On the public address           | With JavaScript                           | Without JavaScript                           |
| ------------------------------- | ----------------------------------------- | -------------------------------------------- |
| The address in the text         | shown                                     | "[email protected]"                          |
| The mail buttons (the template) | open a mail with the subject and the body | lead to Cloudflare's "email protection" page |

What it means: the site's pages work without JavaScript, but here a visitor without it loses the
address and the only way in (email, D-LICENCE-PATH). The script is not the site's: the CSP lets
it run only because Cloudflare serves it from the site's own address, and on `/pilot/` and
`/contact/` in `auto` it brings the scripts to 2,480 B gzip, over the site's 2,048 B budget. And
it protects nothing: the address is public by decision (D-CONTACT), and `security.txt` and each
page's structured data carry it in plain text, which the obfuscation leaves as it is.

### The operator's fixes, in the Cloudflare dashboard (and the proxy)

1. **Turn Network Error Logging off for the zone.** Dashboard → the zone → Network → Network
   Error Logging → off (or the zone setting `nel`: `PATCH /zones/{zone_id}/settings/nel` with
   `{"value":{"enabled":false}}`). It is on by default for Free and Pro zones. Do this first:
   the privacy notice says nothing of it.
2. **Find what rewrites `X-Frame-Options` and adds `X-XSS-Protection`, and turn it off.**
   Cloudflare's "Add security headers" managed transform (Rules → Transform Rules → Managed
   Transforms) adds exactly `x-xss-protection: 1; mode=block`, `x-frame-options: SAMEORIGIN`,
   `referrer-policy: same-origin` and `expect-ct`. The public response keeps the site's own
   `Referrer-Policy`, so if that transform is off, look at the proxy between Cloudflare and the
   container instead (its own `add_header` or security-headers preset).
3. **Align HSTS with the site's value and drop `preload`.** Dashboard → SSL/TLS → Edge
   Certificates → HTTP Strict Transport Security: max-age 2 years (63072000), include subdomains
   on, preload **off** — or turn Cloudflare's HSTS off and let the site's own header through
   (nginx sends it to a request that arrived over HTTPS, `X-Forwarded-Proto: https`).
4. **Turn Email Address Obfuscation off.** The zone setting `email_obfuscation` (Scrape Shield
   in the dashboard), or the API: `PATCH /zones/{zone_id}/settings/email_obfuscation` with
   `{"value":"off"}`. If other sites in the zone want it, turn it off for this hostname only:
   Rules → Configuration Rules, a rule for `lancompass.simonlab.xyz` with Email Obfuscation off.

### The check after each fix

```bash
curl -sI https://lancompass.simonlab.xyz/ | grep -iE '^(nel|report-to|x-frame-options|x-xss-protection|strict-transport-security|x-robots-tag):'
```

After the first three: no `nel` and no `report-to` line; `x-frame-options: DENY`; no
`x-xss-protection`; `strict-transport-security: max-age=63072000; includeSubDomains`; and
`x-robots-tag: noindex` (there since the deploy of 17:11). Repeat on `/pilot/` and `/docs/`
(and `/.well-known/security.txt`, which answers 200 since that deploy).

After the fourth:

```bash
curl -s https://lancompass.simonlab.xyz/contact/ | grep -c 'email-decode'
```

prints `0` (at 17:15 it printed `1`: Cloudflare's script was on the page), and the page's mail
buttons are plain `mailto:` links again, with JavaScript or without.
