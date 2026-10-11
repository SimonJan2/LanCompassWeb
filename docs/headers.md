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

## nginx

```nginx
server {
    listen 443 ssl http2;
    server_name example.com; # TODO(operator): the real domain
    root /srv/lancompass-web/dist;

    # Replace https://forms.example.com with PUBLIC_FORM_ENDPOINT's origin, or drop it when unset.
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://forms.example.com; frame-ancestors 'none'; upgrade-insecure-requests" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Cross-Origin-Opener-Policy "same-origin" always;

    location /_astro/ {
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        # add_header in a location replaces the server-level ones; repeat them here.
        add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; object-src 'none'; frame-ancestors 'none'" always;
        add_header X-Content-Type-Options "nosniff" always;
    }

    # Trailing-slash URLs map to directory index files (Astro build.format "directory").
    location / {
        try_files $uri $uri/index.html $uri.html =404;
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
