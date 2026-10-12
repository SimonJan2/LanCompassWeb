#!/bin/sh
# Smoke test for the running container: pages, locales, 404s, redirects,
# security headers, caching and the health endpoint.
#   docker/smoke.sh [base-url] [theme]   defaults http://localhost:8088, light
# The theme (light | dark | auto) is the PUBLIC_SITE_THEME the image was built with.
set -eu
BASE="${1:-http://localhost:8088}"
THEME="${2:-light}"
fail=0

check() { # description, expected, actual
  if [ "$2" = "$3" ]; then printf 'ok    %s\n' "$1"; else printf 'FAIL  %s (expected %s, got %s)\n' "$1" "$2" "$3"; fail=1; fi
}
status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
header() { curl -s -D - -o /dev/null "$2" ${3:+-H "$3"} | tr -d '\r' | grep -i "^$1:" | head -1 | cut -d' ' -f2-; }

for path in / /product/ /security/ /design-partners/ /contact/ /accessibility/ /privacy/ \
            /he/ /he/product/ /he/security/ /he/design-partners/ /he/contact/ /he/accessibility/ /he/privacy/; do
  check "GET $path" 200 "$(status "$BASE$path")"
done
for path in /sitemap-index.xml /robots.txt /site.webmanifest /favicon.svg /og/he/home.png /healthz; do
  check "GET $path" 200 "$(status "$BASE$path")"
done

check "<html data-theme> is $THEME" 1 "$(curl -s "$BASE/" | grep -c "<html [^>]*data-theme=\"$THEME\"")"
check "he page is rtl" 1 "$(curl -s "$BASE/he/" | grep -c '<html lang="he" dir="rtl"')"
check "unknown URL → 404" 404 "$(status "$BASE/no-such-page/")"
check "unknown /he/ URL → 404" 404 "$(status "$BASE/he/no-such-page/")"
check "unknown /he/ URL → Hebrew 404 page" 1 "$(curl -s "$BASE/he/no-such-page/" | grep -c 'lang="he"')"
check "/product → 301" 301 "$(status "$BASE/product")"
check "/product redirect target" "/product/" "$(header location "$BASE/product")"
check "_headers not served" 404 "$(status "$BASE/_headers")"

csp="$(header content-security-policy "$BASE/")"
case "$csp" in *"default-src 'self'"*"frame-ancestors 'none'"*) check "CSP present" yes yes ;; *) check "CSP present" yes no ;; esac
case "$csp" in *upgrade-insecure-requests*) check "no upgrade-insecure-requests over HTTP" no yes ;; *) check "no upgrade-insecure-requests over HTTP" no no ;; esac
check "no HSTS over HTTP" "" "$(header strict-transport-security "$BASE/")"
check "HSTS behind a TLS proxy" "max-age=63072000; includeSubDomains" "$(header strict-transport-security "$BASE/" "X-Forwarded-Proto: https")"
case "$(header content-security-policy "$BASE/" "X-Forwarded-Proto: https")" in
  *upgrade-insecure-requests) check "upgrade-insecure-requests behind a TLS proxy" yes yes ;;
  *) check "upgrade-insecure-requests behind a TLS proxy" yes no ;;
esac
check "X-Content-Type-Options" nosniff "$(header x-content-type-options "$BASE/")"
check "Referrer-Policy" strict-origin-when-cross-origin "$(header referrer-policy "$BASE/")"
check "headers on 404 too" nosniff "$(header x-content-type-options "$BASE/no-such-page/")"
check "no server version" nginx "$(header server "$BASE/")"
asset="$(curl -s "$BASE/" | grep -o '/_astro/[^"]*\.css' | head -1)"
check "hashed assets are immutable" "public, max-age=31536000, immutable" "$(header cache-control "$BASE$asset")"
check "assets keep security headers" nosniff "$(header x-content-type-options "$BASE$asset")"
check "gzip" gzip "$(curl -s -D - -o /dev/null -H 'Accept-Encoding: gzip' "$BASE/" | tr -d '\r' | grep -i '^content-encoding:' | cut -d' ' -f2)"

[ "$fail" -eq 0 ] && echo "smoke: all checks passed" || { echo "smoke: FAILED"; exit 1; }
