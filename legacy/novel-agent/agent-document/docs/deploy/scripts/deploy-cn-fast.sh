#!/usr/bin/env bash
# 国内 CN 极速部署 python-ai-cn：Worker 已有镜像 → 传 CN → 启动（CN 零 build）
#
# 特点：全程分步日志 + rsync/pv 实时进度，不下载 Chromium
#
# 用法（Windows Git Bash / Linux 本机）:
#   bash legacy/novel-agent/agent-document/docs/deploy/scripts/deploy-cn-fast.sh
#
# 仅 CN 机可 SSH Worker 时:
#   bash deploy-cn-fast.sh --on-cn
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPLIT_ENV="${DEPLOY_SPLIT_ENV:-$SCRIPT_DIR/../docker/.env.split}"
# shellcheck source=/dev/null
source "$SPLIT_ENV"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_deploy-lib.sh"

CN_HOST="${CN_HOST:-118.89.123.201}"
CN_SSH="${CN_SSH:-root@${CN_HOST}}"
MW_SSH="${MW_SSH:-root@${MW_HOST}}"
WORKER_HOST="${WORKER_HOST:?WORKER_HOST required}"
WORKER_WG="${WORKER_WG_IP:-10.66.0.3}"
CN_DIR="${CN_REMOTE_DIR:-/opt/novel-agent}"
IMAGE="${PYTHON_AI_IMAGE:-novel-agent/python-ai:latest}"
COMPOSE_REL="legacy/novel-agent/agent-document/docs/deploy/docker/docker-compose.cn.yml"
TAR="/tmp/python-ai-cn-transfer.tar.gz"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

remote_cn() { deploy_ssh "$MW_SSH" ssh -o BatchMode=yes -o ConnectTimeout=30 "root@${CN_HOST}" "$@"; }

ensure_rsync() {
  local who="$1"
  deploy_ssh "$who" "command -v rsync >/dev/null 2>&1 || (command -v dnf >/dev/null && dnf install -y -q rsync) || (command -v apt-get >/dev/null && apt-get update -qq && apt-get install -y -qq rsync)"
}

worker_save_to_mw() {
log "[1/5] Worker 导出镜像 → MW（约 1～3 分钟，Worker 上已 build 过则很快）..."
deploy_ssh "$MW_SSH" bash -s <<REMOTE
set -eu
IMAGE="$IMAGE"
TAR="$TAR"
WORKER_PUB="root@${WORKER_HOST}"
WORKER_WG="root@${WORKER_WG}"
ssh-keyscan -H ${WORKER_WG} ${WORKER_HOST} ${CN_HOST} >> ~/.ssh/known_hosts 2>/dev/null || true
command -v rsync >/dev/null || dnf install -y -q rsync 2>/dev/null || true
pick_worker() {
  if ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=8 "\$WORKER_WG" "docker image inspect \$IMAGE >/dev/null 2>&1"; then
    echo "\$WORKER_WG"
  elif ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "\$WORKER_PUB" "docker image inspect \$IMAGE >/dev/null 2>&1"; then
    echo "\$WORKER_PUB"
  else
    echo "ERROR: Worker 无镜像 \$IMAGE，请先在 Worker 上 build python-ai" >&2
    exit 1
  fi
}
W=\$(pick_worker)
echo "  使用 Worker: \$W"
echo "  docker save | gzip -1 → \$TAR"
ssh -o BatchMode=yes "\$W" "docker save \$IMAGE | gzip -1" > "\$TAR"
ls -lh "\$TAR"
echo "SAVE_OK bytes=\$(wc -c < "\$TAR")"
REMOTE
}

mw_rsync_to_cn() {
  log "[2/5] MW → CN rsync 传镜像（实时进度）..."
  ensure_rsync "$MW_SSH"
  remote_cn "command -v rsync >/dev/null 2>&1 || (apt-get update -qq && apt-get install -y -qq rsync)"
  deploy_ssh "$MW_SSH" bash -s <<REMOTE
set -eu
rsync -av --info=progress2 "$TAR" "root@${CN_HOST}:$TAR"
echo RSYNC_OK
REMOTE
}

