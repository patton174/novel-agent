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
export ACME_EMAIL="${ACME_EMAIL:-hello@noreply.novel-agent.cn}"

REMOTE="$(ci_remote mw)"
RDIR="$(ci_remote_dir mw)"

bash "$CI_DIR/sync-compose.sh" mw

REMOTE_SCRIPT="$CI_DIR/remote-ensure-mw-https-cert.sh"
deploy_scp "$REMOTE_SCRIPT" "$REMOTE:/tmp/remote-ensure-mw-https-cert.sh"
deploy_ssh "$REMOTE" "chmod +x /tmp/remote-ensure-mw-https-cert.sh && bash /tmp/remote-ensure-mw-https-cert.sh '$DOMAIN' '$DOMAIN_ALIASES' '$CERT_NAME' '$ACME_EMAIL' '$RDIR' '$DOCKER_REL'"

echo "[ensure-cert] done"
