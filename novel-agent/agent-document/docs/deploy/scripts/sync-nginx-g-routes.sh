#!/usr/bin/env bash
# 同步 MW entry-nginx（HTTPS）与 Worker frontend 的 location /g/ → Gateway
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/../docker" && pwd)"
SPLIT_ENV="${DEPLOY_SPLIT_ENV:-$DEPLOY_DIR/.env.split}"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_deploy-lib.sh"
[[ -f "$SPLIT_ENV" ]] && source "$SPLIT_ENV"
: "${MW_HOST:?}"
: "${WORKER_HOST:?}"

MW_SSH="${MW_SSH:-root@${MW_HOST}}"
WORKER_SSH="${WORKER_SSH:-root@${WORKER_HOST}}"
MW_DIR="${MW_REMOTE_DIR:-/opt/novel-agent}"
WORKER_DIR="${WORKER_REMOTE_DIR:-/opt/novel-agent}"
DOCKER_DIR="$MW_DIR/novel-agent/agent-document/docs/deploy/docker"

DOMAIN="${PUBLIC_DOMAIN:-www.novel-agent.cn}"
CERT_NAME="${CERT_NAME:-$DOMAIN}"
DOMAIN_ALIASES="${CERT_EXTRA_DOMAINS:-}"
GATEWAY_UPSTREAM="${GATEWAY_UPSTREAM:-http://${MW_HOST}:8080}"

export WORKER_HOST DOMAIN DOMAIN_ALIASES CERT_NAME GATEWAY_UPSTREAM

echo "[sync-nginx-g] 1/2 MW entry-nginx (HTTPS + /g/) ..."
envsubst '${WORKER_HOST} ${DOMAIN} ${DOMAIN_ALIASES} ${CERT_NAME}' \
  < "$DEPLOY_DIR/nginx-entry-mw-ssl.conf.template" > "$DEPLOY_DIR/nginx-entry-mw.conf"
deploy_scp "$DEPLOY_DIR/nginx-entry-mw.conf" "$MW_SSH:$DOCKER_DIR/nginx-entry-mw.conf"
deploy_ssh "$MW_SSH" bash -s <<EOF
set -euo pipefail
cd '$MW_DIR'
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
CF='$DOCKER_DIR/docker-compose.mw.yml'
EF='$DOCKER_DIR/.env.mw'
\$COMPOSE -f "\$CF" --env-file "\$EF" up -d entry-nginx
sleep 2
\$COMPOSE -f "\$CF" --env-file "\$EF" exec -T entry-nginx nginx -t
grep -q 'location /g/' '$DOCKER_DIR/nginx-entry-mw.conf' || { echo "missing /g/ in nginx conf"; exit 1; }
EOF

echo "[sync-nginx-g] 2/2 Worker frontend nginx (/g/ + crypto-runtime.json) ..."
envsubst '${GATEWAY_UPSTREAM}' \
  < "$DEPLOY_DIR/nginx-frontend-worker.conf.template" > "$DEPLOY_DIR/nginx-frontend-worker.conf"
deploy_scp "$DEPLOY_DIR/nginx-frontend-worker.conf" \
  "$WORKER_SSH:$WORKER_DIR/novel-agent/agent-document/docs/deploy/docker/nginx-frontend-worker.conf"
deploy_ssh "$WORKER_SSH" bash -s <<EOF
set -euo pipefail
cd '$WORKER_DIR'
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
CF='novel-agent/agent-document/docs/deploy/docker/docker-compose.worker.yml'
EF='novel-agent/agent-document/docs/deploy/docker/.env.worker'
CID=\$(\$COMPOSE -f "\$CF" --env-file "\$EF" ps -q frontend 2>/dev/null || true)
if [[ -z "\$CID" ]]; then
  echo "[sync-nginx-g] frontend 容器未运行"
  exit 1
fi
docker cp "novel-agent/agent-document/docs/deploy/docker/nginx-frontend-worker.conf" "\$CID:/etc/nginx/conf.d/default.conf"
docker exec "\$CID" nginx -t
docker exec "\$CID" nginx -s reload
EOF

echo "[sync-nginx-g] 完成"
