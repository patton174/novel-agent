#!/usr/bin/env bash
# 在 Worker 上验证 Clash 代理 → 爬虫目标站
set -euo pipefail

PROXY="${1:-http://127.0.0.1:7890}"
TARGET="${2:-https://www.qishuxia.com/}"
GW=$(docker network inspect novel-agent-worker_novel-net -f '{{range .IPAM.Config}}{{.Gateway}}{{end}}' 2>/dev/null || echo "172.24.0.1")
CONTAINER_PROXY="http://${GW}:7890"

echo "=== host proxy egress ($PROXY) ==="
curl -fsS -x "$PROXY" --max-time 15 https://api.ip.sb/ip || echo "ip check failed"
echo

echo "=== host target via proxy: $TARGET ==="
code=$(curl -sS -o /tmp/crawl_probe.html -w '%{http_code}' -x "$PROXY" --max-time 20 \
  -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)' "$TARGET" || echo "000")
echo "HTTP $code, body $(wc -c < /tmp/crawl_probe.html 2>/dev/null || echo 0) bytes"

echo "=== python-ai container via $CONTAINER_PROXY ==="
docker exec novel-agent-worker-python-ai-1 python - <<PY
import httpx
proxy = "$CONTAINER_PROXY"
target = "$TARGET"
try:
    r = httpx.get("https://api.ip.sb/ip", proxy=proxy, timeout=15)
    print("container egress:", r.status_code, r.text.strip())
except Exception as e:
    print("container egress failed:", e)
try:
    r = httpx.get(target, proxy=proxy, timeout=20, headers={"User-Agent": "Mozilla/5.0"})
    print("container target:", r.status_code, "len", len(r.text))
except Exception as e:
    print("container target failed:", e)
PY
