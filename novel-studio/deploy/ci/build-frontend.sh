#!/usr/bin/env bash
# GitHub Actions：构建 frontend/dist（生产默认开启 AES / 路由混淆 / 字段加密）
set -euo pipefail

CI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$CI_DIR/_common.sh"

cd "$REPO_ROOT/frontend"
export VITE_MONOLITH="${VITE_MONOLITH:-true}"
export VITE_SECURITY_AES="${VITE_SECURITY_AES:-true}"
export VITE_ROUTE_OBFUSCATION="${VITE_ROUTE_OBFUSCATION:-true}"
export VITE_FIELD_ENCRYPTION="${VITE_FIELD_ENCRYPTION:-true}"
export VITE_SECURITY_ENCRYPT_STREAM="${VITE_SECURITY_ENCRYPT_STREAM:-true}"
export VITE_CODE_OBFUSCATION="${VITE_CODE_OBFUSCATION:-true}"
# 生产默认走 GET /api/auth/api/captcha/config；CI 可设 VITE_TURNSTILE_SITE_KEY 作构建期兜底
export VITE_TURNSTILE_SITE_KEY="${VITE_TURNSTILE_SITE_KEY:-}"

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
