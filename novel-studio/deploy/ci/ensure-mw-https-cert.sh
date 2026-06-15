#!/usr/bin/env bash
# MW 机：检查 / 续期 novel-agent.cn + www 证书（acme.sh webroot）
set -euo pipefail

CI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$CI_DIR/_common.sh"
ci_require_deploy_env
ci_setup_ssh

export DOMAIN="${DOMAIN:-novel-agent.cn}"
export DOMAIN_ALIASES="${DOMAIN_ALIASES:-www.novel-agent.cn}"
export CERT_NAME="${CERT_NAME:-novel-agent.cn}"
export WORKER_HOST="${WORKER_HOST}"
export ACME_EMAIL="${ACME_EMAIL:-hello@noreply.novel-agent.cn}"

REMOTE="$(ci_remote mw)"
RDIR="$(ci_remote_dir mw)"
COMPOSE_FILE="$(ci_compose_file mw)"
ENV_FILE="$(ci_env_file mw)"

deploy_ssh "$REMOTE" bash -s <<EOF
set -euo pipefail
DOMAIN='$DOMAIN'
DOMAIN_ALIASES='$DOMAIN_ALIASES'
CERT_NAME='$CERT_NAME'
ACME_EMAIL='$ACME_EMAIL'
RDIR='$RDIR'
DOCKER_REL='$DOCKER_REL'
COMPOSE_FILE='$COMPOSE_FILE'
ENV_FILE='$ENV_FILE'

cd "\$RDIR/\$DOCKER_REL"
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
LE_DIR="\$PWD/letsencrypt"
CERT_DIR="\$LE_DIR/live/\$CERT_NAME"
FULLCHAIN="\$CERT_DIR/fullchain.pem"

mkdir -p "\$PWD/certbot-www" "\$CERT_DIR"

cert_covers_domain() {
  local cert_file="\$1"
  local host="\$2"
  openssl x509 -in "\$cert_file" -noout -text 2>/dev/null | grep -q "DNS:\${host}"
}

cert_valid() {
  local cert_file="\$1"
  [[ -f "\$cert_file" ]] || return 1
  openssl x509 -in "\$cert_file" -noout -checkend 86400 >/dev/null 2>&1 || return 1
  cert_covers_domain "\$cert_file" "\$DOMAIN" || return 1
  if [[ -n "\$DOMAIN_ALIASES" ]]; then
    cert_covers_domain "\$cert_file" "\$DOMAIN_ALIASES" || return 1
  fi
  return 0
}

pick_existing_cert_name() {
  local candidate
  for candidate in "\$CERT_NAME" "\$DOMAIN" "\$DOMAIN_ALIASES" "www.novel-agent.cn"; do
    if cert_valid "\$LE_DIR/live/\$candidate/fullchain.pem"; then
      echo "\$candidate"
      return 0
    fi
  done
  return 1
}

render_acme_nginx() {
  sed -e "s/\\\${WORKER_HOST}/$WORKER_HOST/g" \
      -e "s/\\\${DOMAIN}/\$DOMAIN/g" \
      -e "s/\\\${DOMAIN_ALIASES}/\$DOMAIN_ALIASES/g" \
      nginx-entry-mw-acme.conf.template > nginx-entry-mw.conf
}

render_ssl_nginx() {
  sed -e "s/\\\${WORKER_HOST}/$WORKER_HOST/g" \
      -e "s/\\\${DOMAIN}/\$DOMAIN/g" \
      -e "s/\\\${DOMAIN_ALIASES}/\$DOMAIN_ALIASES/g" \
      -e "s/\\\${CERT_NAME}/\$CERT_NAME/g" \
      nginx-entry-mw-ssl.conf.template > nginx-entry-mw.conf
}

if existing="\$(pick_existing_cert_name)"; then
  if [[ "\$existing" != "\$CERT_NAME" ]]; then
    echo "[ensure-cert] 复用已有证书目录 live/\$existing → live/\$CERT_NAME"
    mkdir -p "\$CERT_DIR"
    ln -sfn "../\$existing/fullchain.pem" "\$CERT_DIR/fullchain.pem"
    ln -sfn "../\$existing/privkey.pem" "\$CERT_DIR/privkey.pem"
  fi
  echo "[ensure-cert] 证书有效（\$existing），跳过签发"
  exit 0
fi

echo "[ensure-cert] 证书缺失 / 不含双域名 / 将过期，开始 acme.sh 签发 ..."
render_acme_nginx
\$COMPOSE -f "\$COMPOSE_FILE" --env-file "\$ENV_FILE" up -d --no-build entry-nginx
\$COMPOSE -f "\$COMPOSE_FILE" --env-file "\$ENV_FILE" exec -T entry-nginx nginx -t
\$COMPOSE -f "\$COMPOSE_FILE" --env-file "\$ENV_FILE" restart entry-nginx
sleep 2

if [[ ! -x /root/.acme.sh/acme.sh ]]; then
  echo "[ensure-cert] 安装 acme.sh ..."
  curl -fsSL https://get.acme.sh | sh -s email="\$ACME_EMAIL"
fi

/root/.acme.sh/acme.sh --set-default-ca --server letsencrypt
issue_args=(-d "\$DOMAIN")
if [[ -n "\$DOMAIN_ALIASES" ]]; then
  issue_args+=(-d "\$DOMAIN_ALIASES")
fi
/root/.acme.sh/acme.sh --issue "\${issue_args[@]}" -w "\$PWD/certbot-www" --force --server letsencrypt

mkdir -p "\$CERT_DIR"
/root/.acme.sh/acme.sh --install-cert -d "\$DOMAIN" \
  --key-file "\$CERT_DIR/privkey.pem" \
  --fullchain-file "\$CERT_DIR/fullchain.pem" \
  --reloadcmd "cd '\$RDIR/\$DOCKER_REL' && \$COMPOSE -f '\$COMPOSE_FILE' --env-file '\$ENV_FILE' restart entry-nginx"

if ! cert_valid "\$FULLCHAIN"; then
  echo "[ensure-cert] ERROR: 签发后证书仍无效"
  openssl x509 -in "\$FULLCHAIN" -noout -text | grep -E 'DNS:|Not After' || true
  exit 1
fi

openssl x509 -in "\$FULLCHAIN" -noout -subject -dates
echo "[ensure-cert] 签发完成 → live/\$CERT_NAME"
EOF

echo "[ensure-cert] 完成"
