#!/usr/bin/env bash
# Run on MW: migrate 1Panel PG/Redis/RabbitMQ data to docker-compose.infra
set -euo pipefail

DOCKER_DIR="/opt/novel-agent/novel-studio/deploy/docker"
PANEL_PG="/opt/1panel/apps/postgresql/postgresql"
PANEL_REDIS="/opt/1panel/apps/redis/redis"
PANEL_MQ="/opt/1panel/apps/rabbitmq/rabbitmq"
INFRA_ROOT="$DOCKER_DIR/infra-data"
WORKER_HOST="${WORKER_HOST:-47.80.80.224}"
WORKER_ENV="/tmp/.env.worker.migrate"
UNINSTALL_1PANEL="${UNINSTALL_1PANEL:-false}"

cd "$DOCKER_DIR"
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi

env_get() {
  local key="$1" file="$2"
  grep -E "^${key}=" "$file" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^"//;s/"$//' || true
}

echo "[migrate] step 0: fetch .env.worker from Worker"
scp -o StrictHostKeyChecking=no -o BatchMode=yes \
  "root@${WORKER_HOST}:/opt/novel-agent/novel-studio/deploy/docker/.env.worker" \
  "$WORKER_ENV"

echo "[migrate] step 1: write .env.infra"
DB_USER="$(env_get DB_USER "$WORKER_ENV")"
DB_PASSWORD="$(env_get DB_PASSWORD "$WORKER_ENV")"
REDIS_PASSWORD="$(env_get REDIS_PASSWORD "$WORKER_ENV")"
RABBITMQ_USER="$(env_get RABBITMQ_USER "$WORKER_ENV")"
RABBITMQ_PASSWORD="$(env_get RABBITMQ_PASSWORD "$WORKER_ENV")"
for v in DB_PASSWORD REDIS_PASSWORD RABBITMQ_PASSWORD; do
  if [[ -z "${!v}" ]]; then
    echo "missing $v in Worker .env.worker"
    exit 1
  fi
done
DB_USER="${DB_USER:-postgres}"
RABBITMQ_USER="${RABBITMQ_USER:-guest}"

cat > .env.infra <<ENVFILE
INFRA_BIND=0.0.0.0
DB_PORT=5432
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}
RABBITMQ_PORT=5672
RABBITMQ_MGMT_PORT=15672
RABBITMQ_USER=${RABBITMQ_USER}
RABBITMQ_PASSWORD=${RABBITMQ_PASSWORD}
POSTGRES_MEM=768m
REDIS_MEM=128m
RABBITMQ_MEM=384m
ENVFILE
chmod 600 .env.infra

echo "[migrate] step 2: stop 1Panel middleware containers"
for c in 1Panel-postgresql-ow0K 1Panel-redis-8rIx 1Panel-rabbitmq-yaNR; do
  docker stop "$c" 2>/dev/null || true
  docker rm -f "$c" 2>/dev/null || true
done
for dir in "$PANEL_PG" "$PANEL_REDIS" "$PANEL_MQ"; do
  if [[ -f "$dir/docker-compose.yml" ]]; then
    (cd "$dir" && $COMPOSE down 2>/dev/null || true)
  fi
done

echo "[migrate] step 3: rsync data to infra-data/"
mkdir -p "$INFRA_ROOT/postgresql" "$INFRA_ROOT/redis/data" "$INFRA_ROOT/redis/conf" "$INFRA_ROOT/redis/logs"
mkdir -p "$INFRA_ROOT/rabbitmq/data" "$INFRA_ROOT/rabbitmq/log"
rsync -a --delete "$PANEL_PG/data/" "$INFRA_ROOT/postgresql/"
rsync -a "$PANEL_REDIS/data/" "$INFRA_ROOT/redis/data/"
rsync -a "$PANEL_REDIS/conf/redis.conf" "$INFRA_ROOT/redis/conf/redis.conf"
rsync -a "$PANEL_MQ/data/" "$INFRA_ROOT/rabbitmq/data/"
if [[ -d "$PANEL_MQ/log" ]]; then
  rsync -a "$PANEL_MQ/log/" "$INFRA_ROOT/rabbitmq/log/" || true
fi

echo "[migrate] step 4: remove nacos and legacy gateway"
docker stop nacos-standalone novel-agent-mw-agent-gateway-1 2>/dev/null || true
docker rm -f nacos-standalone novel-agent-mw-agent-gateway-1 2>/dev/null || true

echo "[migrate] step 5: start novel-studio-infra"
$COMPOSE -f docker-compose.infra.yml --env-file .env.infra up -d

echo "[migrate] step 6: health checks"
sleep 12
$COMPOSE -f docker-compose.infra.yml --env-file .env.infra ps
docker exec novel-studio-postgresql pg_isready -h 127.0.0.1 -U "$DB_USER" -q
docker exec novel-studio-redis redis-cli -a "$REDIS_PASSWORD" ping | grep -q PONG
docker exec novel-studio-rabbitmq rabbitmq-diagnostics -q ping

echo "[migrate] step 7: ensure entry-nginx up"
$COMPOSE -f docker-compose.mw.yml --env-file .env.mw up -d entry-nginx 2>/dev/null || true

if [[ "$UNINSTALL_1PANEL" == "true" ]]; then
  echo "[migrate] uninstall 1Panel"
  if command -v 1pctl >/dev/null 2>&1; then
    echo y | 1pctl uninstall || true
  fi
  systemctl stop 1panel 1panel-core 1panel-agent 2>/dev/null || true
  systemctl disable 1panel 1panel-core 1panel-agent 2>/dev/null || true
  rm -rf /opt/1panel /etc/1panel /usr/local/bin/1pctl /var/lib/1panel 2>/dev/null || true
  echo "[migrate] 1Panel removed; data kept in $INFRA_ROOT"
fi

docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
free -h | head -2
echo "[migrate] done"
