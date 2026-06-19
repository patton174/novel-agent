#!/usr/bin/env bash
# Worker 机：Nacos 发布 + python-ai 重建（Java 走 CI / ci-deploy-service.sh）
set -euo pipefail

cd /opt/novel-agent
ENV_FILE='legacy/novel-agent/agent-document/docs/deploy/docker/.env.worker'

read_env() {
  local key="$1"
  grep -m1 "^${key}=" "$ENV_FILE" | cut -d= -f2- | tr -d '\r'
}

MW_HOST="$(read_env MW_HOST)"
WORKER_HOST="$(read_env WORKER_HOST)"
export NACOS_SERVER_ADDR="$(read_env NACOS_SERVER_ADDR)"
export NACOS_USERNAME="$(read_env NACOS_USERNAME)"
export NACOS_PASSWORD="$(read_env NACOS_PASSWORD)"
export NACOS_NAMESPACE="$(read_env NACOS_NAMESPACE)"
SPRING_DATASOURCE_PASSWORD="$(read_env SPRING_DATASOURCE_PASSWORD)"
SPRING_DATA_REDIS_PASSWORD="$(read_env SPRING_DATA_REDIS_PASSWORD)"
SPRING_RABBITMQ_PASSWORD="$(read_env SPRING_RABBITMQ_PASSWORD)"
export NACOS_AUTH_IDENTITY_KEY="${NACOS_AUTH_IDENTITY_KEY:-root}"
export NACOS_AUTH_IDENTITY_VALUE="${NACOS_AUTH_IDENTITY_VALUE:-nacos}"

echo "[remote] python-ai .env INTERNAL_SERVICE_KEY"
grep -v '^INTERNAL_SERVICE_KEY=' python-ai/.env > /tmp/python-env.$$ 2>/dev/null || true
echo 'INTERNAL_SERVICE_KEY=prod-internal-key-novel-agent' >> /tmp/python-env.$$
mv /tmp/python-env.$$ python-ai/.env

echo "[remote] Nacos publish"
RENDER='/opt/novel-agent/.nacos-render-phase3'
rm -rf "$RENDER" && mkdir -p "$RENDER"
for f in legacy/novel-agent/agent-document/docs/deploy/docker/nacos-split/*.yaml; do
  sed -e "s/WORKER_HOST_PLACEHOLDER/${WORKER_HOST}/g" \
      -e "s/YOUR_MW_HOST/${MW_HOST}/g" \
      -e "s|YOUR_DB_PASSWORD|${SPRING_DATASOURCE_PASSWORD}|g" \
      -e "s|YOUR_REDIS_PASSWORD|${SPRING_DATA_REDIS_PASSWORD}|g" \
      -e "s|YOUR_RMQ_PASSWORD|${SPRING_RABBITMQ_PASSWORD}|g" \
      "$f" > "$RENDER/$(basename "$f")"
done
export NACOS_CONFIG_DIR="/app/.nacos-render-phase3"
docker run --rm \
  -v /opt/novel-agent:/app \
  -w /app \
  -e NACOS_CONFIG_DIR \
  -e NACOS_SERVER_ADDR \
  -e NACOS_USERNAME \
  -e NACOS_PASSWORD \
  -e NACOS_NAMESPACE \
  -e NACOS_AUTH_IDENTITY_KEY \
  -e NACOS_AUTH_IDENTITY_VALUE \
  python:3.11-slim \
  bash -c "pip install -q httpx && python legacy/novel-agent/scripts/publish_nacos_config.py"

echo "[remote] python-ai rebuild + restart Java"
COMPOSE='docker compose'
if ! docker compose version >/dev/null 2>&1; then COMPOSE='docker-compose'; fi
CF='legacy/novel-agent/agent-document/docs/deploy/docker/docker-compose.worker.yml'
$COMPOSE -f "$CF" --env-file "$ENV_FILE" build python-ai
$COMPOSE -f "$CF" --env-file "$ENV_FILE" up -d --no-deps python-ai python-ai-2 agent-pyai agent-content agent-consumer
sleep 25
$COMPOSE -f "$CF" --env-file "$ENV_FILE" ps python-ai python-ai-2 agent-pyai agent-content agent-consumer
curl -sf "http://127.0.0.1:8000/api/health" && echo " python-ai OK"
echo "[remote] done"
