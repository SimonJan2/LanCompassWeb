#!/bin/sh
# The capture stack's only door to docker compose (W3). It runs Compose project lcweb-cap and
# refuses every other name: the bundle's own docker-compose.yml says `name: lancompass`, the
# operator's development project, so a bare `docker compose` in the bundle would recreate THAT
# stack. Compose files and env are explicit, so no .env or override in a folder is ever read.
#
#   BUNDLE=<extracted bundle folder> ENV_FILE=<folder>/lcweb-cap.env \
#     sh scripts/capture-stack/dc.sh lcweb-cap <compose arguments...>
#
# Examples: `... dc.sh lcweb-cap up -d --no-build`, `... dc.sh lcweb-cap ps`,
# `... dc.sh lcweb-cap down -v`. Anything but lcweb-cap exits 2 before Docker is called.
set -u
if [ $# -lt 2 ]; then
  echo "usage: dc.sh lcweb-cap <compose arguments...>" >&2
  exit 2
fi
project=$1
shift
if [ "$project" != "lcweb-cap" ]; then
  echo "dc.sh: refusing project '$project' (only lcweb-cap)" >&2
  exit 2
fi
: "${BUNDLE:?set BUNDLE to the extracted bundle folder}"
: "${ENV_FILE:?set ENV_FILE to the stack env file (make-env.mjs)}"
kit=$(cd "$(dirname "$0")" && pwd)
cd "$BUNDLE" || exit 1
exec docker compose -p lcweb-cap --env-file "$ENV_FILE" -f docker-compose.yml -f "$kit/override.yml" "$@"
