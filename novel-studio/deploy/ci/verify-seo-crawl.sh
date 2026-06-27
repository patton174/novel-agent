#!/usr/bin/env bash
# 部署后 SEO 爬虫可达性检查 + 可选 ping 百度/Bing
set -euo pipefail

CI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$CI_DIR/../../.." && pwd)"
FRONTEND="$REPO_ROOT/frontend"

export SEO_SITE_ORIGIN="${SEO_SITE_ORIGIN:-https://www.novel-agent.cn}"

echo "[verify-seo] crawl check → $SEO_SITE_ORIGIN"
node "$FRONTEND/scripts/verify-seo-crawl.mjs"

if [[ "${SKIP_SEO_PING:-}" == "1" ]]; then
  echo "[verify-seo] SKIP_SEO_PING=1, skip ping"
  exit 0
fi

if [[ -n "${BAIDU_SITE_TOKEN:-}" ]] || [[ -n "${BING_WEBMASTER_API_KEY:-}" ]] || [[ -n "${INDEXNOW_KEY:-}" ]]; then
  echo "[verify-seo] ping search engines"
  node "$FRONTEND/scripts/ping-search-engines.mjs"
else
  echo "[verify-seo] no BAIDU_SITE_TOKEN / BING_WEBMASTER_API_KEY / INDEXNOW_KEY — ping skipped"
fi

echo "[verify-seo] done"
