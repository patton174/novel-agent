#!/usr/bin/env bash
# Worker 向 novel-studio 注册 bootstrap 密钥 → crypto-runtime.json（路由前缀 + AES key）
#
# 每日 cron（Worker 上）：
#   0 3 * * * cd /opt/novel-agent && bash novel-studio/deploy/ci/register-frontend-crypto.sh >> /var/log/crypto-register.log 2>&1
#
set -euo pipefail

CI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$CI_DIR/_common.sh"
ci_require_deploy_env
ci_setup_ssh

REMOTE="$(ci_remote worker)"
RDIR="$(ci_remote_dir worker)"
ENV_FILE="$RDIR/$DOCKER_REL/.env.worker"
COMPOSE_FILE="$RDIR/$DOCKER_REL/docker-compose.worker.yml"
OLD_ENV_WORKER="$RDIR/novel-agent/agent-document/docs/deploy/docker/.env.worker"
OLD_ENV_MW="$RDIR/novel-agent/agent-document/docs/deploy/docker/.env.mw"
NEW_ENV_MW="$RDIR/$DOCKER_REL/.env.mw"

remote_env_get() {
  local file="$1" key="$2"
  deploy_ssh "$REMOTE" "grep -E '^${key}=' '${file}' 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^\"//;s/\"\$//' || true" 2>/dev/null || true
}

load_internal_service_key() {
  local key="${AGENT_INTERNAL_SERVICE_KEY:-${INTERNAL_SERVICE_KEY:-}}"
  if [[ -n "$key" ]]; then
    echo "$key"
    return 0
  fi
  for file in "$ENV_FILE" "$OLD_ENV_WORKER"; do
    for name in AGENT_INTERNAL_SERVICE_KEY INTERNAL_SERVICE_KEY; do
      key="$(remote_env_get "$file" "$name")"
      if [[ -n "$key" ]]; then
        echo "$key"
        return 0
      fi
    done
  done
  key="$(remote_env_get "$NEW_ENV_MW" AGENT_INTERNAL_SERVICE_KEY)"
  [[ -n "$key" ]] && { echo "$key"; return 0; }
  key="$(remote_env_get "$OLD_ENV_MW" AGENT_INTERNAL_SERVICE_KEY)"
  [[ -n "$key" ]] && { echo "$key"; return 0; }
  if [[ -n "${MW_HOST:-}" ]]; then
    local mw_ssh="${MW_SSH:-root@${MW_HOST}}"
    key="$(deploy_ssh "$mw_ssh" "grep -E '^AGENT_INTERNAL_SERVICE_KEY=' '$OLD_ENV_MW' 2>/dev/null | head -1 | cut -d= -f2- || true" 2>/dev/null || true)"
    [[ -n "$key" ]] && { echo "$key"; return 0; }
  fi
  key="$(deploy_ssh "$REMOTE" bash -s <<'EOS'
set -euo pipefail
CID=$(docker ps -q --filter name=novel-studio 2>/dev/null | head -1)
if [[ -n "$CID" ]]; then
  docker exec "$CID" printenv AGENT_INTERNAL_SERVICE_KEY 2>/dev/null \
    || docker exec "$CID" printenv INTERNAL_SERVICE_KEY 2>/dev/null \
    || true
fi
EOS
)"
  [[ -n "$key" ]] && { echo "$key"; return 0; }
  return 1
}

AGENT_INTERNAL_SERVICE_KEY="$(load_internal_service_key || true)"
if [[ -z "$AGENT_INTERNAL_SERVICE_KEY" ]]; then
  echo "[crypto-register] 无法加载 AGENT_INTERNAL_SERVICE_KEY（检查 Worker/MW .env 或 novel-studio 容器）"
  exit 1
fi
echo "[crypto-register] 已加载 internal service key"

PYTHON="${PYTHON:-python}"
if ! command -v "$PYTHON" >/dev/null 2>&1; then
  PYTHON=python3
