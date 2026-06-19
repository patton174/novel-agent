#!/usr/bin/env bash
# MW 机 HTTPS：acme.sh + entry-nginx（低内存，不用 Docker certbot）
#
# 用法：
#   bash legacy/novel-agent/agent-document/docs/deploy/scripts/setup-https.sh www.novel-agent.cn your@email.com
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/../docker" && pwd)"
SPLIT_ENV="${DEPLOY_SPLIT_ENV:-$DEPLOY_DIR/.env.split}"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_deploy-lib.sh"

DOMAIN="${1:?用法: setup-https.sh <域名> <邮箱>}"
: "${2:?请提供 Lets Encrypt 通知邮箱}"
EMAIL="$2"

if [[ ! -f "$SPLIT_ENV" ]]; then
  echo "[https] 缺少 $SPLIT_ENV"
  exit 1
fi
set -a
# shellcheck disable=SC1090
source "$SPLIT_ENV"
set +a

MW_HOST="${MW_HOST:?}"
MW_SSH="${MW_SSH:-root@${MW_HOST}}"
MW_DIR="${MW_REMOTE_DIR:-/opt/novel-agent}"
WORKER_HOST="${WORKER_HOST:?}"
DOCKER_DIR="$MW_DIR/legacy/novel-agent/agent-document/docs/deploy/docker"

CERT_NAME="${CERT_NAME:-$DOMAIN}"
EXTRA="${CERT_EXTRA_DOMAINS:-}"
DOMAIN_ALIASES="$EXTRA"

export WORKER_HOST DOMAIN DOMAIN_ALIASES CERT_NAME
envsubst '${WORKER_HOST} ${DOMAIN} ${DOMAIN_ALIASES}' \
  < "$DEPLOY_DIR/nginx-entry-mw-acme.conf.template" > "$DEPLOY_DIR/nginx-entry-mw.conf"

echo "[https] 同步 compose / nginx(acme) → MW"
deploy_scp "$DEPLOY_DIR/docker-compose.mw.yml" "$MW_SSH:$DOCKER_DIR/docker-compose.mw.yml"
deploy_scp "$DEPLOY_DIR/nginx-entry-mw.conf" "$MW_SSH:$DOCKER_DIR/nginx-entry-mw.conf"

deploy_ssh "$MW_SSH" \
  "DOMAIN='$DOMAIN' EMAIL='$EMAIL' MW_DIR='$MW_DIR'" bash -s <<'REMOTE'
set -euo pipefail
DD="$MW_DIR/legacy/novel-agent/agent-document/docs/deploy/docker"
cd "$MW_DIR"
CF=legacy/novel-agent/agent-document/docs/deploy/docker/docker-compose.mw.yml
EF=legacy/novel-agent/agent-document/docs/deploy/docker/.env.mw
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi

mkdir -p "$DD/certbot-www" "$DD/letsencrypt/live/$DOMAIN"
grep -q '^ENTRY_SSL_PORT=' "$EF" 2>/dev/null || echo 'ENTRY_SSL_PORT=443' >> "$EF"
grep -q '^PUBLIC_DOMAIN=' "$EF" 2>/dev/null || echo "PUBLIC_DOMAIN=$DOMAIN" >> "$EF"

$COMPOSE -f "$CF" --env-file "$EF" up -d entry-nginx
sleep 3

if [[ ! -x /root/.acme.sh/acme.sh ]]; then
  echo "[https] 安装 acme.sh ..."
  curl -fsSL https://get.acme.sh | sh -s email="$EMAIL"
fi

echo "[https] 申请 Lets Encrypt 证书 ..."
/root/.acme.sh/acme.sh --set-default-ca --server letsencrypt
/root/.acme.sh/acme.sh --issue -d "$DOMAIN" -w "$DD/certbot-www" --force --server letsencrypt

mkdir -p "$DD/letsencrypt/live/$DOMAIN"
/root/.acme.sh/acme.sh --install-cert -d "$DOMAIN" \
  --key-file "$DD/letsencrypt/live/$DOMAIN/privkey.pem" \
  --fullchain-file "$DD/letsencrypt/live/$DOMAIN/fullchain.pem" \
  --reloadcmd "cd '$MW_DIR' && $COMPOSE -f '$CF' --env-file '$EF' restart entry-nginx"
REMOTE

envsubst '${WORKER_HOST} ${DOMAIN} ${DOMAIN_ALIASES} ${CERT_NAME}' \
  < "$DEPLOY_DIR/nginx-entry-mw-ssl.conf.template" > "$DEPLOY_DIR/nginx-entry-mw.conf"
deploy_scp "$DEPLOY_DIR/nginx-entry-mw.conf" "$MW_SSH:$DOCKER_DIR/nginx-entry-mw.conf"

deploy_ssh "$MW_SSH" "MW_DIR='$MW_DIR' DOMAIN='$DOMAIN'" bash -s <<'REMOTE'
set -euo pipefail
cd "$MW_DIR"
CF=legacy/novel-agent/agent-document/docs/deploy/docker/docker-compose.mw.yml
EF=legacy/novel-agent/agent-document/docs/deploy/docker/.env.mw
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
# 必须 restart（仅 reload 不会绑定 443 SSL listener）
$COMPOSE -f "$CF" --env-file "$EF" up -d entry-nginx
$COMPOSE -f "$CF" --env-file "$EF" restart entry-nginx
sleep 3
$COMPOSE -f "$CF" --env-file "$EF" exec -T entry-nginx nginx -t
curl -skI "https://127.0.0.1/" -H "Host: $DOMAIN" | head -3
echo "[https] 完成 → https://$DOMAIN"
REMOTE
