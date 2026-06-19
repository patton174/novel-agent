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
OLD_ENV_WORKER="$RDIR/legacy/novel-agent/agent-document/docs/deploy/docker/.env.worker"
OLD_ENV_MW="$RDIR/legacy/novel-agent/agent-document/docs/deploy/docker/.env.mw"
NEW_ENV_MW="$RDIR/$DOCKER_REL/.env.mw"

remote_env_get() {
  local file="$1" key="$2"
  deploy_ssh "$REMOTE" "grep -E '^${key}=' '${file}' 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^\"//;s/\"\$//' || true" 2>/dev/null || true
}

security_enabled="$(remote_env_get "$ENV_FILE" CLIENT_SECURITY_ENABLED)"
if [[ "${security_enabled,,}" != "true" ]]; then
  echo "[crypto-register] CLIENT_SECURITY_ENABLED!=true，跳过 crypto-runtime 注册"
  exit 0
fi

load_internal_service_key() {
  local key="${AGENT_INTERNAL_SERVICE_KEY:-${INTERNAL_SERVICE_KEY:-}}"
  if [[ -n "$key" ]]; then
    echo "$key"
    return 0
  fi
  key="$(deploy_ssh "$REMOTE" bash -s <<EOS
set -euo pipefail
RDIR='$RDIR'
read_key_from() {
  local f="\$1"
  [[ -f "\$f" ]] || return 0
  local line
  line=\$(grep -E '^(AGENT_INTERNAL_SERVICE_KEY|INTERNAL_SERVICE_KEY)=' "\$f" 2>/dev/null | head -1 || true)
  [[ -n "\$line" ]] || return 0
  local v="\${line#*=}"
  v="\${v%\"}"; v="\${v#\"}"
  if [[ -n "\$v" ]]; then echo "\$v"; fi
}
container_key() {
  local cid
  cid=\$(docker ps -qf 'ancestor=novel-studio/studio:latest' 2>/dev/null | head -1)
  if [[ -z "\$cid" ]]; then
    cid=\$(docker ps --format '{{.Names}}' 2>/dev/null | grep -E 'novel-studio' | grep -v frontend | head -1 || true)
    [[ -n "\$cid" ]] && cid=\$(docker ps -qf "name=\$cid" | head -1)
  fi
  if [[ -n "\$cid" ]]; then
    docker inspect "\$cid" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null \\
      | grep -E '^(AGENT_INTERNAL_SERVICE_KEY|INTERNAL_SERVICE_KEY)=' \\
      | head -1 | cut -d= -f2- || true
  fi
}
v=\$(container_key)
if [[ -n "\$v" ]]; then echo "\$v"; exit 0; fi
for f in \\
  "\$RDIR/novel-studio/deploy/docker/.env.worker" \\
  "\$RDIR/legacy/novel-agent/agent-document/docs/deploy/docker/.env.worker" \\
  "\$RDIR/legacy/novel-agent/agent-document/docs/deploy/docker/.env.mw" \\
  "\$RDIR/python-ai/.env"; do
  v=\$(read_key_from "\$f")
  if [[ -n "\$v" ]]; then echo "\$v"; exit 0; fi
done
EOS
)"
  key="$(echo "$key" | tr -d '\r' | head -1)"
  if [[ -n "$key" ]]; then
    echo "$key"
    return 0
  fi
  if [[ -n "${MW_HOST:-}" ]]; then
    local mw_ssh="${MW_SSH:-root@${MW_HOST}}"
    key="$(deploy_ssh "$mw_ssh" "grep -E '^AGENT_INTERNAL_SERVICE_KEY=' '$OLD_ENV_MW' 2>/dev/null | head -1 | cut -d= -f2- || true" 2>/dev/null || true)"
    key="$(echo "$key" | tr -d '\r')"
    [[ -n "$key" ]] && { echo "$key"; return 0; }
  fi
  return 1
}

AGENT_INTERNAL_SERVICE_KEY="$(load_internal_service_key || true)"
if [[ -z "$AGENT_INTERNAL_SERVICE_KEY" ]]; then
  echo "[crypto-register] 无法加载 AGENT_INTERNAL_SERVICE_KEY（检查 Worker/MW .env 或 novel-studio 容器）"
  exit 1
fi
echo "[crypto-register] 已加载 internal service key"

