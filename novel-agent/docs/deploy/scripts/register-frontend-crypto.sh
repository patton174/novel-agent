#!/usr/bin/env bash
# Worker 向 Auth 注册：bootstrap 密钥 + 动态 apiPathPrefix → crypto-runtime.json（无路由映射表）
#
# 每日 cron（Worker 上）：
#   0 3 * * * cd /opt/novel-agent && bash novel-agent/docs/deploy/scripts/register-frontend-crypto.sh >> /var/log/crypto-register.log 2>&1
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
SPLIT_ENV="${DEPLOY_SPLIT_ENV:-$SCRIPT_DIR/../docker/.env.split}"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_deploy-lib.sh"
if [[ -f "$SPLIT_ENV" ]]; then
  # shellcheck disable=SC1090
  source "$SPLIT_ENV"
fi

: "${MW_HOST:?}"
: "${WORKER_HOST:?}"

MW_SSH="${MW_SSH:-root@${MW_HOST}}"
WORKER_SSH="${WORKER_SSH:-root@${WORKER_HOST}}"
REMOTE_DIR="${WORKER_REMOTE_DIR:-/opt/novel-agent}"
ENV_REL="novel-agent/docs/deploy/docker/.env.worker"
COMPOSE_FILE="novel-agent/docs/deploy/docker/docker-compose.worker.yml"

AGENT_INTERNAL_SERVICE_KEY="${AGENT_INTERNAL_SERVICE_KEY:-${INTERNAL_SERVICE_KEY:-}}"
if [[ -z "$AGENT_INTERNAL_SERVICE_KEY" ]]; then
  if ! load_internal_service_key_from_mw; then
    echo "[crypto-register] 请在 .env.split 或 MW .env.mw 设置 AGENT_INTERNAL_SERVICE_KEY"
    exit 1
  fi
fi

PYTHON="${PYTHON:-python}"
if ! command -v "$PYTHON" >/dev/null 2>&1; then
  PYTHON=python3
fi

PAYLOAD_TMP="$(mktemp "${TMPDIR:-/tmp}/crypto-payload.XXXXXX.json")"
RUNTIME_TMP="$(mktemp "${TMPDIR:-/tmp}/crypto-runtime.XXXXXX.json")"

python_read_json() {
  local file="$1" key="$2"
  RUNTIME_FILE="$file" JSON_KEY="$key" "$PYTHON" -c "
import json, os
print(json.load(open(os.environ['RUNTIME_FILE'], encoding='utf-8'))[os.environ['JSON_KEY']])
"
}

echo "[crypto-register] 1/3 MW Auth 注册（密钥 + 动态 apiPathPrefix）..."
export WORKER_HOST
"$PYTHON" -c "
import json, os
print(json.dumps({'host': os.environ['WORKER_HOST'], 'ttlSec': 172800}))
" > "$PAYLOAD_TMP"

deploy_scp "$PAYLOAD_TMP" "$MW_SSH:/tmp/crypto-register-payload.json"
deploy_ssh "$MW_SSH" bash -s > "$RUNTIME_TMP" <<EOF
set -euo pipefail
curl -sf -X POST "http://127.0.0.1:8081/internal/crypto/register-frontend-server" \\
  -H "Content-Type: application/json" \\
  -H "X-Internal-Service-Key: ${AGENT_INTERNAL_SERVICE_KEY}" \\
  --data-binary @/tmp/crypto-register-payload.json
rm -f /tmp/crypto-register-payload.json
EOF

if [[ ! -s "$RUNTIME_TMP" ]]; then
  echo "[crypto-register] 注册失败：无 runtime 响应"
  exit 1
fi

KEY_ID="$(python_read_json "$RUNTIME_TMP" keyId)"
AES_KEY="$(python_read_json "$RUNTIME_TMP" aesKeyB64)"
VERSION="$(python_read_json "$RUNTIME_TMP" version)"
EXPIRES="$(python_read_json "$RUNTIME_TMP" expiresAtEpochMs)"
API_PREFIX="$(python_read_json "$RUNTIME_TMP" apiPathPrefix)"

echo "[crypto-register] 2/3 更新 Worker env + crypto-runtime.json ..."
deploy_scp "$RUNTIME_TMP" "$WORKER_SSH:/tmp/crypto-runtime.json"
deploy_ssh "$WORKER_SSH" bash -s <<EOF
set -euo pipefail
cd '$REMOTE_DIR'
ENV_FILE='$ENV_REL'
mkdir -p "\$(dirname "\$ENV_FILE")"
touch "\$ENV_FILE"
upsert_env() {
  local k="\$1" v="\$2"
  if grep -q "^\${k}=" "\$ENV_FILE" 2>/dev/null; then
    sed -i "s|^\${k}=.*|\${k}=\${v}|" "\$ENV_FILE"
  else
    echo "\${k}=\${v}" >> "\$ENV_FILE"
  fi
}
upsert_env FRONTEND_CRYPTO_KEY_ID '$KEY_ID'
upsert_env FRONTEND_CRYPTO_KEY '$AES_KEY'
upsert_env FRONTEND_CRYPTO_VERSION '$VERSION'
upsert_env FRONTEND_CRYPTO_EXPIRES_AT '$EXPIRES'
upsert_env FRONTEND_API_PATH_PREFIX '$API_PREFIX'

COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
CID=\$(\$COMPOSE -f '$COMPOSE_FILE' --env-file "\$ENV_FILE" ps -q frontend 2>/dev/null || true)
if [[ -n "\$CID" ]]; then
  chmod 644 /tmp/crypto-runtime.json
  docker cp /tmp/crypto-runtime.json "\$CID:/usr/share/nginx/html/crypto-runtime.json"
  # docker cp 常保留 600，nginx worker 无法读 → 403
  docker exec "\$CID" chmod 644 /usr/share/nginx/html/crypto-runtime.json
  docker exec "\$CID" rm -f /usr/share/nginx/html/crypto-manifest.json 2>/dev/null || true
fi
rm -f /tmp/crypto-runtime.json
echo "[crypto-register] Worker env + runtime.json 已更新"
EOF

rm -f "$PAYLOAD_TMP" "$RUNTIME_TMP"
echo "[crypto-register] 3/3 完成 kid=$KEY_ID prefix=$API_PREFIX version=$VERSION"
