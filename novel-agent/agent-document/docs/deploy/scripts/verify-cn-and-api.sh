#!/usr/bin/env bash
# 验证 CN 爬虫分流 + 公网 API（本机或任意可 SSH Worker 的机器）
set -euo pipefail

MW_HOST="${MW_HOST:-107.150.112.140}"
WORKER_HOST="${WORKER_HOST:-47.80.80.224}"
PUBLIC="${PUBLIC_BASE:-https://www.novel-agent.cn}"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

check() {
  local label="$1" url="$2" expect="$3"
  local code
  code=$(curl -sk -o /dev/null -w '%{http_code}' --connect-timeout 10 "$url" 2>/dev/null || echo ERR)
  if [[ "$code" == "$expect" ]]; then
    log "[PASS] $label HTTP $code"
  else
    log "[FAIL] $label HTTP $code (expect $expect) $url"
    return 1
  fi
}

fail=0
log "=== CN 爬虫 ==="
ssh -o BatchMode=yes -o ConnectTimeout=15 "root@${WORKER_HOST}" \
  "curl -sf http://10.66.0.1:8000/api/health" && log "[PASS] Worker→CN WireGuard health" || { log "[FAIL] CN unreachable"; fail=1; }

code=$(ssh -o BatchMode=yes "root@${WORKER_HOST}" \
  "curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:8000/api/crawl/preview -H 'Content-Type: application/json' -d '{\"url\":\"https://example.com\"}'" 2>/dev/null || echo ERR)
if [[ "$code" == "422" || "$code" == "200" ]]; then
  log "[PASS] Worker python-lb → CN crawl route HTTP $code"
else
  log "[FAIL] crawl route HTTP $code (expect 422 or 200)"
  fail=1
fi

log "=== 公网 API ==="
check "frontend" "$PUBLIC/" 200 || fail=1
check "billing-plans" "$PUBLIC/api/billing/auth/plans" 200 || fail=1

if [[ "$fail" -eq 0 ]]; then
  log "=== 全部通过 ==="
else
  log "=== 有失败项；Gateway 未更新时在 MW 执行: bash fix-gateway-api-mw.sh ==="
  exit 1
fi