# 回写 Worker .env.worker，避免下次部署再找不到
deploy_ssh "$REMOTE" bash -s <<EOF
set -euo pipefail
ENV_FILE='$ENV_FILE'
KEY='${AGENT_INTERNAL_SERVICE_KEY}'
mkdir -p "\$(dirname "\$ENV_FILE")"
touch "\$ENV_FILE"
if grep -q '^AGENT_INTERNAL_SERVICE_KEY=' "\$ENV_FILE" 2>/dev/null; then
  sed -i "s|^AGENT_INTERNAL_SERVICE_KEY=.*|AGENT_INTERNAL_SERVICE_KEY=\${KEY}|" "\$ENV_FILE"
else
  echo "AGENT_INTERNAL_SERVICE_KEY=\${KEY}" >> "\$ENV_FILE"
fi
EOF

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

echo "[crypto-register] 等待 novel-studio 就绪..."
ready=0
for attempt in $(seq 1 60); do
  if deploy_ssh "$REMOTE" bash -s <<'EOS'
set -euo pipefail
for url in \
  "http://127.0.0.1:8080/actuator/health/liveness" \
  "http://127.0.0.1:8080/actuator/health" \
  "http://127.0.0.1:8080/"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 --max-time 8 "$url" 2>/dev/null || echo "000")
  # 000=连接被拒；其余说明 Tomcat 已监听（含 401/403/404/503）
  if [[ "$code" != "000" ]]; then exit 0; fi
done
exit 1
EOS
  then
    ready=1
    break
  fi
  echo "[crypto-register] 未就绪 $attempt/60 ..."
  sleep 3
done
if [[ "$ready" -ne 1 ]]; then
  echo "[crypto-register] novel-studio 就绪探测超时，最近日志："
  deploy_ssh "$REMOTE" bash -s <<'EOS' || true
cid=$(docker ps -aq --filter "ancestor=novel-studio/studio:latest" | head -1)
if [[ -n "$cid" ]]; then
  docker logs --tail 80 "$cid" 2>&1 || true
fi
EOS
  exit 1
fi

deploy_scp "$PAYLOAD_TMP" "$REMOTE:/tmp/crypto-register-payload.json"
register_ok=0
for attempt in $(seq 1 8); do
  if deploy_ssh "$REMOTE" bash -s > "$RUNTIME_TMP" <<EOF
set -euo pipefail
code=\$(curl -s -o /tmp/crypto-runtime-out.json -w "%{http_code}" -X POST "http://127.0.0.1:8080/internal/crypto/register-frontend-server" \\
  -H "Content-Type: application/json" \\
  -H "X-Internal-Service-Key: ${AGENT_INTERNAL_SERVICE_KEY}" \\
  --data-binary @/tmp/crypto-register-payload.json || echo "000")
if [[ "\$code" == "200" ]]; then
  cat /tmp/crypto-runtime-out.json
  rm -f /tmp/crypto-register-payload.json /tmp/crypto-runtime-out.json
  exit 0
fi
echo "[crypto-register] HTTP \$code" >&2
head -c 500 /tmp/crypto-runtime-out.json >&2 || true
rm -f /tmp/crypto-runtime-out.json
exit 1
EOF
  then
    register_ok=1
    break
  fi
  echo "[crypto-register] 注册失败，重试 $attempt/8 ..."
  sleep 3
done
deploy_ssh "$REMOTE" "rm -f /tmp/crypto-register-payload.json" 2>/dev/null || true
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

chmod 644 /tmp/crypto-runtime.json
if [[ ! -s /tmp/crypto-runtime.json ]]; then
  echo "[crypto-register] ERROR: crypto-runtime.json 写入失败" >&2
  exit 1
fi

COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
CID=\$(\$COMPOSE -f "\$COMPOSE_FILE" --env-file "\$ENV_FILE" ps -q frontend 2>/dev/null || true)
if [[ -n "\$CID" ]]; then
  docker cp /tmp/crypto-runtime.json "\$CID:/usr/share/nginx/html/crypto-runtime.json"
  docker exec "\$CID" chmod 644 /usr/share/nginx/html/crypto-runtime.json
  docker exec "\$CID" rm -f /usr/share/nginx/html/crypto-manifest.json 2>/dev/null || true
fi
rm -f /tmp/crypto-runtime.json
echo "[crypto-register] Worker env + runtime.json 已更新"
EOF

echo "[crypto-register] 完成 kid=$KEY_ID prefix=$API_PREFIX version=$VERSION"