cn_load_and_up() {
  log "[3/5] CN docker load（逐层进度）..."
  remote_cn bash -s <<REMOTE
set -eu
TAR="$TAR"
IMAGE="$IMAGE"
CN_DIR="$CN_DIR"
COMPOSE="$CN_DIR/$COMPOSE_REL"
echo "  gunzip | docker load ..."
gunzip -c "\$TAR" | docker load
rm -f "\$TAR"
docker images | grep -E 'python-ai|REPOSITORY' || true
REMOTE

  log "[4/5] 同步 python-ai/.env（Worker → CN）..."
  deploy_ssh "$MW_SSH" bash -s <<REMOTE
set -eu
WORKER_WG="root@${WORKER_WG}"
WORKER_PUB="root@${WORKER_HOST}"
pick_worker() {
  ssh -o BatchMode=yes -o ConnectTimeout=8 "\$WORKER_WG" "test -f /opt/novel-agent/python-ai/.env" && echo "\$WORKER_WG" && return
  ssh -o BatchMode=yes -o ConnectTimeout=15 "\$WORKER_PUB" "test -f /opt/novel-agent/python-ai/.env" && echo "\$WORKER_PUB" && return
  echo "ERROR: Worker 无 python-ai/.env" >&2; exit 1
}
W=\$(pick_worker)
ssh -o BatchMode=yes "root@${CN_HOST}" "mkdir -p ${CN_DIR}/python-ai"
scp -o BatchMode=yes "\$W:/opt/novel-agent/python-ai/.env" "root@${CN_HOST}:${CN_DIR}/python-ai/.env"
echo ENV_OK
REMOTE

  log "[5/5] CN 启动 python-ai-cn（--no-build，跳过构建）..."
  remote_cn bash -s <<REMOTE
set -eu
CN_DIR="$CN_DIR"
COMPOSE="\$CN_DIR/$COMPOSE_REL"
[[ -f "\$COMPOSE" ]] || { echo "ERROR: 缺少 \$COMPOSE，请先在 CN git clone 到 \$CN_DIR"; exit 1; }
cd "\$CN_DIR"
COMPOSE_CMD="docker compose"
command -v docker compose >/dev/null || COMPOSE_CMD="docker-compose"
\$COMPOSE_CMD -f "\$COMPOSE" up -d --no-build python-ai-cn
sleep 5
curl -sf http://10.66.0.1:8000/api/health && echo CN_HEALTH_OK || { echo CN_HEALTH_FAIL; exit 1; }
REMOTE
}

run_on_cn_direct() {
  log "模式: CN 本机直连 Worker（WireGuard 优先）"
  remote_cn bash -s <<REMOTE
set -eu
IMAGE="$IMAGE"
CN_DIR="$CN_DIR"
COMPOSE="\$CN_DIR/$COMPOSE_REL"
apt-get update -qq && apt-get install -y -qq pv rsync 2>/dev/null || true
command -v pv >/dev/null || { echo "安装 pv: apt-get install -y pv"; exit 1; }

pick_worker() {
  ssh -o BatchMode=yes -o ConnectTimeout=8 root@${WORKER_WG} "docker image inspect \$IMAGE >/dev/null" && echo root@${WORKER_WG} && return
  ssh -o BatchMode=yes -o ConnectTimeout=15 root@${WORKER_HOST} "docker image inspect \$IMAGE >/dev/null" && echo root@${WORKER_HOST} && return
  exit 1
}
W=\$(pick_worker)
echo "[1/3] 流式导入镜像 from \$W （pv 实时速率）..."
ssh -o BatchMode=yes "\$W" "docker save \$IMAGE | gzip -1" | pv -pterb | gunzip | docker load

echo "[2/3] 拷贝 .env ..."
mkdir -p "\$CN_DIR/python-ai"
scp -o BatchMode=yes "\$W:/opt/novel-agent/python-ai/.env" "\$CN_DIR/python-ai/.env"

echo "[3/3] 启动 ..."
cd "\$CN_DIR"
docker compose -f "\$COMPOSE" up -d --no-build python-ai-cn
sleep 5
curl -sf http://10.66.0.1:8000/api/health && echo CN_HEALTH_OK
REMOTE
}

main() {
  log "======== CN 极速部署（零 build）========"
  log "镜像: $IMAGE | CN: $CN_HOST | Worker: $WORKER_HOST / WG $WORKER_WG"

  if [[ "${1:-}" == "--on-cn" ]]; then
    run_on_cn_direct
  else
    worker_save_to_mw
    mw_rsync_to_cn
    cn_load_and_up
  fi

  log "======== 完成 ========"
}

main "$@"
