#!/usr/bin/env bash
# Worker 爬虫相关 .env 增量更新（幂等，不覆盖已有 CRAWL_LLM_API_KEY）
set -euo pipefail

ENV_FILE="${1:-/opt/novel-agent/python-ai/.env}"

upsert() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

[[ -f "$ENV_FILE" ]] || { echo "missing $ENV_FILE"; exit 1; }

upsert CRAWL_MIHOMO_API "http://172.24.0.1:9090"
upsert CRAWL_MIHOMO_PROXY_GROUP "🚀 节点选择"
upsert CRAWL_MIHOMO_MAX_NODES "12"
upsert CRAWL_MIHOMO_FAIL_COOLDOWN_SEC "300"
upsert CRAWL_IMPERSONATE "chrome124"
upsert CRAWL_FETCH_CONCURRENCY "3"
upsert CRAWL_HTTP_RETRIES "2"
upsert CRAWL_HTTP_TIMEOUT "45"
upsert CRAWL_BROWSER_FETCH_ENABLED "true"
upsert CRAWL_BROWSER_CONCURRENCY "1"
upsert CRAWL_BROWSER_TIMEOUT_MS "60000"
upsert CRAWL_TLS_RETRY_DIRECT "true"
upsert CRAWL_LLM_BASE_URL "https://apihub.agnes-ai.com/v1"
upsert CRAWL_LLM_MODEL "agnes-2.0-flash"
upsert CRAWL_LLM_MAX_TOKENS "8192"
upsert CRAWL_LLM_TIMEOUT "120"
upsert CRAWL_LLM_TEMPERATURE "0.7"

if ! grep -q '^CRAWL_LLM_API_KEY=' "$ENV_FILE"; then
  echo "CRAWL_LLM_API_KEY=" >> "$ENV_FILE"
fi

echo "[update-worker-crawl-env] updated $ENV_FILE"
grep -E '^CRAWL_(MIHOMO|LLM|HTTP|IMPERSONATE|ORCHESTRATOR|BROWSER|TLS|FETCH)' "$ENV_FILE" | cut -d= -f1 | sort
