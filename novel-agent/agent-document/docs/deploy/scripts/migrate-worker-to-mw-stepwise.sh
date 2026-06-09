#!/usr/bin/env bash
# 分步迁移 consumer+billing → MW，Worker 仅保留单 python-ai
# 用法: bash migrate-worker-to-mw-stepwise.sh [1-9|all]
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
CN_SSH="${CN_SSH:-root@${CN_HOST:-118.89.123.201}}"
MW_DIR="${MW_REMOTE_DIR:-/opt/novel-agent}"
WK_DIR="${WORKER_REMOTE_DIR:-/opt/novel-agent}"
DOCKER_MW="$MW_DIR/novel-agent/agent-document/docs/deploy/docker"
DOCKER_WK="$WK_DIR/novel-agent/agent-document/docs/deploy/docker"
TOTAL=9

log() { echo "[$(date '+%H:%M:%S')] $*"; }
step() { log "======== STEP $1/$TOTAL: $2 ========"; }

run_step() {
  local n="$1" desc="$2" fn="$3"
  step "$n" "$desc"
  "$fn"
  log "STEP $n OK"
  echo ""
}

step1_sync_compose() {
  log "→ scp docker-compose.mw.yml → MW"
  deploy_scp "$DEPLOY_DIR/docker-compose.mw.yml" "$MW_SSH:$DOCKER_MW/docker-compose.mw.yml"
  log "→ scp docker-compose.worker.yml → Worker"
  deploy_scp "$DEPLOY_DIR/docker-compose.worker.yml" "$WORKER_SSH:$DOCKER_WK/docker-compose.worker.yml"
  log "→ scp nginx configs"
  deploy_scp "$DEPLOY_DIR/nginx-python-lb.conf.template" "$MW_SSH:$DOCKER_MW/nginx-python-lb.conf.template"
  deploy_scp "$DEPLOY_DIR/nginx-python-lb-worker.conf" "$WORKER_SSH:$DOCKER_WK/nginx-python-lb-worker.conf"
  deploy_ssh "$MW_SSH" "export WORKER_HOST='${WORKER_HOST}'; envsubst '\${WORKER_HOST}' < $DOCKER_MW/nginx-python-lb.conf.template > $DOCKER_MW/nginx-python-lb.conf && echo nginx-python-lb.conf rendered"
}

step2_update_env() {
  deploy_ssh "$MW_SSH" bash -s <<REMOTE
set -eu
EF=$DOCKER_MW/.env.mw
upsert() { grep -q "^\$1=" "\$EF" 2>/dev/null && sed -i "s|^\$1=.*|\$1=\$2|" "\$EF" || echo "\$1=\$2" >> "\$EF"; }
upsert AGENT_CONTENT_BASE_URL "http://${WORKER_HOST}:8091"
upsert JAVA_MEM_LIMIT_CONSUMER "224m"
upsert JAVA_MEM_LIMIT_BILLING "384m"
grep -q '^AGENT_INTERNAL_SERVICE_KEY=' "\$EF" || echo "AGENT_INTERNAL_SERVICE_KEY=${AGENT_INTERNAL_SERVICE_KEY:-}"
grep -E '^(AGENT_CONTENT|JAVA_MEM_LIMIT_CONSUMER|JAVA_MEM_LIMIT_BILLING)=' "\$EF"
REMOTE
  deploy_ssh "$WORKER_SSH" bash -s <<REMOTE
set -eu
EF=$DOCKER_WK/.env.worker
upsert() { grep -q "^\$1=" "\$EF" 2>/dev/null && sed -i "s|^\$1=.*|\$1=\$2|" "\$EF" || echo "\$1=\$2" >> "\$EF"; }
upsert BILLING_BASE_URL "http://${MW_HOST}:8092"
grep BILLING_BASE_URL "\$EF"
REMOTE
}

