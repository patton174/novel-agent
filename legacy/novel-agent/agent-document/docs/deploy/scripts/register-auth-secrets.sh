#!/usr/bin/env bash
# MW Auth 注册邮箱验证链接密钥 → Redis + .env.mw（幂等，不重启进程）
#
# 运行时 Auth 直接读 Redis（EmailLinkSecretService）；.env.mw 仅作冷启动备份。
# 由 register-frontend-crypto.sh / deploy-java auth 调用
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_deploy-lib.sh"

SPLIT_ENV="${DEPLOY_SPLIT_ENV:-$SCRIPT_DIR/../docker/.env.split}"
if [[ -f "$SPLIT_ENV" ]]; then
  # shellcheck disable=SC1090
  source "$SPLIT_ENV"
fi

: "${MW_HOST:?MW_HOST 未设置}"

MW_SSH="${MW_SSH:-root@${MW_HOST}}"
REMOTE_DIR="${MW_REMOTE_DIR:-/opt/novel-agent}"
ENV_REL="legacy/novel-agent/agent-document/docs/deploy/docker/.env.mw"
COMPOSE_FILE="legacy/novel-agent/agent-document/docs/deploy/docker/docker-compose.mw.yml"

AGENT_INTERNAL_SERVICE_KEY="${AGENT_INTERNAL_SERVICE_KEY:-${INTERNAL_SERVICE_KEY:-}}"
if [[ -z "$AGENT_INTERNAL_SERVICE_KEY" ]]; then
  if ! load_internal_service_key_from_mw; then
    echo "[auth-secrets] 请在 .env.split 或 MW .env.mw 设置 AGENT_INTERNAL_SERVICE_KEY"
    exit 1
  fi
fi

SECRET_TMP="$(mktemp "${TMPDIR:-/tmp}/email-link-secret.XXXXXX.json")"

echo "[auth-secrets] 1/2 MW Auth ensure-email-link-secret ..."
deploy_ssh "$MW_SSH" bash -s > "$SECRET_TMP" <<EOF
set -euo pipefail
curl -sf -X POST "http://127.0.0.1:8081/internal/auth/ensure-email-link-secret" \\
  -H "Content-Type: application/json" \\
  -H "X-Internal-Service-Key: ${AGENT_INTERNAL_SERVICE_KEY}"
EOF

if [[ ! -s "$SECRET_TMP" ]]; then
  echo "[auth-secrets] 注册失败：无响应"
  rm -f "$SECRET_TMP"
  exit 1
fi

PYTHON="${PYTHON:-python}"
if ! command -v "$PYTHON" >/dev/null 2>&1; then
  PYTHON=python3
fi

EMAIL_LINK_SECRET="$(
  SECRET_FILE="$SECRET_TMP" "$PYTHON" -c "
import json, os
data = json.load(open(os.environ['SECRET_FILE'], encoding='utf-8'))
print(data.get('emailLinkSecret', ''))
"
)"

rm -f "$SECRET_TMP"

if [[ -z "$EMAIL_LINK_SECRET" ]]; then
  echo "[auth-secrets] 响应缺少 emailLinkSecret"
  exit 1
fi

echo "[auth-secrets] 2/2 同步 MW .env.mw AUTH_EMAIL_LINK_SECRET ..."
deploy_ssh "$MW_SSH" bash -s <<EOF
set -euo pipefail
cd '$REMOTE_DIR'
ENV='$ENV_REL'
touch "\$ENV"
upsert_env() {
  local k="\$1" v="\$2"
  if grep -q "^\${k}=" "\$ENV" 2>/dev/null; then
    sed -i "s|^\${k}=.*|\${k}=\${v}|" "\$ENV"
  else
    echo "\${k}=\${v}" >> "\$ENV"
  fi
}
upsert_env AUTH_EMAIL_LINK_SECRET '$EMAIL_LINK_SECRET'
grep '^AUTH_EMAIL_LINK_SECRET=' "\$ENV" | sed 's/=.*/=***masked***/'
echo "[auth-secrets] Redis 已就绪，跳过 agent-auth 重启（运行时直读 Redis）"
EOF

echo "[auth-secrets] 完成"
