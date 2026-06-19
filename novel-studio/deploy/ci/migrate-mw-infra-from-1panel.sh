#!/usr/bin/env bash
# 从本机触发 MW 1Panel → docker-compose.infra 迁移
set -euo pipefail

CI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$CI_DIR/_common.sh"

YES=false
SKIP_UNINSTALL=false
LOCAL=false
for arg in "$@"; do
  case "$arg" in
    --yes-migrate) YES=true ;;
    --skip-uninstall) SKIP_UNINSTALL=true ;;
    --local) LOCAL=true ;;
  esac
done

if [[ "$YES" != true ]]; then
  echo "用法: bash $0 --yes-migrate [--skip-uninstall]"
  echo "  --skip-uninstall  迁移后保留 1Panel（先验收再手动卸载）"
  exit 1
fi

export WORKER_HOST="${WORKER_HOST:-47.80.80.224}"
UNINSTALL_1PANEL=true
[[ "$SKIP_UNINSTALL" == true ]] && UNINSTALL_1PANEL=false

if [[ "$LOCAL" == true ]]; then
  export UNINSTALL_1PANEL
  exec bash "$CI_DIR/migrate-mw-infra-remote.sh"
fi

ci_require_deploy_env
ci_setup_ssh
bash "$CI_DIR/sync-compose.sh" mw

REMOTE="$CI_DIR/migrate-mw-infra-remote.sh"
MW="$(ci_remote mw)"
RDIR="$(ci_remote_dir mw)/novel-studio/deploy/ci"

deploy_ssh "$MW" "mkdir -p '$RDIR'"
deploy_scp "$REMOTE" "$MW:$RDIR/migrate-mw-infra-remote.sh"
deploy_ssh "$MW" "chmod +x '$RDIR/migrate-mw-infra-remote.sh' && WORKER_HOST='$WORKER_HOST' UNINSTALL_1PANEL='$UNINSTALL_1PANEL' bash '$RDIR/migrate-mw-infra-remote.sh'"

echo "[migrate] 完成。请在 Worker 重启应用栈:"
echo "  ssh root@$WORKER_HOST 'cd /opt/novel-agent/novel-studio/deploy/docker && docker compose -f docker-compose.worker.yml --env-file .env.worker up -d --force-recreate novel-studio python-ai'"
