#!/usr/bin/env bash
# 在 Worker 本机执行：同步 .env.worker 内存/LB、爬虫 env、启动 python-lb
set -euo pipefail

DIR="${DEPLOY_DIR:-/opt/novel-agent}"
ENV_WK="$DIR/novel-agent/docs/deploy/docker/.env.worker"
CF="$DIR/novel-agent/docs/deploy/docker/docker-compose.worker.yml"
PYENV="$DIR/python-ai/.env"

upsert() {
  local f="$1" k="$2" v="$3"
  [[ -f "$f" ]] || touch "$f"
  if grep -q "^${k}=" "$f"; then
    sed -i "s|^${k}=.*|${k}=${v}|" "$f"
  else
    echo "${k}=${v}" >> "$f"
  fi
}

upsert "$ENV_WK" JAVA_OPTS_CONTENT "-Xms64m -Xmx200m -XX:MaxMetaspaceSize=96m -XX:+UseSerialGC -Dfile.encoding=UTF-8"
upsert "$ENV_WK" JAVA_OPTS_PYAI "-Xms64m -Xmx176m -XX:MaxMetaspaceSize=96m -XX:+UseSerialGC -Dfile.encoding=UTF-8"
upsert "$ENV_WK" JAVA_OPTS_CONSUMER "-Xms64m -Xmx152m -XX:MaxMetaspaceSize=80m -XX:+UseSerialGC -Dfile.encoding=UTF-8"
upsert "$ENV_WK" PYTHON_MEM_LIMIT "448m"
upsert "$ENV_WK" PYTHON_MEM_LIMIT_2 "384m"
upsert "$ENV_WK" JAVA_MEM_LIMIT_CONTENT "320m"
upsert "$ENV_WK" JAVA_MEM_LIMIT_PYAI "256m"
upsert "$ENV_WK" JAVA_MEM_LIMIT_CONSUMER "224m"
upsert "$ENV_WK" CRAWL_FETCH_CONCURRENCY "2"
upsert "$ENV_WK" CRAWL_BROWSER_CONCURRENCY "1"
upsert "$ENV_WK" AGENT_PYTHON_BASE_URL "http://python-lb:8000"

if [[ -f "$PYENV" ]]; then
  bash "$DIR/novel-agent/docs/deploy/scripts/update-worker-crawl-env.sh" "$PYENV"
fi

COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi

$COMPOSE -f "$CF" --env-file "$ENV_WK" up -d python-lb
# Java 服务在 ci-hot jar 热替换之前 recreate，以应用新 JAVA_OPTS / AGENT_PYTHON_BASE_URL
$COMPOSE -f "$CF" --env-file "$ENV_WK" up -d --force-recreate agent-content agent-consumer agent-pyai
$COMPOSE -f "$CF" --env-file "$ENV_WK" up -d --force-recreate python-ai python-ai-2

echo "[worker-apply-infra] done"
