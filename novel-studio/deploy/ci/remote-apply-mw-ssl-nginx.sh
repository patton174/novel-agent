#!/usr/bin/env bash
# 在 MW 机上执行：清理旧 nginx、应用 SSL 配置、强制重建 entry-nginx
set -euo pipefail

DOMAIN="${1:?domain}"
DOMAIN_ALIASES="${2:-}"
CERT_NAME="${3:-$DOMAIN}"
RDIR="${4:?remote dir}"
DOCKER_REL="${5:-novel-studio/deploy/docker}"

cd "$RDIR/$DOCKER_REL"
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
COMPOSE_FILE="docker-compose.mw.yml"
ENV_FILE=".env.mw"

touch "$ENV_FILE"
for kv in \
  "DOMAIN=$DOMAIN" \
  "DOMAIN_ALIASES=$DOMAIN_ALIASES" \
  "CERT_NAME=$CERT_NAME" \
  "ENTRY_PORT=80" \
  "ENTRY_SSL_PORT=443"; do
  key="${kv%%=*}"
  val="${kv#*=}"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
done

WORKER_HOST="$(grep -E '^WORKER_HOST=' "$ENV_FILE" | cut -d= -f2-)"
: "${WORKER_HOST:?WORKER_HOST missing in .env.mw}"

FULLCHAIN="letsencrypt/live/${CERT_NAME}/fullchain.pem"
PRIVKEY="letsencrypt/live/${CERT_NAME}/privkey.pem"
if [[ ! -f "$FULLCHAIN" || ! -f "$PRIVKEY" ]]; then
  echo "[apply-ssl] ERROR: missing cert files"
  ls -la letsencrypt/live/ || true
  exit 1
fi

# 避免 acme 符号链接在容器内失效
CERT_DIR="letsencrypt/live/${CERT_NAME}"
mkdir -p "$CERT_DIR"
if [[ -L "$FULLCHAIN" ]]; then
  cp -fL "$FULLCHAIN" "$CERT_DIR/fullchain.pem"
  cp -fL "$PRIVKEY" "$CERT_DIR/privkey.pem"
fi

echo "[apply-ssl] stop legacy entry-nginx containers"
for cid in $(docker ps -aq --filter "name=entry-nginx" 2>/dev/null || true); do
  cname="$(docker inspect --format '{{.Name}}' "$cid" 2>/dev/null | sed 's|^/||')"
  if [[ "$cname" != novel-studio-mw-entry-nginx-* ]]; then
    echo "[apply-ssl] removing legacy $cname ($cid)"
    docker rm -f "$cid" || true
  fi
done

# 旧路径 compose 可能仍占端口
for legacy_dir in \
  "$RDIR/novel-agent/agent-document/docs/deploy/docker" \
  "$RDIR/agent-document/docs/deploy/docker"; do
  if [[ -f "$legacy_dir/docker-compose.mw.yml" ]]; then
    echo "[apply-ssl] stop legacy compose in $legacy_dir"
    (cd "$legacy_dir" && $COMPOSE -f docker-compose.mw.yml --env-file .env.mw stop entry-nginx 2>/dev/null) || true
  fi
done

sed -e "s/\${WORKER_HOST}/${WORKER_HOST}/g" \
    -e "s/\${DOMAIN}/${DOMAIN}/g" \
    -e "s/\${DOMAIN_ALIASES}/${DOMAIN_ALIASES}/g" \
    -e "s/\${CERT_NAME}/${CERT_NAME}/g" \
    nginx-entry-mw-ssl.conf.template > nginx-entry-mw.conf

echo "[apply-ssl] nginx-entry-mw.conf head:"
head -n 20 nginx-entry-mw.conf

$COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --force-recreate entry-nginx
sleep 2
$COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T entry-nginx nginx -t

echo "[apply-ssl] published ports:"
docker port "$($COMPOSE -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q entry-nginx)" || true

echo "[apply-ssl] probe HTTP (expect 301)"
curl -sI "http://127.0.0.1/" -H "Host: ${DOMAIN}" | head -5

echo "[apply-ssl] probe HTTPS (expect 200)"
curl -skI "https://127.0.0.1/" -H "Host: ${DOMAIN}" | head -8

openssl x509 -in "$FULLCHAIN" -noout -subject -issuer -dates
echo "[apply-ssl] cert chain certs: $(grep -c 'BEGIN CERTIFICATE' "$FULLCHAIN" || echo 0)"
echo "[apply-ssl] done"
