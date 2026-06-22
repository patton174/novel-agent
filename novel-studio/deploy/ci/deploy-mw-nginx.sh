#!/usr/bin/env bash
# 同步 MW entry-nginx 配置、确保证书有效并 reload（独立部署，勿绑在 novel-studio 推送里）
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

echo "[deploy-mw-nginx] DOMAIN=$DOMAIN ALIASES=$DOMAIN_ALIASES CERT=$CERT_NAME"
bash "$CI_DIR/sync-compose.sh" mw
bash "$CI_DIR/ensure-mw-https-cert.sh"

deploy_ssh "$REMOTE" bash -s <<EOF
set -euo pipefail
ENV="$RDIR/$DOCKER_REL/.env.mw"
touch "\$ENV"
if grep -q '^WORKER_HOST=' "\$ENV" 2>/dev/null; then
  sed -i "s|^WORKER_HOST=.*|WORKER_HOST=$WORKER_HOST|" "\$ENV"
else
  echo "WORKER_HOST=$WORKER_HOST" >> "\$ENV"
fi
EOF

REMOTE_SSL="$CI_DIR/remote-apply-mw-ssl-nginx.sh"
deploy_scp "$REMOTE_SSL" "$REMOTE:/tmp/remote-apply-mw-ssl-nginx.sh"
deploy_ssh "$REMOTE" "chmod +x /tmp/remote-apply-mw-ssl-nginx.sh && bash /tmp/remote-apply-mw-ssl-nginx.sh '$DOMAIN' '$DOMAIN_ALIASES' '$CERT_NAME' '$RDIR' '$DOCKER_REL'"

WORKER_REMOTE="$(ci_remote worker)"
WORKER_RDIR="$(ci_remote_dir worker)"
deploy_ssh "$WORKER_REMOTE" bash -s <<EOF
set -euo pipefail
ENV_FILE="$WORKER_RDIR/$DOCKER_REL/.env.worker"
if [[ -f "\$ENV_FILE" ]]; then
  if grep -q '^AUTH_FRONTEND_BASE_URL=' "\$ENV_FILE"; then
    sed -i "s|^AUTH_FRONTEND_BASE_URL=.*|AUTH_FRONTEND_BASE_URL=https://$DOMAIN|" "\$ENV_FILE"
  else
    echo "AUTH_FRONTEND_BASE_URL=https://$DOMAIN" >> "\$ENV_FILE"
  fi
fi
EOF

echo "[deploy-mw-nginx] 完成 → https://$DOMAIN"
