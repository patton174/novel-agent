#!/usr/bin/env bash
# 同步 MW entry-nginx 配置、确保证书有效并 reload
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

echo "[deploy-mw-nginx] DOMAIN=$DOMAIN ALIASES=$DOMAIN_ALIASES CERT=$CERT_NAME"
bash "$CI_DIR/sync-compose.sh" mw
bash "$CI_DIR/ensure-mw-https-cert.sh"

REMOTE="$(ci_remote mw)"
RDIR="$(ci_remote_dir mw)"
COMPOSE_FILE="$(ci_compose_file mw)"
ENV_FILE="$(ci_env_file mw)"

deploy_ssh "$REMOTE" bash -s <<EOF
set -euo pipefail
cd '$RDIR/$DOCKER_REL'
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi

if [[ -f .env.mw ]]; then
  for kv in "DOMAIN=$DOMAIN" "DOMAIN_ALIASES=$DOMAIN_ALIASES" "CERT_NAME=$CERT_NAME"; do
    key="\${kv%%=*}"
    val="\${kv#*=}"
    if grep -q "^\${key}=" .env.mw; then
      sed -i "s|^\${key}=.*|\${key}=\${val}|" .env.mw
    else
      echo "\${key}=\${val}" >> .env.mw
    fi
  done
fi

sed -e 's/\${WORKER_HOST}/$WORKER_HOST/g' \
    -e 's/\${DOMAIN}/$DOMAIN/g' \
    -e 's/\${DOMAIN_ALIASES}/$DOMAIN_ALIASES/g' \
    -e 's/\${CERT_NAME}/$CERT_NAME/g' \
    nginx-entry-mw-ssl.conf.template > nginx-entry-mw.conf

\$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_FILE' up -d --no-build entry-nginx
\$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_FILE' exec -T entry-nginx nginx -t
\$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_FILE' restart entry-nginx

echo "[deploy-mw-nginx] 本机探针"
curl -skI "https://127.0.0.1/" -H "Host: $DOMAIN" | head -5
curl -skI "https://127.0.0.1/" -H "Host: $DOMAIN_ALIASES" | head -5
\$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_FILE' ps entry-nginx
EOF

WORKER_REMOTE="$(ci_remote worker)"
WORKER_RDIR="$(ci_remote_dir worker)"
deploy_ssh "$WORKER_REMOTE" bash -s <<EOF
set -euo pipefail
ENV_FILE='$WORKER_RDIR/$DOCKER_REL/.env.worker'
if [[ -f "\$ENV_FILE" ]]; then
  if grep -q '^AUTH_FRONTEND_BASE_URL=' "\$ENV_FILE"; then
    sed -i 's|^AUTH_FRONTEND_BASE_URL=.*|AUTH_FRONTEND_BASE_URL=https://$DOMAIN|' "\$ENV_FILE"
  else
    echo 'AUTH_FRONTEND_BASE_URL=https://$DOMAIN' >> "\$ENV_FILE"
  fi
  echo "[deploy-mw-nginx] worker AUTH_FRONTEND_BASE_URL → https://$DOMAIN"
fi
EOF

echo "[deploy-mw-nginx] 完成 → https://$DOMAIN"
