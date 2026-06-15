#!/usr/bin/env bash
# 在 MW 机上执行：检查 / 签发 novel-agent.cn + www 证书
set -euo pipefail

DOMAIN="${1:?domain}"
DOMAIN_ALIASES="${2:-}"
CERT_NAME="${3:-$DOMAIN}"
ACME_EMAIL="${4:-hello@noreply.novel-agent.cn}"
RDIR="${5:?remote dir}"
DOCKER_REL="${6:-novel-studio/deploy/docker}"

cd "$RDIR/$DOCKER_REL"
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
COMPOSE_FILE="docker-compose.mw.yml"
ENV_FILE=".env.mw"
LE_DIR="$PWD/letsencrypt"
CERT_DIR="$LE_DIR/live/$CERT_NAME"
FULLCHAIN="$CERT_DIR/fullchain.pem"

mkdir -p "$PWD/certbot-www" "$CERT_DIR"

cert_covers_domain() {
  local cert_file="$1"
  local host="$2"
  openssl x509 -in "$cert_file" -noout -text 2>/dev/null | grep -q "DNS:${host}"
}

cert_valid() {
  local cert_file="$1"
  [[ -f "$cert_file" ]] || return 1
  openssl x509 -in "$cert_file" -noout -checkend 86400 >/dev/null 2>&1 || return 1
  cert_covers_domain "$cert_file" "$DOMAIN" || return 1
  if [[ -n "$DOMAIN_ALIASES" ]]; then
    cert_covers_domain "$cert_file" "$DOMAIN_ALIASES" || return 1
  fi
  return 0
}

pick_existing_cert_name() {
  local candidate
  for candidate in "$CERT_NAME" "$DOMAIN" "$DOMAIN_ALIASES" "www.novel-agent.cn"; do
    if cert_valid "$LE_DIR/live/$candidate/fullchain.pem"; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

render_acme_nginx() {
  local worker_host
  worker_host="$(grep -E '^WORKER_HOST=' .env.mw 2>/dev/null | cut -d= -f2- || true)"
  : "${worker_host:?WORKER_HOST missing in .env.mw}"
  sed -e "s/\${WORKER_HOST}/${worker_host}/g" \
      -e "s/\${DOMAIN}/${DOMAIN}/g" \
      -e "s/\${DOMAIN_ALIASES}/${DOMAIN_ALIASES}/g" \
      nginx-entry-mw-acme.conf.template > nginx-entry-mw.conf
}

if existing="$(pick_existing_cert_name)"; then
  if [[ "$existing" != "$CERT_NAME" ]]; then
    echo "[ensure-cert] link live/$existing -> live/$CERT_NAME"
    mkdir -p "$CERT_DIR"
    ln -sfn "../$existing/fullchain.pem" "$CERT_DIR/fullchain.pem"
    ln -sfn "../$existing/privkey.pem" "$CERT_DIR/privkey.pem"
  fi
  echo "[ensure-cert] valid cert ($existing), skip issue"
  openssl x509 -in "$FULLCHAIN" -noout -subject -dates
  exit 0
fi

echo "[ensure-cert] issuing cert for $DOMAIN + $DOMAIN_ALIASES ..."
render_acme_nginx
$COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --no-build entry-nginx
$COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T entry-nginx nginx -t
$COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart entry-nginx
sleep 3

if [[ ! -x /root/.acme.sh/acme.sh ]]; then
  echo "[ensure-cert] install acme.sh"
  curl -fsSL https://get.acme.sh | sh -s email="$ACME_EMAIL"
fi

/root/.acme.sh/acme.sh --set-default-ca --server letsencrypt
if [[ -n "$DOMAIN_ALIASES" ]]; then
  /root/.acme.sh/acme.sh --issue -d "$DOMAIN" -d "$DOMAIN_ALIASES" \
    -w "$PWD/certbot-www" --force --server letsencrypt
else
  /root/.acme.sh/acme.sh --issue -d "$DOMAIN" \
    -w "$PWD/certbot-www" --force --server letsencrypt
fi

mkdir -p "$CERT_DIR"
/root/.acme.sh/acme.sh --install-cert -d "$DOMAIN" \
  --key-file "$CERT_DIR/privkey.pem" \
  --fullchain-file "$CERT_DIR/fullchain.pem" \
  --reloadcmd "cd '$RDIR/$DOCKER_REL' && $COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_FILE' restart entry-nginx"

if ! cert_valid "$FULLCHAIN"; then
  echo "[ensure-cert] ERROR: cert still invalid after issue"
  ls -la "$LE_DIR/live/" || true
  exit 1
fi

openssl x509 -in "$FULLCHAIN" -noout -subject -dates
echo "[ensure-cert] issued -> live/$CERT_NAME"