fi

PAYLOAD_TMP="$(mktemp "${TMPDIR:-/tmp}/crypto-payload.XXXXXX.json")"
RUNTIME_TMP="$(mktemp "${TMPDIR:-/tmp}/crypto-runtime.XXXXXX.json")"
trap 'rm -f "$PAYLOAD_TMP" "$RUNTIME_TMP"' EXIT

python_read_json() {
  local file="$1" key="$2"
  RUNTIME_FILE="$file" JSON_KEY="$key" "$PYTHON" -c "
import json, os
print(json.load(open(os.environ['RUNTIME_FILE'], encoding='utf-8'))[os.environ['JSON_KEY']])
"
}

echo "[crypto-register] 1/2 novel-studio 注册（密钥 + 动态 apiPathPrefix）..."
export WORKER_HOST
"$PYTHON" -c "
import json, os
print(json.dumps({'host': os.environ.get('WORKER_HOST', 'worker'), 'ttlSec': 172800}))
" > "$PAYLOAD_TMP"

deploy_scp "$PAYLOAD_TMP" "$REMOTE:/tmp/crypto-register-payload.json"
register_ok=0
for attempt in $(seq 1 8); do
  if deploy_ssh "$REMOTE" bash -s > "$RUNTIME_TMP" <<EOF
set -euo pipefail
curl -sf -X POST "http://127.0.0.1:8080/internal/crypto/register-frontend-server" \\
  -H "Content-Type: application/json" \\
  -H "X-Internal-Service-Key: ${AGENT_INTERNAL_SERVICE_KEY}" \\
  --data-binary @/tmp/crypto-register-payload.json
rm -f /tmp/crypto-register-payload.json
EOF
  then
    register_ok=1
    break
  fi
  echo "[crypto-register] novel-studio 未就绪，重试 $attempt/8 ..."
  sleep 3
done
if [[ "$register_ok" -ne 1 ]]; then
  echo "[crypto-register] 注册失败：novel-studio internal API 无响应"
  exit 1
fi

if [[ ! -s "$RUNTIME_TMP" ]]; then
  echo "[crypto-register] 注册失败：无 runtime 响应"
  exit 1
fi

KEY_ID="$(python_read_json "$RUNTIME_TMP" keyId)"
AES_KEY="$(python_read_json "$RUNTIME_TMP" aesKeyB64)"
VERSION="$(python_read_json "$RUNTIME_TMP" version)"
EXPIRES="$(python_read_json "$RUNTIME_TMP" expiresAtEpochMs)"
API_PREFIX="$(python_read_json "$RUNTIME_TMP" apiPathPrefix)"

echo "[crypto-register] 2/2 更新 Worker env + crypto-runtime.json ..."
deploy_scp "$RUNTIME_TMP" "$REMOTE:/tmp/crypto-runtime.json"
deploy_ssh "$REMOTE" bash -s <<EOF
set -euo pipefail
ENV_FILE='$ENV_FILE'
COMPOSE_FILE='$COMPOSE_FILE'
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
CID=\$(\$COMPOSE -f "\$COMPOSE_FILE" --env-file "\$ENV_FILE" ps -q frontend 2>/dev/null || true)
if [[ -n "\$CID" ]]; then
  chmod 644 /tmp/crypto-runtime.json
  docker cp /tmp/crypto-runtime.json "\$CID:/usr/share/nginx/html/crypto-runtime.json"
  docker exec "\$CID" chmod 644 /usr/share/nginx/html/crypto-runtime.json
  docker exec "\$CID" rm -f /usr/share/nginx/html/crypto-manifest.json 2>/dev/null || true
fi
rm -f /tmp/crypto-runtime.json
echo "[crypto-register] Worker env + runtime.json 已更新"
EOF

echo "[crypto-register] 完成 kid=$KEY_ID prefix=$API_PREFIX version=$VERSION"
