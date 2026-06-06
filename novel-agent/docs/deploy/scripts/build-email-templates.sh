#!/usr/bin/env bash
# 编译 MJML 邮件模板 → agent-common-mail/src/main/resources/mail/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_DIR="$(cd "$SCRIPT_DIR/../../agent-common/agent-common-mail/email-templates" && pwd)"

cd "$TEMPLATES_DIR"

if command -v corepack >/dev/null 2>&1; then
  corepack enable >/dev/null 2>&1 || true
  corepack prepare pnpm@9.15.9 --activate >/dev/null 2>&1 || true
fi

if command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install
  pnpm run build
elif command -v npm >/dev/null 2>&1; then
  npm install
  npm run build
else
  echo "[email-templates] 需要 Node.js + pnpm/npm"
  exit 1
fi

echo "[email-templates] 完成"
