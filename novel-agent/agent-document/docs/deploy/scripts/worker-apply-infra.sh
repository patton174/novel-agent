#!/usr/bin/env bash
# 在 Worker 本机执行：同步 .env.worker 内存/LB、爬虫 env、启动 python-lb
set -euo pipefail

DIR="${DEPLOY_DIR:-/opt/novel-agent}"
ENV_WK="$DIR/novel-agent/agent-document/docs/deploy/docker/.env.worker"
CF="$DIR/novel-agent/agent-document/docs/deploy/docker/docker-compose.worker.yml"
LEGACY_ENV="$DIR/novel-agent/docs/deploy/docker/.env.worker"
LEGACY_CF="$DIR/novel-agent/docs/deploy/docker/docker-compose.worker.yml"
if [[ ! -f "$ENV_WK" && -f "$LEGACY_ENV" ]]; then
  mkdir -p "$(dirname "$ENV_WK")"
  cp "$LEGACY_ENV" "$ENV_WK"
fi
if [[ ! -f "$CF" && -f "$LEGACY_CF" ]]; then
  mkdir -p "$(dirname "$CF")"
  cp "$LEGACY_CF" "$CF"
fi
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

# 低内存 JVM：SerialGC + 限制 Metaspace/DirectMemory，与 docker-compose.worker.yml 默认一致
upsert "$ENV_WK" JAVA_OPTS_CONTENT "-Xms64m -Xmx228m -XX:MaxMetaspaceSize=120m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError -Dfile.encoding=UTF-8"
upsert "$ENV_WK" JAVA_OPTS_PYAI "-Xms48m -Xmx160m -XX:MaxMetaspaceSize=80m -XX:MaxDirectMemorySize=48m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError -Dfile.encoding=UTF-8"
upsert "$ENV_WK" JAVA_OPTS_CONSUMER "-Xms48m -Xmx140m -XX:MaxMetaspaceSize=72m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError -Dfile.encoding=UTF-8"
upsert "$ENV_WK" JAVA_OPTS_BILLING "-Xms48m -Xmx188m -XX:MaxMetaspaceSize=128m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError -Dfile.encoding=UTF-8"
upsert "$ENV_WK" PYTHON_MEM_LIMIT "304m"
upsert "$ENV_WK" PYTHON_MEM_LIMIT_2 "256m"
upsert "$ENV_WK" JAVA_MEM_LIMIT_CONTENT "368m"
upsert "$ENV_WK" JAVA_MEM_LIMIT_PYAI "240m"
upsert "$ENV_WK" JAVA_MEM_LIMIT_CONSUMER "224m"
upsert "$ENV_WK" JAVA_MEM_LIMIT_BILLING "384m"
upsert "$ENV_WK" CRAWL_FETCH_CONCURRENCY "2"
upsert "$ENV_WK" CRAWL_BROWSER_CONCURRENCY "1"
upsert "$ENV_WK" AGENT_PYTHON_BASE_URL "http://python-lb:8000"

if [[ -f "$PYENV" ]]; then
  bash "$DIR/novel-agent/agent-document/docs/deploy/scripts/update-worker-crawl-env.sh" "$PYENV"
fi

COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi

set +e
$COMPOSE -f "$CF" --env-file "$ENV_WK" up -d --no-deps python-lb
$COMPOSE -f "$CF" --env-file "$ENV_WK" up -d --force-recreate python-ai
# python-ai-2 已移除（爬虫走国内节点）
set -e

wait_http() {
  local url="$1" label="$2" max="${3:-60}"
  local i code
  for i in $(seq 1 "$max"); do
    code=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 "$url" 2>/dev/null || echo 000)
    if [[ "$code" =~ ^[0-9]{3}$ && "$code" != "000" && "$code" != "404" ]]; then
      echo "[worker-apply-infra] $label ready (HTTP $code, attempt $i)"
      return 0
    fi
    sleep 2
  done
  echo "[worker-apply-infra] WARN: $label not ready after ${max} attempts"
  return 0
}

wait_http "http://127.0.0.1:8000/api/health" "python-ai-1" 40

echo "[worker-apply-infra] done"
