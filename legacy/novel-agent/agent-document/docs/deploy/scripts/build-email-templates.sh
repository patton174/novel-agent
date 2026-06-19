#!/usr/bin/env bash
# 编译 MJML 邮件模板 → agent-common-mail/src/main/resources/mail/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_DIR="$(cd "$SCRIPT_DIR/../../../../agent-common/agent-common-mail/email-templates" && pwd)"

cd "$TEMPLATES_DIR"

if command -v npm >/dev/null 2>&1; then
  npm ci 2>/dev/null || npm install
  npm run build
else
  echo "[email-templates] 需要 Node.js + npm"
  exit 1
fi

echo "[email-templates] 完成"
