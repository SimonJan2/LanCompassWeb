# syntax=docker/dockerfile:1.7
#
# LanCompass website: a static Astro build served by unprivileged nginx.
#
#   docker compose up -d --build        (see compose.yaml and README → Docker)
#
# PUBLIC_* values are baked in at build time, like every static build.

ARG NODE_IMAGE=node:22.23.3-bookworm-slim
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:1.30.5-alpine

# ---- build -------------------------------------------------------------------
FROM ${NODE_IMAGE} AS build
WORKDIR /app
ENV ASTRO_TELEMETRY_DISABLED=1 \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    FONTCONFIG_FILE=/app/docker/fonts.conf

# Dependencies first, so source edits reuse this layer.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

COPY . .

ARG PUBLIC_SITE_URL=""
ARG PUBLIC_CONTACT_EMAIL=""
ARG PUBLIC_FORM_ENDPOINT=""
ARG PUBLIC_GITHUB_URL=""
ARG PUBLIC_DOCS_URL=""
# light (default) | dark | auto — see README → Configuration.
ARG PUBLIC_SITE_THEME=light
ENV PUBLIC_SITE_URL=${PUBLIC_SITE_URL} \
    PUBLIC_CONTACT_EMAIL=${PUBLIC_CONTACT_EMAIL} \
    PUBLIC_FORM_ENDPOINT=${PUBLIC_FORM_ENDPOINT} \
    PUBLIC_GITHUB_URL=${PUBLIC_GITHUB_URL} \
    PUBLIC_DOCS_URL=${PUBLIC_DOCS_URL} \
    PUBLIC_SITE_THEME=${PUBLIC_SITE_THEME}

RUN npx astro build \
 && node docker/render-nginx-headers.mjs dist/_headers /app/security-headers.conf \
 && rm dist/_headers

# ---- serve -------------------------------------------------------------------
FROM ${NGINX_IMAGE} AS runtime

ARG VERSION=0.1.0
ARG REVISION=unknown
ARG PUBLIC_SITE_THEME=light
LABEL org.opencontainers.image.title="LanCompass website" \
      org.opencontainers.image.description="Static bilingual (en/he) marketing site for LanCompass, served by nginx." \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}" \
      org.opencontainers.image.source="https://github.com/SimonJan2/LanCompassWeb" \
      org.lancompass.site-theme="${PUBLIC_SITE_THEME}"

# Our config replaces the image defaults, so the entrypoint's IPv6 and template steps have nothing to edit.
USER root
RUN rm -f /etc/nginx/conf.d/default.conf
COPY --chown=root:root docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --chown=root:root docker/nginx/site.conf /etc/nginx/conf.d/site.conf
COPY --from=build --chown=root:root /app/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build --chown=root:root /app/dist /usr/share/nginx/html

USER 101
EXPOSE 8080
STOPSIGNAL SIGQUIT

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
