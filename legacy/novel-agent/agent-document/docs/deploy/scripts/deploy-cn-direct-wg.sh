#!/usr/bin/env bash
# Worker → CN 直连传镜像（不经 MW 中继，边传边 load）
# MW 只负责触发；数据走 WireGuard 10.66.0.3 → 10.66.0.1
#
# 在 MW 上: bash deploy-cn-direct-wg.sh
set -euo pipefail

WORKER_WG="${WORKER_WG:-10.66.0.3}"
CN_WG="${CN_WG:-10.66.0.1}"
IMAGE="${IMAGE:-novel-agent/python-ai:latest}"
CN_DIR="${CN_DIR:-/opt/novel-agent}"
COMPOSE="${CN_DIR}/legacy/novel-agent/agent-document/docs/deploy/docker/docker-compose.cn.yml"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

ensure_worker_to_cn_ssh() {
  ssh -n -o BatchMode=yes -o ConnectTimeout=8 "root@${WORKER_WG}" \
    "ssh -o BatchMode=yes -o ConnectTimeout=8 root@${CN_WG} true" 2>/dev/null && return 0

  log "配置 Worker → CN SSH（一次性）..."
  ssh -n -o BatchMode=yes "root@${WORKER_WG}" bash -s <<'EOS'
set -eu
[[ -f ~/.ssh/id_ed25519 ]] || ssh-keygen -t ed25519 -N '' -f ~/.ssh/id_ed25519
ssh-keyscan -H 10.66.0.1 >> ~/.ssh/known_hosts 2>/dev/null
cat ~/.ssh/id_ed25519.pub
EOS
  local pub
  pub="$(ssh -n -o BatchMode=yes "root@${WORKER_WG}" "cat ~/.ssh/id_ed25519.pub")"
  ssh -n -o BatchMode=yes "root@${CN_WG}" "mkdir -p ~/.ssh && chmod 700 ~/.ssh && grep -qF '${pub}' ~/.ssh/authorized_keys 2>/dev/null || echo '${pub}' >> ~/.ssh/authorized_keys"
}

log "======== Worker → CN 直连传镜像（零 MW 中继）========"
ssh-keyscan -H "${WORKER_WG}" "${CN_WG}" >> ~/.ssh/known_hosts 2>/dev/null || true
ensure_worker_to_cn_ssh

SIZE="$(ssh -n -o BatchMode=yes "root@${WORKER_WG}" "docker image inspect ${IMAGE} --format='{{.Size}}'")"
SIZE_MB=$(( SIZE / 1024 / 1024 ))
log "镜像 ~${SIZE_MB}MB | 路径: Worker(${WORKER_WG}) ──WG──> CN(${CN_WG})"
log "[1/2] 流式传输（无 gzip，SSH Compression=no，避免 CPU/双重压缩）..."

# 在 Worker 上执行：save 直连 pipe 到 CN docker load
ssh -n -o BatchMode=yes -tt "root@${WORKER_WG}" bash -s <<EOS
set -eu
IMAGE="${IMAGE}"
CN_WG="${CN_WG}"
SIZE=${SIZE}
command -v pv >/dev/null || (command -v apt-get >/dev/null && apt-get update -qq && apt-get install -y -qq pv) || true

run_pipe() {
  if command -v pv >/dev/null; then
    docker save "\$IMAGE" | pv -s "\$SIZE" -pterb | \
      ssh -n -o Compression=no -o BatchMode=yes "root@\${CN_WG}" docker load
  else
    docker save "\$IMAGE" | dd bs=4M status=progress | \
      ssh -n -o Compression=no -o BatchMode=yes "root@\${CN_WG}" docker load
  fi
}
run_pipe
echo TRANSFER_OK
EOS

log "[2/2] 同步 .env + 启动"
ssh -n -o BatchMode=yes "root@${WORKER_WG}" \
  "scp -o BatchMode=yes /opt/novel-agent/python-ai/.env root@${CN_WG}:${CN_DIR}/python-ai/.env" 2>/dev/null || \
  ssh -n -o BatchMode=yes "root@${CN_WG}" "test -f ${CN_DIR}/python-ai/.env" || {
    log "WARN: .env 请手动确认 ${CN_DIR}/python-ai/.env"
  }

ssh -n -o BatchMode=yes "root@${CN_WG}" bash -s <<EOS
set -eu
cd "${CN_DIR}"
C="docker compose"; command -v docker compose >/dev/null || C="docker-compose"
\$C -f "${COMPOSE}" up -d --no-build python-ai-cn
sleep 5
curl -sf http://10.66.0.1:8000/api/health && echo CN_HEALTH_OK
EOS

log "======== 完成 ========"
