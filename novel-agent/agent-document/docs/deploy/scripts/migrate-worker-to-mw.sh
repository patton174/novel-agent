#!/usr/bin/env bash
# 将 agent-consumer、agent-billing 迁至 MW；Worker 仅保留单 python-ai（LLM）
# 用法: bash migrate-worker-to-mw.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/../docker" && pwd)"
SPLIT_ENV="${DEPLOY_SPLIT_ENV:-$DEPLOY_DIR/.env.split}"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_deploy-lib.sh"
# shellcheck source=/dev/null
source "$SPLIT_ENV"

MW_SSH="${MW_SSH:-root@${MW_HOST}}"
WORKER_SSH="${WORKER_SSH:-root@${WORKER_HOST}}"
MW_DIR="${MW_REMOTE_DIR:-/opt/novel-agent}"
WK_DIR="${WORKER_REMOTE_DIR:-/opt/novel-agent}"
DOCKER_MW="$MW_DIR/novel-agent/agent-document/docs/deploy/docker"
DOCKER_WK="$WK_DIR/novel-agent/agent-document/docs/deploy/docker"

echo "[migrate] consumer + billing → MW; Worker 单 python-ai + 国内爬虫"

# 1. 同步 compose / nginx
deploy_scp "$DEPLOY_DIR/docker-compose.mw.yml" "$MW_SSH:$DOCKER_MW/docker-compose.mw.yml"
deploy_scp "$DEPLOY_DIR/docker-compose.worker.yml" "$WORKER_SSH:$DOCKER_WK/docker-compose.worker.yml"
deploy_scp "$DEPLOY_DIR/nginx-python-lb.conf.template" "$MW_SSH:$DOCKER_MW/nginx-python-lb.conf.template"
deploy_scp "$DEPLOY_DIR/nginx-python-lb-worker.conf" "$WORKER_SSH:$DOCKER_WK/nginx-python-lb-worker.conf"

deploy_ssh "$MW_SSH" "export WORKER_HOST='${WORKER_HOST}'; envsubst '\${WORKER_HOST}' < $DOCKER_MW/nginx-python-lb.conf.template > $DOCKER_MW/nginx-python-lb.conf"

# 2. 更新 .env
deploy_ssh "$MW_SSH" bash -s <<REMOTE
set -eu
EF=$DOCKER_MW/.env.mw
upsert() { grep -q "^\$1=" "\$EF" && sed -i "s|^\$1=.*|\$1=\$2|" "\$EF" || echo "\$1=\$2" >> "\$EF"; }
upsert AGENT_CONTENT_BASE_URL "http://${WORKER_HOST}:8091"
upsert JAVA_MEM_LIMIT_CONSUMER "224m"
upsert JAVA_MEM_LIMIT_BILLING "384m"
grep -q '^AGENT_INTERNAL_SERVICE_KEY=' "\$EF" || echo "AGENT_INTERNAL_SERVICE_KEY=${AGENT_INTERNAL_SERVICE_KEY:-}"
REMOTE

deploy_ssh "$WORKER_SSH" bash -s <<REMOTE
set -eu
EF=$DOCKER_WK/.env.worker
upsert() { grep -q "^\$1=" "\$EF" && sed -i "s|^\$1=.*|\$1=\$2|" "\$EF" || echo "\$1=\$2" >> "\$EF"; }
upsert BILLING_BASE_URL "http://${MW_HOST}:8092"
REMOTE

