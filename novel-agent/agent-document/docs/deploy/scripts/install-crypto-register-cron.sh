#!/usr/bin/env bash
# Worker 安装每日 crypto 密钥注册 cron
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPLIT_ENV="${DEPLOY_SPLIT_ENV:-$SCRIPT_DIR/../docker/.env.split}"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_deploy-lib.sh"
if [[ -f "$SPLIT_ENV" ]]; then
  # shellcheck disable=SC1090
  source "$SPLIT_ENV"
fi

: "${WORKER_HOST:?}"

WORKER_SSH="${WORKER_SSH:-root@${WORKER_HOST}}"
REMOTE_DIR="${WORKER_REMOTE_DIR:-/opt/novel-agent}"
CRON_LINE="0 3 * * * cd $REMOTE_DIR && bash $REMOTE_DIR/novel-agent/agent-document/docs/deploy/scripts/register-frontend-crypto.sh >> /var/log/crypto-register.log 2>&1"

deploy_ssh "$WORKER_SSH" bash -s <<EOF
set -euo pipefail
MARK="# novel-agent-crypto-register"
TMP=\$(mktemp)
crontab -l 2>/dev/null | grep -v "\$MARK" | grep -v 'register-frontend-crypto.sh' > "\$TMP" || true
echo "$CRON_LINE \$MARK" >> "\$TMP"
crontab "\$TMP"
rm -f "\$TMP"
echo "[cron] 已安装:"
crontab -l | grep register-frontend-crypto || true
EOF
