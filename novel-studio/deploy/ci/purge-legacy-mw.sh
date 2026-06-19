#!/usr/bin/env bash
# 清理 MW 上已废弃的 Nacos + 旧 Gateway（单体栈不再依赖）。
# 不影响线上流量：entry-nginx → Worker frontend → novel-studio。
#
# 用法（需 SSH 到 MW）:
#   export MW_HOST=107.150.112.140
#   bash novel-studio/deploy/ci/purge-legacy-mw.sh
#
# 或在 MW 本机:
#   bash purge-legacy-mw.sh --local
set -euo pipefail

CI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$CI_DIR/_common.sh"

LOCAL=false
if [[ "${1:-}" == "--local" ]]; then
  LOCAL=true
fi

run_mw() {
  if [[ "$LOCAL" == true ]]; then
    bash -s
  else
    ci_require_deploy_env
    ci_setup_ssh
    deploy_ssh "$(ci_remote mw)" bash -s
  fi
}

echo "[purge] === MW 遗留服务清理（Nacos + agent-gateway）==="
echo "[purge] 生产流量: entry-nginx:443 → Worker:3000 → novel-studio:8080"
echo "[purge] 以下容器不在当前 compose 中，可安全移除。"

run_mw <<'EOF'
set -euo pipefail

echo "--- before ---"
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}' 2>/dev/null | head -15 || true
free -h | head -2

# 1) 旧微服务 Gateway（novel-agent-mw 项目，已不在 novel-studio compose）
if docker ps -a --format '{{.Names}}' | grep -qx 'novel-agent-mw-agent-gateway-1'; then
  echo "[purge] stopping novel-agent-mw-agent-gateway-1 ..."
  docker stop novel-agent-mw-agent-gateway-1 2>/dev/null || true
  docker rm -f novel-agent-mw-agent-gateway-1 2>/dev/null || true
fi
OLD_MW="/opt/novel-agent/legacy/novel-agent/agent-document/docs/deploy/docker"
if [[ -f "$OLD_MW/docker-compose.mw.yml" ]]; then
  cd "$OLD_MW"
  COMPOSE="docker compose"
  if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
  if [[ -f .env.mw ]]; then
    $COMPOSE -f docker-compose.mw.yml --env-file .env.mw down --remove-orphans 2>/dev/null || true
  fi
fi
for c in novel-agent-mw-agent-auth-1 novel-agent-mw-agent-consumer-1 \
  novel-agent-mw-agent-billing-1 novel-agent-mw-python-lb-1; do
  docker rm -f "$c" 2>/dev/null || true
done

# 2) Nacos（1Panel 应用，单体栈 Worker 无 NACOS_* 配置）
NACOS_DIR="/opt/1panel/apps/nacos/nacos"
if [[ -f "$NACOS_DIR/docker-compose.yml" ]]; then
  echo "[purge] stopping 1Panel nacos ..."
  cd "$NACOS_DIR"
  COMPOSE="docker compose"
  if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
  $COMPOSE down 2>/dev/null || true
fi
docker rm -f nacos-standalone 2>/dev/null || true

# 3) 旧镜像（可选，释放磁盘）
for img in novel-agent/gateway:latest nacos/nacos-server:v3.2.2; do
  docker rmi "$img" 2>/dev/null || true
done

echo "--- after ---"
docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}' 2>/dev/null | head -12 || true
free -h | head -2
echo "[purge] done. 请在 1Panel 中停用/卸载 Nacos 应用，避免重启后再次拉起。"
EOF

echo "[purge] 完成。建议: 1Panel → 应用 → Nacos → 停止并卸载。"
