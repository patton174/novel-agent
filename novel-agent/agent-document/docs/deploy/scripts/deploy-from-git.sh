#!/usr/bin/env bash
# 在 MW / Worker 上执行：git pull 后按变更热部署（配合 CI 或手动 ssh 调用）
#
# 本机触发（两台都更新）：
#   bash novel-agent/agent-document/docs/deploy/scripts/deploy-from-git.sh
#
# 仅更新指定服务：
#   bash novel-agent/agent-document/docs/deploy/scripts/deploy-from-git.sh gateway mw
#   bash novel-agent/agent-document/docs/deploy/scripts/deploy-from-git.sh frontend worker
#
# 环境变量：
#   GIT_REPO_URL   默认从当前 remote origin 读取
#   GIT_BRANCH     默认 main
#   GIT_REF        指定 commit/tag，设置后跳过 pull
#   AUTO_DETECT=1  根据 git diff 自动选择要部署的服务（默认 1）
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPLIT_ENV="${DEPLOY_SPLIT_ENV:-$SCRIPT_DIR/../docker/.env.split}"

# shellcheck disable=SC1090
source "$SPLIT_ENV"

GIT_BRANCH="${GIT_BRANCH:-master}"
SERVICE="${1:-}"
TARGET="${2:-}"
PROXY_ENV="$SCRIPT_DIR/mesh-proxy-env.sh"

if [[ -f "$PROXY_ENV" ]]; then
  deploy_scp "$PROXY_ENV" "${MW_SSH:-root@${MW_HOST}}:/tmp/mesh-proxy-env.sh" 2>/dev/null || true
  deploy_scp "$PROXY_ENV" "${WORKER_SSH:-root@${WORKER_HOST}}:/tmp/mesh-proxy-env.sh" 2>/dev/null || true
fi

run_remote() {
  local ssh_host="$1"
  local remote_dir="$2"
  local role="$3"
  local only_svc="${4:-}"
  ssh "$ssh_host" bash -s <<EOF
set -euo pipefail
REMOTE_DIR='$remote_dir'
ROLE='$role'
ONLY_SVC='$only_svc'
GIT_BRANCH='$GIT_BRANCH'
GIT_REF='${GIT_REF:-}'
export AUTO_DETECT='${AUTO_DETECT:-1}'
export DEPLOY_SPLIT_ENV='$SPLIT_ENV'

cd "\$REMOTE_DIR"
if [[ ! -d .git ]]; then
  echo "[deploy-from-git] 错误: \$REMOTE_DIR 不是 git 仓库，请先在服务器 clone"
  exit 1
fi

if [[ -f /tmp/mesh-proxy-env.sh ]]; then
  # shellcheck source=/dev/null
  source /tmp/mesh-proxy-env.sh
  apply_mesh_proxy 2>/dev/null || true
fi

if [[ -n "\$GIT_REF" ]]; then
  git fetch --all --prune
  git checkout "\$GIT_REF"
else
  git fetch origin "\$GIT_BRANCH"
  git checkout "\$GIT_BRANCH"
  git pull --ff-only origin "\$GIT_BRANCH"
fi

bash novel-agent/agent-document/docs/deploy/scripts/_server-deploy.sh "\$ROLE" "\$ONLY_SVC"
EOF
}

if [[ -n "$SERVICE" && -n "$TARGET" ]]; then
  if [[ "$TARGET" == "mw" ]]; then
    run_remote "${MW_SSH:-root@${MW_HOST}}" "${MW_REMOTE_DIR:-/opt/novel-agent}" mw "$SERVICE"
  else
    run_remote "${WORKER_SSH:-root@${WORKER_HOST}}" "${WORKER_REMOTE_DIR:-/opt/novel-agent}" worker "$SERVICE"
  fi
  exit 0
fi

echo "[deploy-from-git] pull + 自动部署 MW + Worker ..."
run_remote "${MW_SSH:-root@${MW_HOST}}" "${MW_REMOTE_DIR:-/opt/novel-agent}" mw ""
run_remote "${WORKER_SSH:-root@${WORKER_HOST}}" "${WORKER_REMOTE_DIR:-/opt/novel-agent}" worker ""