# 3. 发布 Nacos（consumer/billing 注册到 MW）
export NACOS_CONFIG_DIR="$DEPLOY_DIR/nacos-split-rendered"
mkdir -p "$NACOS_CONFIG_DIR"
for f in "$DEPLOY_DIR/nacos-split"/*.yaml; do
  sed -e "s/WORKER_HOST_PLACEHOLDER/${WORKER_HOST}/g" \
      -e "s/YOUR_MW_HOST/${MW_HOST}/g" \
      -e "s|YOUR_DB_PASSWORD|${SPRING_DATASOURCE_PASSWORD}|g" \
      -e "s|YOUR_REDIS_PASSWORD|${SPRING_DATA_REDIS_PASSWORD}|g" \
      -e "s|YOUR_RMQ_PASSWORD|${SPRING_RABBITMQ_PASSWORD}|g" \
      "$f" > "$NACOS_CONFIG_DIR/$(basename "$f")"
done
export NACOS_SERVER_ADDR="${NACOS_SERVER_ADDR}"
export NACOS_USERNAME="${NACOS_USERNAME}"
export NACOS_PASSWORD="${NACOS_PASSWORD}"
export NACOS_NAMESPACE="${NACOS_NAMESPACE}"
export NACOS_AUTH_IDENTITY_KEY="${NACOS_AUTH_IDENTITY_KEY:-root}"
export NACOS_AUTH_IDENTITY_VALUE="${NACOS_AUTH_IDENTITY_VALUE}"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
python "$REPO_ROOT/novel-agent/scripts/publish_nacos_config.py"
echo "[migrate] Nacos 已更新"

# 4. 从 Worker 备份 jar 拷到 MW
deploy_ssh "$WORKER_SSH" bash -s <<'REMOTE'
set -eu
BK=/opt/novel-agent/backups
ls -t "$BK"/agent-consumer-*.jar 2>/dev/null | head -1
ls -t "$BK"/agent-billing-*.jar 2>/dev/null | head -1
REMOTE

for svc in agent-consumer agent-billing; do
  jar=$(deploy_ssh "$WORKER_SSH" "ls -t /opt/novel-agent/backups/${svc}-*.jar 2>/dev/null | head -1" || true)
  if [[ -n "$jar" ]]; then
    deploy_ssh "$WORKER_SSH" "cat '$jar'" | deploy_ssh "$MW_SSH" "cat > /opt/novel-agent/backups/$(basename "$jar")"
    echo "[migrate] 已同步 $jar → MW"
  fi
done

# 5. Worker：停掉迁走的服务 + python-ai-2
deploy_ssh "$WORKER_SSH" bash -s <<REMOTE
set -eu
cd $WK_DIR
CF=$DOCKER_WK/docker-compose.worker.yml
ENV=$DOCKER_WK/.env.worker
COMPOSE="docker compose"
\$COMPOSE -f "\$CF" --env-file "\$ENV" stop agent-consumer agent-billing python-ai-2 2>/dev/null || true
\$COMPOSE -f "\$CF" --env-file "\$ENV" rm -f agent-consumer agent-billing python-ai-2 2>/dev/null || true
\$COMPOSE -f "\$CF" --env-file "\$ENV" up -d --force-recreate python-lb agent-pyai
REMOTE

# 6. MW：启动 consumer + billing
deploy_ssh "$MW_SSH" bash -s <<REMOTE
set -eu
cd $MW_DIR
CF=$DOCKER_MW/docker-compose.mw.yml
ENV=$DOCKER_MW/.env.mw
COMPOSE="docker compose"
\$COMPOSE -f "\$CF" --env-file "\$ENV" build agent-consumer agent-billing 2>/dev/null || true
\$COMPOSE -f "\$CF" --env-file "\$ENV" up -d agent-consumer agent-billing python-lb
REMOTE

hot_jar() {
  local svc="$1" module="$2" jar="$3" port="$4"
  local bk
  bk=$(deploy_ssh "$MW_SSH" "ls -t /opt/novel-agent/backups/${module}-*.jar 2>/dev/null | head -1" || true)
  if [[ -z "$bk" ]]; then
    echo "[migrate] WARN: 无 $module 备份 jar，使用镜像内 jar"
    return 0
  fi
  deploy_ssh "$MW_SSH" bash -s <<EOS
set -eu
CID=\$(docker compose -f $DOCKER_MW/docker-compose.mw.yml --env-file $DOCKER_MW/.env.mw ps -q $svc)
docker cp "$bk" "\$CID:/app/app.jar"
docker restart "\$CID"
sleep 20
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$port/actuator/health 2>/dev/null || curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$port/ 2>/dev/null
EOS
}

echo "[migrate] 热替换 MW jar ..."
hot_jar agent-consumer agent-consumer agent-consumer-1.0.0-SNAPSHOT.jar 8090
hot_jar agent-billing agent-billing agent-billing-1.0.0-SNAPSHOT.jar 8092

echo "[migrate] 完成。请验证:"
echo "  curl http://${MW_HOST}:8092/actuator/health"
echo "  curl http://${MW_HOST}:8090/"
echo "  Worker mem: ssh $WORKER_SSH 'free -h; docker stats --no-stream'"
