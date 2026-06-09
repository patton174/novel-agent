#!/usr/bin/env bash
# 国内节点：git pull + docker compose build python-ai-cn（不经镜像直传）
#
# 用法:
#   bash deploy-cn-from-git.sh
#   GIT_BRANCH=master bash deploy-cn-from-git.sh
#
# 前置: CN 已 init git（server-init-git.sh cn）且可 git pull
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
CN_DIR="${CN_REMOTE_DIR:-/opt/novel-agent}"
GIT_REPO_URL="${GIT_REPO_URL:-git@github.com:patton174/novel-agent.git}"
GIT_BRANCH="${GIT_BRANCH:-master}"

log() { echo "[$(date '+%H:%M:%S')] [cn-git] $*"; }

log "CN=$CN_HOST via MW — git pull + build python-ai-cn"

deploy_ssh "$MW_SSH" ssh -o BatchMode=yes -o ConnectTimeout=30 "${CN_SSH#*@}" bash -s \
  "$CN_DIR" "$GIT_REPO_URL" "$GIT_BRANCH" "$WORKER_HOST" <<'REMOTE'
set -eu
CN_DIR="$1"
REPO_URL="$2"
BRANCH="$3"
WORKER_HOST="$4"
DOCKER_DIR="$CN_DIR/novel-agent/agent-document/docs/deploy/docker"
CF="$DOCKER_DIR/docker-compose.cn.yml"
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi

progress() { echo "[$(date '+%H:%M:%S')] [cn] $*"; }

if [[ -d "$CN_DIR/.git" ]]; then
  progress "git fetch + pull ($BRANCH) ..."
  cd "$CN_DIR"
  git fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
  progress "HEAD $(git rev-parse --short HEAD)"
else
  progress "git clone $REPO_URL → $CN_DIR ..."
  rm -rf "$CN_DIR"
  git clone -b "$BRANCH" "$REPO_URL" "$CN_DIR"
  progress "HEAD $(git -C "$CN_DIR" rev-parse --short HEAD)"
fi

mkdir -p "$CN_DIR/python-ai"
if [[ ! -f "$CN_DIR/python-ai/.env" ]]; then
  progress "拉取 python-ai/.env from Worker ..."
  scp -o BatchMode=yes "root@${WORKER_HOST}:/opt/novel-agent/python-ai/.env" "$CN_DIR/python-ai/.env"
fi

[[ -f "$CF" ]] || { echo "ERROR: missing $CF"; exit 1; }

progress "[1/2] docker compose build python-ai-cn（BUILDKIT 实时日志）..."
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
