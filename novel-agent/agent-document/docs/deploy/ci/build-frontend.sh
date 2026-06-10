#!/usr/bin/env bash
# GitHub Actions：构建 frontend/dist
set -euo pipefail

CI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$CI_DIR/_common.sh"

cd "$REPO_ROOT/frontend"
corepack enable 2>/dev/null || true
if command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile
  pnpm exec vite build
else
  npm ci
  npx vite build
fi
[[ -d dist ]] || { echo "缺少 frontend/dist"; exit 1; }
echo "BUILT_DIST=$REPO_ROOT/frontend/dist"