step3_nacos() {
  export NACOS_CONFIG_DIR="$DEPLOY_DIR/nacos-split-rendered"
  mkdir -p "$NACOS_CONFIG_DIR"
  for f in "$DEPLOY_DIR/nacos-split"/*.yaml; do
    log "→ render $(basename "$f")"
    sed -e "s/WORKER_HOST_PLACEHOLDER/${WORKER_HOST}/g" \
        -e "s/YOUR_MW_HOST/${MW_HOST}/g" \
        -e "s|YOUR_DB_PASSWORD|${SPRING_DATASOURCE_PASSWORD}|g" \
        -e "s|YOUR_REDIS_PASSWORD|${SPRING_DATA_REDIS_PASSWORD}|g" \
        -e "s|YOUR_RMQ_PASSWORD|${SPRING_RABBITMQ_PASSWORD}|g" \
        "$f" > "$NACOS_CONFIG_DIR/$(basename "$f")"
  done
  REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
  log "→ publish Nacos configs ..."
  export NACOS_SERVER_ADDR="${NACOS_SERVER_ADDR}"
  export NACOS_USERNAME="${NACOS_USERNAME}"
  export NACOS_PASSWORD="${NACOS_PASSWORD:?请在 .env.split 设置 NACOS_PASSWORD}"
  export NACOS_NAMESPACE="${NACOS_NAMESPACE:?请在 .env.split 设置 NACOS_NAMESPACE}"
  export NACOS_AUTH_IDENTITY_KEY="${NACOS_AUTH_IDENTITY_KEY:-root}"
  export NACOS_AUTH_IDENTITY_VALUE="${NACOS_AUTH_IDENTITY_VALUE:-}"
  python "$REPO_ROOT/novel-agent/scripts/publish_nacos_config.py"
}

step4_copy_jars() {
  deploy_ssh "$MW_SSH" "mkdir -p /opt/novel-agent/backups"
  deploy_ssh "$MW_SSH" bash -s <<REMOTE
set -eu
for svc in agent-consumer agent-billing; do
  src=\$(ssh -o BatchMode=yes -o ConnectTimeout=30 root@${WORKER_HOST} "ls -t /opt/novel-agent/backups/\${svc}-*.jar 2>/dev/null | head -1")
  if [[ -z "\$src" ]]; then echo "WARN: no backup for \$svc"; continue; fi
  dst="/opt/novel-agent/backups/\$(basename "\$src")"
  echo "→ MW pulling \$src from Worker (进度条) ..."
  if command -v rsync >/dev/null 2>&1; then
    rsync -av --info=progress2 -e "ssh -o BatchMode=yes -o ConnectTimeout=120" \
      "root@${WORKER_HOST}:\$src" "\$dst"
  else
    total=\$(ssh -o BatchMode=yes root@${WORKER_HOST} "stat -c%s '\$src'")
    ssh -o BatchMode=yes root@${WORKER_HOST} "cat '\$src'" > "\${dst}.part" &
    pid=\$!
    while kill -0 \$pid 2>/dev/null; do
      cur=\$(stat -c%s "\${dst}.part" 2>/dev/null || echo 0)
      pct=0; [[ "\$total" -gt 0 ]] && pct=\$(( cur * 100 / total ))
      filled=\$(( pct * 36 / 100 ))
      bar=\$(printf '%*s' "\$filled" '' | tr ' ' '#')
      pad=\$(printf '%*s' "\$((36 - filled))" '' | tr ' ' '.')
      printf "\r[%s] %s [%s%s] %3d%%" "\$(date +%H:%M:%S)" "\$svc" "\$bar" "\$pad" "\$pct"
      sleep 1
    done
    wait \$pid
    echo ""
    mv "\${dst}.part" "\$dst"
  fi
  ls -lh "\$dst"
done
REMOTE
}

step5_worker_trim() {
  deploy_ssh "$WORKER_SSH" bash -s <<REMOTE
set -eu
cd $WK_DIR
CF=$DOCKER_WK/docker-compose.worker.yml
ENV=$DOCKER_WK/.env.worker
COMPOSE="docker compose"
echo "→ stop orphan containers by name"
for c in novel-agent-worker-agent-consumer-1 novel-agent-worker-agent-billing-1 novel-agent-worker-python-ai-2-1; do
  docker stop "\$c" 2>/dev/null || true
  docker rm -f "\$c" 2>/dev/null || true
done
echo "→ recreate python-lb agent-pyai (remove orphans)"
\$COMPOSE -f "\$CF" --env-file "\$ENV" up -d --force-recreate --remove-orphans python-lb agent-pyai
echo "→ remaining containers:"
\$COMPOSE -f "\$CF" --env-file "\$ENV" ps --format 'table {{.Name}}\t{{.Status}}'
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep novel-agent-worker || true
free -h | head -2
REMOTE
}

step6_mw_start() {
  ensure_image() {
    local img="$1" label="$2"
    if deploy_ssh "$MW_SSH" "docker image inspect '$img' >/dev/null 2>&1"; then
      log "  $img 已在 MW"
      return 0
    fi
    if deploy_ssh "$WORKER_SSH" "docker image inspect '$img' >/dev/null 2>&1"; then
      log "→ 传输 $img Worker → MW（三阶段进度条）"
      deploy_docker_image_transfer "$MW_SSH" "root@${WORKER_HOST}" "local" "" "$img" "$label"
      return 0
    fi
    log "→ seed $img from auth/gateway on MW"
    deploy_ssh "$MW_SSH" bash -s <<REMOTE
set -eu
img="$img"
for donor in novel-agent/auth:latest novel-agent/gateway:latest novel-agent/content:latest; do
  if docker image inspect "\$donor" >/dev/null 2>&1; then
    docker tag "\$donor" "\$img"
    echo "  tagged \$img <= \$donor"
    exit 0
  fi
done
echo "ERROR: cannot resolve image \$img" >&2
exit 1
REMOTE
  }

  log "→ ensure consumer/billing images"
  ensure_image "novel-agent/consumer:latest" "consumer"
  ensure_image "novel-agent/billing:latest" "billing"

  deploy_ssh "$MW_SSH" bash -s <<REMOTE
set -eu
cd $MW_DIR
CF=$DOCKER_MW/docker-compose.mw.yml
ENV=$DOCKER_MW/.env.mw
COMPOSE="docker compose"
echo "→ up agent-consumer agent-billing python-lb (--no-build)"
if ! \$COMPOSE -f "\$CF" --env-file "\$ENV" up -d --no-build agent-consumer agent-billing python-lb; then
  \$COMPOSE -f "\$CF" --env-file "\$ENV" up -d agent-consumer agent-billing python-lb
fi
sleep 5
\$COMPOSE -f "\$CF" --env-file "\$ENV" ps --format 'table {{.Name}}\t{{.Status}}'
REMOTE
}

step7_hot_jars() {
  deploy_ssh "$MW_SSH" bash -s <<'REMOTE'
set -eu
CF=/opt/novel-agent/novel-agent/agent-document/docs/deploy/docker/docker-compose.mw.yml
ENV=/opt/novel-agent/novel-agent/agent-document/docs/deploy/docker/.env.mw
hot() {
  local svc="$1" port="$2" mod="$3"
  local bk cid code
  bk=$(ls -t /opt/novel-agent/backups/${mod}-*.jar 2>/dev/null | head -1 || true)
  if [[ -z "$bk" ]]; then echo "WARN: skip hot $svc (no jar)"; return 0; fi
  cid=$(docker compose -f "$CF" --env-file "$ENV" ps -q "$svc")
  echo "→ docker cp $(basename "$bk") → $svc"
  docker cp "$bk" "$cid:/app/app.jar"
  docker restart "$cid"
  echo "→ waiting $svc ..."
  for i in $(seq 1 30); do
    code=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 "http://127.0.0.1:${port}/actuator/health" 2>/dev/null || echo 000)
    if [[ "$code" == "000" ]]; then
      code=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 "http://127.0.0.1:${port}/" 2>/dev/null || echo 000)
    fi
    echo "   attempt $i: HTTP $code"
    [[ "$code" =~ ^[23] ]] && return 0
    sleep 3
  done
  echo "ERROR: $svc not ready" >&2
  docker logs "$cid" --tail 15 2>&1
  return 1
}
hot agent-consumer 8090 agent-consumer
hot agent-billing 8092 agent-billing
REMOTE
}

step8_verify() {
  log "→ MW billing health"
  deploy_ssh "$MW_SSH" "curl -sf http://127.0.0.1:8092/actuator/health && echo billing_OK || echo billing_FAIL"
  log "→ MW consumer"
  deploy_ssh "$MW_SSH" "curl -s -o /dev/null -w 'consumer HTTP %{http_code}\n' http://127.0.0.1:8090/ || true"
  log "→ Worker memory"
  deploy_ssh "$WORKER_SSH" "free -h; docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}'"
  log "→ Gateway billing route"
  deploy_ssh "$MW_SSH" "curl -s -o /dev/null -w 'gateway billing %{http_code}\n' http://127.0.0.1:8080/api/billing/auth/plans"
}

step9_cn_python_ai() {
  log "→ 国内机从 GitHub 拉取并构建 python-ai-cn（不经镜像直传）"
  GIT_BRANCH="${GIT_BRANCH:-master}" bash "$SCRIPT_DIR/deploy-cn-from-git.sh"
}

STEPS=(step1_sync_compose step2_update_env step3_nacos step4_copy_jars step5_worker_trim step6_mw_start step7_hot_jars step8_verify step9_cn_python_ai)
NAMES=("sync compose" "update env" "nacos" "copy jars" "worker trim" "mw start" "hot jars" "verify" "cn python-ai")
TARGET="${1:-all}"

if [[ "$TARGET" == "all" ]]; then
  for i in "${!STEPS[@]}"; do
    run_step "$((i+1))" "${NAMES[$i]}" "${STEPS[$i]}"
  done
  log "======== 全部完成 ========"
else
  idx=$((TARGET - 1))
  run_step "$TARGET" "${NAMES[$idx]}" "${STEPS[$idx]}"
fi
