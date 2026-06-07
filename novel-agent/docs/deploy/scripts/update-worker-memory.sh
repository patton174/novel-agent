#!/usr/bin/env bash
# Worker 容器内存重平衡：降低 JVM 占用、抬高 python-ai limit、限制抓取并发
set -euo pipefail

WK="${WORKER_SSH:-root@47.80.80.224}"
DIR="${DEPLOY_DIR:-/opt/novel-agent}"
CF="$DIR/novel-agent/docs/deploy/docker/docker-compose.worker.yml"
ENV_WK="$DIR/novel-agent/docs/deploy/docker/.env.worker"
PYENV="$DIR/python-ai/.env"

echo "=== Worker: 应用内存配置并重建容器 ==="
ssh "$WK" bash -s <<EOF
set -euo pipefail
cd "$DIR"
COMPOSE="docker compose"

if [[ ! -f "$ENV_WK" ]]; then
  echo "missing $ENV_WK — 请先 git pull 或运行 setup-split-config.sh"
  exit 1
fi

# python-ai/.env 抓取并发（与 compose 环境变量双保险）
if [[ -f "$PYENV" ]]; then
  for kv in \
    "CRAWL_FETCH_CONCURRENCY=2" \
    "CRAWL_BROWSER_CONCURRENCY=1"; do
    k="\${kv%%=*}"
    v="\${kv#*=}"
    if grep -q "^\${k}=" "$PYENV"; then
      sed -i "s|^\${k}=.*|\${k}=\${v}|" "$PYENV"
    else
      echo "\${k}=\${v}" >> "$PYENV"
    fi
  done
fi

\$COMPOSE -f "$CF" --env-file "$ENV_WK" up -d --force-recreate \
  python-ai python-ai-2 python-lb \
  agent-content agent-consumer agent-pyai frontend

sleep 12
echo "--- docker stats ---"
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}' \\
  \$(docker ps --filter name=novel-agent-worker --format '{{.Names}}' | tr '\n' ' ')
echo "--- limits ---"
docker inspect \\
  novel-agent-worker-python-ai-1 \\
  novel-agent-worker-python-ai-2-1 \\
  novel-agent-worker-agent-content-1 \\
  novel-agent-worker-agent-consumer-1 \\
  novel-agent-worker-agent-pyai-1 \\
  --format '{{.Name}} limit={{.HostConfig.Memory}}' 2>/dev/null || true
EOF

echo "[update-worker-memory] done"
