#!/usr/bin/env bash
# 同步 compose / nginx 模板到远程（不覆盖 .env.* / letsencrypt）
# 用法: bash sync-compose.sh [mw|worker|all]
set -euo pipefail

CI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$CI_DIR/_common.sh"
ci_require_deploy_env
ci_setup_ssh

TARGET="${1:-all}"

sync_to() {
  local role="$1"
  local remote
  local rdir
  remote="$(ci_remote "$role")"
  rdir="$(ci_remote_dir "$role")"
  local dest="$rdir/$DOCKER_REL"

  echo "[sync-compose] $role → $dest"
  deploy_ssh "$remote" "mkdir -p '$dest'"

  for f in \
    docker-compose.mw.yml \
    docker-compose.worker.yml \
    Dockerfile.studio.runtime \
    nginx-frontend-worker.conf.template \
    nginx-entry-mw-ssl.conf.template \
    nginx-python-lb-worker.conf \
    nginx-cloudflare-realip.conf; do
    [[ -f "$DEPLOY_DIR/$f" ]] || continue
    deploy_scp "$DEPLOY_DIR/$f" "$remote:$dest/$f"
  done

  if [[ "$role" == "mw" ]]; then
    : "${DOMAIN:?DOMAIN 必填（渲染 MW nginx）}"
    : "${WORKER_HOST:?WORKER_HOST 必填}"
    local cert_name="${CERT_NAME:-$DOMAIN}"
    local aliases="${DOMAIN_ALIASES:-}"
    deploy_ssh "$remote" bash -s <<EOF
set -euo pipefail
cd '$dest'
sed -e 's/\${WORKER_HOST}/${WORKER_HOST}/g' \
    -e 's/\${DOMAIN}/${DOMAIN}/g' \
    -e 's/\${DOMAIN_ALIASES}/${aliases}/g' \
    -e 's/\${CERT_NAME}/${cert_name}/g' \
    nginx-entry-mw-ssl.conf.template > nginx-entry-mw.conf
EOF
  fi
}

case "$TARGET" in
  mw) sync_to mw ;;
  worker) sync_to worker ;;
  all)
    export DOMAIN="${DOMAIN:-www.novel-agent.cn}"
    export DOMAIN_ALIASES="${DOMAIN_ALIASES:-novel-agent.cn}"
    export CERT_NAME="${CERT_NAME:-www.novel-agent.cn}"
    sync_to mw
    sync_to worker
    ;;
  *) echo "用法: sync-compose.sh mw|worker|all"; exit 1 ;;
esac

echo "[sync-compose] 完成"
