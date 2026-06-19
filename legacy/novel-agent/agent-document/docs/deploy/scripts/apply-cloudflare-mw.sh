#!/usr/bin/env bash
# MW 应用 Cloudflare 真实 IP 配置并重启 entry-nginx
set -eu
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/../docker" && pwd)"
SPLIT_ENV="${DEPLOY_SPLIT_ENV:-$DEPLOY_DIR/.env.split}"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_deploy-lib.sh"

if [[ -f "$SPLIT_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$SPLIT_ENV"
  set +a
fi

MW_HOST="${MW_HOST:?}"
MW_SSH="${MW_SSH:-root@${MW_HOST}}"
MW_DIR="${MW_REMOTE_DIR:-/opt/novel-agent}"
DOCKER_DIR="$MW_DIR/legacy/novel-agent/agent-document/docs/deploy/docker"
DOMAIN="${PUBLIC_DOMAIN:-www.novel-agent.cn}"
WORKER_HOST="${WORKER_HOST:?}"
CERT_NAME="${CERT_NAME:-$DOMAIN}"
DOMAIN_ALIASES="${CERT_EXTRA_DOMAINS:-}"

export WORKER_HOST DOMAIN DOMAIN_ALIASES CERT_NAME
envsubst '${WORKER_HOST} ${DOMAIN} ${DOMAIN_ALIASES} ${CERT_NAME}' \
  < "$DEPLOY_DIR/nginx-entry-mw-ssl.conf.template" > "$DEPLOY_DIR/nginx-entry-mw.conf"

deploy_scp "$DEPLOY_DIR/docker-compose.mw.yml" "$MW_SSH:$DOCKER_DIR/docker-compose.mw.yml"
deploy_scp "$DEPLOY_DIR/nginx-cloudflare-realip.conf" "$MW_SSH:$DOCKER_DIR/nginx-cloudflare-realip.conf"
deploy_scp "$DEPLOY_DIR/nginx-entry-mw.conf" "$MW_SSH:$DOCKER_DIR/nginx-entry-mw.conf"

deploy_ssh "$MW_SSH" bash -s <<REMOTE
set -eu
cd '$MW_DIR'
CF='$DOCKER_DIR/docker-compose.mw.yml'
EF='$DOCKER_DIR/.env.mw'
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
\$COMPOSE -f "\$CF" --env-file "\$EF" up -d entry-nginx
\$COMPOSE -f "\$CF" --env-file "\$EF" restart entry-nginx
\$COMPOSE -f "\$CF" --env-file "\$EF" exec -T entry-nginx nginx -t
echo "[cloudflare] entry-nginx 已加载 CF-Connecting-IP 配置"
REMOTE

echo "[cloudflare] 完成。Cloudflare 控制台请确认："
echo "  - SSL/TLS → Full (strict)"
echo "  - /api/* /g/* → Bypass cache"
echo "  - /assets/* → Cache"
