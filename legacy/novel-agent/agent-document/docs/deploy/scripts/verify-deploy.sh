#!/usr/bin/env bash
# 部署后冒烟验证（本地 / MW / Worker / 公网）
# 用法: bash verify-deploy.sh [public_base_url]
set -euo pipefail

PUBLIC_BASE="${1:-https://www.novel-agent.cn}"
MW_HOST="${MW_HOST:-107.150.112.140}"
WORKER_HOST="${WORKER_HOST:-47.80.80.224}"

check() {
  local label="$1"
  local url="$2"
  local expect="${3:-200}"
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 8 "$url" 2>/dev/null || echo ERR)
  if [[ "$code" == "$expect" ]]; then
    echo "[PASS] $label HTTP $code  $url"
  else
    echo "[FAIL] $label HTTP $code (expect $expect)  $url"
    return 1
  fi
}

check_any() {
  local label="$1"
  local url="$2"
  shift 2
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 8 "$url" 2>/dev/null || echo ERR)
  for ok in "$@"; do
    if [[ "$code" == "$ok" ]]; then
      echo "[PASS] $label HTTP $code  $url"
      return 0
    fi
  done
  echo "[FAIL] $label HTTP $code (expect one of: $*)  $url"
  return 1
}

failures=0
run() { check "$@" || failures=$((failures + 1)); }
run_any() { check_any "$@" || failures=$((failures + 1)); }

echo "=== 公网入口 ($PUBLIC_BASE) ==="
run "frontend-home" "$PUBLIC_BASE/" 200
run "frontend-pricing" "$PUBLIC_BASE/pricing" 200
run "billing-plans-public" "$PUBLIC_BASE/api/billing/auth/plans" 200
run "billing-settings-public" "$PUBLIC_BASE/api/billing/auth/settings/public" 200
run_any "auth-login-route" "$PUBLIC_BASE/api/auth/login" 400 405

echo ""
echo "=== MW 内网 ($MW_HOST) ==="
run_any "mw-gateway-health" "http://${MW_HOST}:8080/actuator/health" 200 404
run_any "mw-auth-health" "http://${MW_HOST}:8081/actuator/health" 200
run "mw-python-health" "http://${MW_HOST}:8000/api/health" 200

echo ""
echo "=== Worker 内网 ($WORKER_HOST) ==="
run "worker-pyai-health" "http://${WORKER_HOST}:8082/actuator/health" 200
run "mw-billing-health" "http://${MW_HOST}:8092/actuator/health" 200
run "mw-consumer-health" "http://${MW_HOST}:8090/" 200 404
run_any "worker-content-health" "http://${WORKER_HOST}:8091/actuator/health" 200 404

echo ""
if [[ "$failures" -gt 0 ]]; then
  echo "=== 结果: $failures 项失败 ==="
  exit 1
fi
echo "=== 结果: 全部通过 ==="
