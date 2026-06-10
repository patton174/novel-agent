#!/usr/bin/env bash
# MW 上修复 API 401/404：重建 Gateway（含 billing 白名单）+ 同步 nginx /g/ + 重注册 crypto
# 在 MW 上: bash fix-gateway-api-mw.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$SCRIPT_DIR/../docker"
CF="$DOCKER_DIR/docker-compose.mw.yml"
EF="$DOCKER_DIR/.env.mw"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

[[ -f "$EF" ]] || { echo "ERROR: 缺少 $EF"; exit 1; }

log "======== 修复 Gateway API ========"
cd "$SCRIPT_DIR/../../../../../" 2>/dev/null || cd /opt/novel-agent

log "[1/5] 检查 billing 直连（应 200）..."
curl -sf -o /dev/null -w "billing:8092 → HTTP %{http_code}\n" http://127.0.0.1:8092/api/billing/auth/plans || true

log "[2/5] 重建 agent-gateway 镜像（Docker 内 Maven，约 5~15 分钟）..."
cd "$DOCKER_DIR"
docker compose -f "$CF" --env-file "$EF" build agent-gateway

log "[3/5] 重启 gateway（保留 auth，使用 .env.mw）..."
docker compose -f "$CF" --env-file "$EF" up -d --no-deps agent-gateway
sleep 15

log "[4/5] 验证 Gateway 白名单..."
code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/api/billing/auth/plans)
if [[ "$code" == "200" ]]; then
  log "Gateway billing plans → HTTP 200 OK"
else
  log "WARN: Gateway billing plans → HTTP $code（期望 200）"
fi

log "[5/5] 同步 nginx /g/ + 重注册 crypto-runtime..."
bash "$SCRIPT_DIR/sync-nginx-g-routes.sh" || true
bash "$SCRIPT_DIR/register-frontend-crypto.sh" || log "WARN: crypto 注册失败，稍后手动执行"

log "======== CN 爬虫链路（Worker 上验证）========"
ssh -o BatchMode=yes -o ConnectTimeout=10 root@47.80.80.224 \
  "curl -sf http://10.66.0.1:8000/api/health && echo ' CN python-ai-cn OK'" 2>/dev/null || \
  log "WARN: 无法 SSH Worker 验证 CN"

log "======== 完成 ========"
log "公网验证: curl -sk https://www.novel-agent.cn/api/billing/auth/plans"
log "          应返回 code:200 的 JSON，不是 401"
