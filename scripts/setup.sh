#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -f .env.live.local ]]; then cp .env.example .env.live.local; fi
npm ci --no-audit --no-fund --cache "${npm_config_cache:-${TMPDIR:-/tmp}/naxe-npm-cache}"
npm run db:generate
docker compose up -d --wait
npm run db:migrate
npm run db:seed
npm run typecheck
npm run build
