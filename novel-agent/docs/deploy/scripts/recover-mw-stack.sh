#!/usr/bin/env bash
# MW 栈诊断与恢复（Gateway 502 时用）
#
#   bash novel-agent/docs/deploy/scripts/recover-mw-stack.sh
#   REBUILD=1 bash novel-agent/docs/deploy/scripts/recover-mw-stack.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPLIT_ENV="${DEPLOY_SPLIT_ENV:-$SCRIPT_DIR/../docker/.env.split}"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_deploy-lib.sh"
if [[ -f "$SPLIT_ENV" ]]; then
  # shellcheck disable=SC1090
  source "$SPLIT_ENV"
fi

: "${MW_HOST:?MW_HOST 未设置}"
MW_SSH="${MW_SSH:-root@${MW_HOST}}"
REMOTE_DIR="${MW_REMOTE_DIR:-/opt/novel-agent}"
COMPOSE_FILE="novel-agent/docs/deploy/docker/docker-compose.mw.yml"
ENV_REL="novel-agent/docs/deploy/docker/.env.mw"

echo "[recover-mw] 诊断 MW @ $MW_HOST ..."
deploy_ssh "$MW_SSH" bash -s <<EOF
set -euo pipefail
cd '$REMOTE_DIR'
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
CF='$COMPOSE_FILE'
ENV='$ENV_REL'
\$COMPOSE -f "\$CF" --env-file "\$ENV" ps entry-nginx agent-gateway agent-auth
echo "--- gateway logs ---"
GW=\$(\$COMPOSE -f "\$CF" --env-file "\$ENV" ps -q agent-gateway || true)
if [[ -n "\${GW:-}" ]]; then docker logs "\$GW" --tail 60 2>&1; fi
echo "--- auth logs ---"
AU=\$(\$COMPOSE -f "\$CF" --env-file "\$ENV" ps -q agent-auth || true)
if [[ -n "\${AU:-}" ]]; then docker logs "\$AU" --tail 40 2>&1; fi
echo "--- probe ---"
curl -s -o /dev/null -w "gateway8080 HTTP %{http_code}\\n" --connect-timeout 3 \\
  -X POST http://127.0.0.1:8080/api/auth/api/login \\
  -H 'Content-Type: application/json' \\
  -d '{"username":"_probe","password":"_probe"}' || echo "gateway8080 HTTP 000"
curl -s -o /dev/null -w "auth8081 HTTP %{http_code}\\n" --connect-timeout 3 \\
  -X POST http://127.0.0.1:8081/api/auth/api/login \\
  -H 'Content-Type: application/json' \\
  -d '{"username":"_probe","password":"_probe"}' || echo "auth8081 HTTP 000"
EOF

if [[ "${REBUILD:-0}" == "1" ]]; then
  echo "[recover-mw] REBUILD=1 → compose build + up auth/gateway ..."
  deploy_ssh "$MW_SSH" bash -s <<EOF
set -euo pipefail
cd '$REMOTE_DIR'
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
\$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' build agent-auth agent-gateway
\$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' up -d agent-auth agent-gateway entry-nginx
sleep 20
\$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' ps agent-auth agent-gateway entry-nginx
EOF
else
  echo "[recover-mw] 重启 auth → gateway → entry-nginx ..."
  deploy_ssh "$MW_SSH" bash -s <<EOF
set -euo pipefail
cd '$REMOTE_DIR'
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
\$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' restart agent-auth
sleep 15
\$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' restart agent-gateway
sleep 15
\$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' restart entry-nginx
EOF
fi

deploy_wait_http_port "$MW_SSH" 8080 "gateway" 30
echo "[recover-mw] 完成。请硬刷新 https://www.novel-agent.cn 并重试登录。"
