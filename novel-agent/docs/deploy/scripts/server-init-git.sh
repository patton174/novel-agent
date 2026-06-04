# 首次在 MW / Worker 上初始化 git 仓库（只需各执行一次）
#
#   bash novel-agent/docs/deploy/scripts/server-init-git.sh \
#     git@github.com:YOUR_ORG/novel-agent.git main
#
# 需要服务器已配置 deploy key 可读该仓库。
set -euo pipefail

REPO_URL="${1:?用法: server-init-git.sh <git-url> [branch]}"
BRANCH="${2:-main}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPLIT_ENV="${DEPLOY_SPLIT_ENV:-$SCRIPT_DIR/../docker/.env.split}"
# shellcheck disable=SC1090
source "$SPLIT_ENV"

init_host() {
  local ssh_host="$1"
  local dir="$2"
  ssh "$ssh_host" bash -s <<EOF
set -euo pipefail
DIR='$dir'
REPO_URL='$REPO_URL'
BRANCH='$BRANCH'
if [[ -d "\$DIR/.git" ]]; then
  echo "[init-git] \$DIR 已是 git 仓库"
  cd "\$DIR" && git remote -v && git branch
  exit 0
fi
if [[ -d "\$DIR" ]] && [[ "\$(ls -A "\$DIR" 2>/dev/null | head -1)" ]]; then
  echo "[init-git] \$DIR 已有文件，转为 git 并拉取（保留 .env）..."
  cd "\$DIR"
  git init
  git remote add origin "\$REPO_URL"
  git fetch origin "\$BRANCH"
  git checkout -b "\$BRANCH" "origin/\$BRANCH" || git checkout "\$BRANCH"
else
  git clone -b "\$BRANCH" "\$REPO_URL" "\$DIR"
fi
echo "[init-git] OK: \$DIR @ \$(git -C "\$DIR" rev-parse --short HEAD)"
EOF
}

init_host "${MW_SSH:-root@${MW_HOST}}" "${MW_REMOTE_DIR:-/opt/novel-agent}"
init_host "${WORKER_SSH:-root@${WORKER_HOST}}" "${WORKER_REMOTE_DIR:-/opt/novel-agent}"

echo "[init-git] 完成。之后 push 到 $BRANCH 后运行 deploy-from-git.sh 或走 GitHub Actions"
