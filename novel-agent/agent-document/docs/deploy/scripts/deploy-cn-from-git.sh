#!/usr/bin/env bash
# 国内节点部署 python-ai-cn：
#   MW git pull（经 Worker Mihomo 10.66.0.3:7890 加速）→ rsync 到 CN → docker build
# git pull 失败时回退：本机 rsync 到 MW（需本地已 push GitHub）
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
PROXY_ENV="$SCRIPT_DIR/mesh-proxy-env.sh"

log() { echo "[$(date '+%H:%M:%S')] [cn-git] $*"; }

[[ -f "$PROXY_ENV" ]] || { echo "ERROR: missing $PROXY_ENV" >&2; exit 1; }

log "上传 mesh-proxy-env.sh → MW / CN"
deploy_scp "$PROXY_ENV" "$MW_SSH:/tmp/mesh-proxy-env.sh"
deploy_ssh "$MW_SSH" "sed -i 's/\\r\$//' /tmp/mesh-proxy-env.sh; scp -o BatchMode=yes /tmp/mesh-proxy-env.sh root@${CN_HOST}:/tmp/mesh-proxy-env.sh; ssh -o BatchMode=yes root@${CN_HOST} \"sed -i 's/\\r\$//' /tmp/mesh-proxy-env.sh\""

log "Step A: MW 同步代码（Worker Clash 代理加速 GitHub）..."
_mw_git_ok=0
if deploy_ssh "$MW_SSH" bash -s <<REMOTE; then
set -eu
command -v ncat >/dev/null || dnf install -y -q nmap-ncat 2>/dev/null || true
sed -i '/^Host github.com/,/^Host /{ /^Host github.com/d; /^  /d; }' ~/.ssh/config 2>/dev/null || true
source /tmp/mesh-proxy-env.sh
apply_mesh_proxy
probe_mesh_proxy MW || true
DIR="$MW_DIR"
BRANCH="$GIT_BRANCH"
REPO="$GIT_REPO_URL"
git config --global --add safe.directory "\$DIR" 2>/dev/null || true
[[ -d "\$DIR/.git" ]] || { echo "ERROR: \$DIR 不是 git 仓库"; exit 1; }
cd "\$DIR"
git remote get-url origin >/dev/null 2>&1 || git remote add origin "\$REPO"
git fetch origin "\$BRANCH"
git checkout "\$BRANCH" 2>/dev/null || git checkout -b "\$BRANCH" "origin/\$BRANCH"
git pull --ff-only origin "\$BRANCH"
echo "MW HEAD \$(git rev-parse --short HEAD)"
REMOTE
  _mw_git_ok=1
fi

if [[ "$_mw_git_ok" -ne 1 ]]; then
  log "git pull 失败 → 回退本机 rsync 到 MW（请将 MW deploy key 加入 GitHub 后下次可直连 pull）"
  deploy_ssh "$MW_SSH" "cat ~/.ssh/id_ed25519.pub 2>/dev/null || echo '(无 MW 公钥)'"
  REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
  deploy_rsync_to "$REPO_ROOT" "$MW_SSH" "$MW_DIR"
  log "本机 rsync 完成"
fi

log "Step B: MW → CN rsync（WireGuard 内网）..."
deploy_ssh "$MW_SSH" bash -s <<REMOTE
set -eu
CN="root@${CN_HOST}"
rsync -av --info=progress2 --delete \
  --exclude '.git' \
  --exclude 'python-ai/.env' \
  --exclude '**/node_modules' \
  --exclude '**/target' \
  -e "ssh -o BatchMode=yes" \
  "$MW_DIR/" "\${CN}:$CN_DIR/"
echo "rsync OK"
REMOTE

log "Step C: CN docker build + up（Worker 代理 + 镜像加速）..."
deploy_ssh "$MW_SSH" ssh -o BatchMode=yes "${CN_SSH#*@}" bash -s \
  "$CN_DIR" "$WORKER_HOST" <<'REMOTE'
set -eu
CN_DIR="$1"
WORKER_HOST="$2"
command -v ncat >/dev/null || apt-get update -qq && apt-get install -y -qq nmap-ncat 2>/dev/null || true
source /tmp/mesh-proxy-env.sh
apply_mesh_proxy
probe_mesh_proxy CN || echo "WARN: CN 代理不可用，使用 Docker 镜像加速"

DOCKER_DIR="$CN_DIR/novel-agent/agent-document/docs/deploy/docker"
CF="$DOCKER_DIR/docker-compose.cn.yml"
COMPOSE="docker compose"
command -v docker compose >/dev/null || COMPOSE="docker-compose"

progress() { echo "[$(date '+%H:%M:%S')] [cn] $*"; }
mkdir -p "$CN_DIR/python-ai"
if [[ ! -f "$CN_DIR/python-ai/.env" ]]; then
  scp -o BatchMode=yes "root@${WORKER_HOST}:/opt/novel-agent/python-ai/.env" "$CN_DIR/python-ai/.env"
fi
[[ -f "$CF" ]] || { echo "ERROR: missing $CF"; exit 1; }

progress "[1/2] docker compose build python-ai-cn ..."
export DOCKER_BUILDKIT=1 BUILDKIT_PROGRESS=plain
cd "$CN_DIR"
$COMPOSE -f "$CF" build --progress=plain python-ai-cn 2>&1 | while IFS= read -r line; do
  echo "[$(date '+%H:%M:%S')] [cn-build] $line"
done

progress "[2/2] docker compose up ..."
$COMPOSE -f "$CF" up -d python-ai-cn
sleep 8
curl -sf http://10.66.0.1:8000/api/health && progress "CN_HEALTH_OK" || { progress "CN_HEALTH_FAIL"; exit 1; }
REMOTE

log "完成"
