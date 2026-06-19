#!/usr/bin/env bash
# CN 本机构建 python-ai-cn：国内 apt/pip + 本机 Clash 加速 Chromium（不走 Worker）
# 前置: bash setup-mihomo-cn.sh && bash /opt/clash/import-sub.sh '<订阅>'
# 在 CN 上: bash deploy-cn-build-local.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "${SCRIPT_DIR}/_cn-mirrors.sh"

CN_DIR="${CN_DIR:-/opt/novel-agent}"
COMPOSE="${CN_DIR}/legacy/novel-agent/agent-document/docs/deploy/docker/docker-compose.cn.yml"
LOG="/tmp/cn-build.log"
LOCAL_PROXY="http://127.0.0.1:7890"

docker_build_proxy() {
  local gw
  gw="$(docker network inspect bridge -f '{{(index .IPAM.Config 0).Gateway}}' 2>/dev/null || echo '172.17.0.1')"
  echo "http://${gw}:7890"
}

log() { echo "[$(date '+%H:%M:%S')] $*"; }

BUILD_PROXY="$(docker_build_proxy)"

log "======== CN 本机构建（本机 Clash，Docker 内 ${BUILD_PROXY}）========"

if ! systemctl is-active mihomo >/dev/null 2>&1; then
  log "ERROR: 本机 mihomo 未运行。先执行: bash setup-mihomo-cn.sh"
  exit 1
fi

log "[0/4] 本机 Clash 探测 ${LOCAL_PROXY} ..."
if ! curl -fsS -x "${LOCAL_PROXY}" --max-time 15 https://api.ip.sb/ip; then
  log "ERROR: 本机代理不通。检查: systemctl status mihomo"
  log "  若未导入订阅: bash /opt/clash/import-sub.sh '<订阅URL>'"
  exit 1
fi
log "本机代理 OK"

log "[1/4] Docker 守护进程走本机 Clash（拉基础镜像）..."
mkdir -p /etc/systemd/system/docker.service.d
cat > /etc/systemd/system/docker.service.d/http-proxy.conf <<EOF
[Service]
Environment="HTTP_PROXY=${LOCAL_PROXY}"
Environment="HTTPS_PROXY=${LOCAL_PROXY}"
Environment="NO_PROXY=127.0.0.1,localhost,10.66.0.0/24,118.89.123.201"
EOF
mkdir -p /etc/docker
cn_docker_daemon_json > /etc/docker/daemon.json
systemctl daemon-reload && systemctl restart docker && sleep 2

[[ -f "${CN_DIR}/python-ai/.env" ]] || {
  log "ERROR: 缺少 ${CN_DIR}/python-ai/.env"
  exit 1
}
[[ -f "${CN_DIR}/legacy/novel-agent/agent-document/docs/deploy/docker/Dockerfile.python-ai.cn" ]] || {
  log "ERROR: 缺少 Dockerfile.python-ai.cn，请 git pull"
  exit 1
}

log "[2/4] 探测构建容器 → 宿主机 Clash (${BUILD_PROXY}) ..."
docker run --rm curlimages/curl:latest -sS -x "${BUILD_PROXY}" --max-time 15 https://api.ip.sb/ip \
  && log "构建时代理 OK" \
  || log "WARN: 构建容器访问 Clash 失败，检查 mihomo allow-lan + bind 0.0.0.0"

log "[3/4] docker compose build → ${LOG} ..."
cd "${CN_DIR}"
export DOCKER_BUILDKIT=1 BUILDKIT_PROGRESS=plain
export CN_BUILD_HTTP_PROXY="${BUILD_PROXY}" CN_BUILD_HTTPS_PROXY="${BUILD_PROXY}"
C="docker compose"; command -v docker compose >/dev/null || C="docker-compose"
$C --progress plain -f "${COMPOSE}" build --no-cache python-ai-cn 2>&1 | tee "${LOG}"

log "[4/4] 启动 ..."
$C -f "${COMPOSE}" up -d --no-build python-ai-cn
sleep 8
curl -sf http://10.66.0.1:8000/api/health && log "CN_HEALTH_OK" || { log "CN_HEALTH_FAIL"; exit 1; }
log "======== 完成 ========"
