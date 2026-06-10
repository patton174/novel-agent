#!/usr/bin/env bash
# 在 MW 上执行：Worker 镜像 → 边压缩边流式传到 CN（pv 实时进度，零 build）
#
#   ssh root@107.150.112.140
#   curl -fsSL .../deploy-cn-fast-mw.sh | bash
#   或: bash /tmp/deploy-cn-fast-mw.sh
set -euo pipefail

WORKER_WG="${WORKER_WG:-10.66.0.3}"
WORKER_PUB="${WORKER_PUB:-47.80.80.224}"
CN_HOST="${CN_HOST:-118.89.123.201}"
IMAGE="${IMAGE:-novel-agent/python-ai:latest}"
CN_DIR="${CN_DIR:-/opt/novel-agent}"
COMPOSE="${CN_DIR}/novel-agent/agent-document/docs/deploy/docker/docker-compose.cn.yml"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

pick_worker_host() {
  if ssh -n -o BatchMode=yes -o ConnectTimeout=8 "root@${WORKER_WG}" "docker image inspect ${IMAGE} >/dev/null 2>&1"; then
    echo "${WORKER_WG}"; return
  fi
  if ssh -n -o BatchMode=yes -o ConnectTimeout=20 "root@${WORKER_PUB}" "docker image inspect ${IMAGE} >/dev/null 2>&1"; then
    echo "${WORKER_PUB}"; return
  fi
  echo "ERROR: Worker 无镜像 ${IMAGE}" >&2
  exit 1
}

log "======== CN 流式部署（边压缩边传 + pv 进度）========"
if ! command -v pv >/dev/null 2>&1; then
  dnf install -y -q pv 2>/dev/null \
    || (dnf install -y -q epel-release && dnf install -y -q pv) 2>/dev/null \
    || yum install -y -q pv 2>/dev/null \
    || true
fi
PROGRESS="pv"
if ! command -v pv >/dev/null 2>&1; then
  PROGRESS="dd"
  log "WARN: 无 pv，改用 dd status=progress 显示进度"
fi
ssh-keyscan -H "${WORKER_WG}" "${WORKER_PUB}" "${CN_HOST}" >> ~/.ssh/known_hosts 2>/dev/null || true

W="$(pick_worker_host)"
log "Worker: root@${W} | CN: root@${CN_HOST} | 镜像: ${IMAGE}"

SIZE="$(ssh -n -o BatchMode=yes "root@${W}" "docker image inspect ${IMAGE} --format='{{.Size}}'")"
SIZE_MB=$(( SIZE / 1024 / 1024 ))
log "[1/3] 流式传输 ~${SIZE_MB}MB（docker save | ${PROGRESS} | gzip | CN docker load）..."
log "      实时显示: 进度 | 速率 | ETA"

if [[ "$PROGRESS" == "pv" ]]; then
  ssh -o BatchMode=yes "root@${W}" "docker save ${IMAGE}" \
    | pv -s "${SIZE}" -pterb \
    | gzip -1 \
    | ssh -o BatchMode=yes "root@${CN_HOST}" "gunzip | docker load"
else
  ssh -o BatchMode=yes "root@${W}" "docker save ${IMAGE}" \
    | dd bs=1M status=progress \
    | gzip -1 \
    | ssh -o BatchMode=yes "root@${CN_HOST}" "gunzip | docker load"
fi

log "[2/3] 同步 python-ai/.env + 启动"
ssh -n -o BatchMode=yes "root@${CN_HOST}" "mkdir -p ${CN_DIR}/python-ai"
scp -o BatchMode=yes "root@${W}:/opt/novel-agent/python-ai/.env" "root@${CN_HOST}:${CN_DIR}/python-ai/.env"

ssh -n -o BatchMode=yes "root@${CN_HOST}" bash -s <<EOS
set -eu
[[ -f "${COMPOSE}" ]] || { echo "ERROR: 缺少 ${COMPOSE}"; exit 1; }
docker images | grep python-ai || true
cd "${CN_DIR}"
C="docker compose"; command -v docker compose >/dev/null || C="docker-compose"
\$C -f "${COMPOSE}" up -d --no-build python-ai-cn
sleep 5
curl -sf http://10.66.0.1:8000/api/health && echo CN_HEALTH_OK
EOS

log "======== 完成 ========"
