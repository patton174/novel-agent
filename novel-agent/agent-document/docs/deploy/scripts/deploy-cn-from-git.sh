#!/usr/bin/env bash
# 国内节点部署 python-ai-cn：MW git pull → rsync 到 CN → 本地 docker build
# （避免 Worker→CN 镜像直传；CN 无需单独配置 GitHub deploy key）
#
# 用法: bash deploy-cn-from-git.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPLIT_ENV="${DEPLOY_SPLIT_ENV:-$SCRIPT_DIR/../docker/.env.split}"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_deploy-lib.sh"
# shellcheck source=/dev/null
source "$SPLIT_ENV"

CN_HOST="${CN_HOST:-118.89.123.201}"
CN_SSH="${CN_SSH:-root@${CN_HOST}}"
MW_SSH="${MW_SSH:-root@${MW_HOST}}"
WORKER_HOST="${WORKER_HOST:?WORKER_HOST required}"
MW_DIR="${MW_REMOTE_DIR:-/opt/novel-agent}"
CN_DIR="${CN_REMOTE_DIR:-/opt/novel-agent}"
GIT_REPO_URL="${GIT_REPO_URL:-git@github.com:patton174/novel-agent.git}"
GIT_BRANCH="${GIT_BRANCH:-master}"

log() { echo "[$(date '+%H:%M:%S')] [cn-git] $*"; }

log "Step A: MW git pull ($GIT_BRANCH) ..."
deploy_ssh "$MW_SSH" bash -s <<REMOTE
set -eu
DIR="$MW_DIR"
BRANCH="$GIT_BRANCH"
REPO="$GIT_REPO_URL"
git config --global --add safe.directory "\$DIR" 2>/dev/null || true
if [[ ! -d "\$DIR/.git" ]]; then
  echo "ERROR: \$DIR 不是 git 仓库，请先在 MW 运行 server-init-git.sh" >&2
  exit 1
fi
cd "\$DIR"
git fetch origin "\$BRANCH"
git checkout "\$BRANCH"
git pull --ff-only origin "\$BRANCH"
echo "MW HEAD \$(git rev-parse --short HEAD)"
REMOTE

log "Step B: MW → CN rsync 代码（进度条，不经 Docker 镜像）..."
deploy_ssh "$MW_SSH" bash -s <<REMOTE
set -eu
CN="root@${CN_HOST}"
SRC="$MW_DIR/"
DST="$CN_DIR/"
mkdir -p "\$DST"
ssh -o BatchMode=yes "\$CN" "mkdir -p '$CN_DIR/python-ai'"
rsync -av --info=progress2 --delete \
  --exclude '.git' \
  --exclude 'python-ai/.env' \
  --exclude '**/node_modules' \
  --exclude '**/target' \
  -e "ssh -o BatchMode=yes" \
  "\$SRC" "\${CN}:\$DST"
echo "rsync OK"
REMOTE

log "Step C: CN docker build + up ..."
deploy_ssh "$MW_SSH" ssh -o BatchMode=yes -o ConnectTimeout=30 "${CN_SSH#*@}" bash -s \
  "$CN_DIR" "$WORKER_HOST" <<'REMOTE'
set -eu
CN_DIR="$1"
WORKER_HOST="$2"
DOCKER_DIR="$CN_DIR/novel-agent/agent-document/docs/deploy/docker"
CF="$DOCKER_DIR/docker-compose.cn.yml"
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
git config --global --add safe.directory "$CN_DIR" 2>/dev/null || true

progress() { echo "[$(date '+%H:%M:%S')] [cn] $*"; }

mkdir -p "$CN_DIR/python-ai"
if [[ ! -f "$CN_DIR/python-ai/.env" ]]; then
  progress "拉取 python-ai/.env from Worker ..."
  scp -o BatchMode=yes "root@${WORKER_HOST}:/opt/novel-agent/python-ai/.env" "$CN_DIR/python-ai/.env"
fi

[[ -f "$CF" ]] || { echo "ERROR: missing $CF"; exit 1; }

progress "[1/2] docker compose build python-ai-cn ..."
export DOCKER_BUILDKIT=1
export BUILDKIT_PROGRESS=plain
cd "$CN_DIR"
$COMPOSE -f "$CF" build --progress=plain python-ai-cn 2>&1 | while IFS= read -r line; do
  echo "[$(date '+%H:%M:%S')] [cn-build] $line"
done

progress "[2/2] docker compose up python-ai-cn ..."
$COMPOSE -f "$CF" up -d python-ai-cn
sleep 8
curl -sf http://10.66.0.1:8000/api/health && progress "CN_HEALTH_OK" || { progress "CN_HEALTH_FAIL"; exit 1; }
REMOTE

log "完成"
