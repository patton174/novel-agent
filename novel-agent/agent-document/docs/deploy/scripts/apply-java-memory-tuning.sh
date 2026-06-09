#!/usr/bin/env bash
# 双机 Java/Python 内存调优：同步 compose + .env 并 force-recreate 容器
# 用法: bash apply-java-memory-tuning.sh [worker|mw|all]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
DOCKER_DIR="$(cd "$SCRIPT_DIR/../docker" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_deploy-lib.sh"

TARGET="${1:-all}"
WK="${WORKER_SSH:-root@${WORKER_HOST:?}}"
MW="${MW_SSH:-root@${MW_HOST:?}}"
DIR="${WORKER_REMOTE_DIR:-/opt/novel-agent}"

apply_worker() {
  echo "=== Worker: 同步 compose + 内存 env ==="
  deploy_ssh "$WK" "mkdir -p '$DIR/novel-agent/agent-document/docs/deploy/docker' '$DIR/novel-agent/agent-document/docs/deploy/scripts'"
  deploy_scp "$DOCKER_DIR/docker-compose.worker.yml" "$WK:$DIR/novel-agent/agent-document/docs/deploy/docker/docker-compose.worker.yml"
  deploy_scp "$SCRIPT_DIR/worker-apply-infra.sh" "$WK:$DIR/novel-agent/agent-document/docs/deploy/scripts/worker-apply-infra.sh"
  deploy_ssh "$WK" "chmod +x '$DIR/novel-agent/agent-document/docs/deploy/scripts/worker-apply-infra.sh' && DEPLOY_DIR='$DIR' bash '$DIR/novel-agent/agent-document/docs/deploy/scripts/worker-apply-infra.sh'"

  echo "=== Worker: recreate Java 服务 ==="
  deploy_ssh "$WK" bash -s <<EOF
set -euo pipefail
cd '$DIR'
CF=novel-agent/agent-document/docs/deploy/docker/docker-compose.worker.yml
ENV=novel-agent/agent-document/docs/deploy/docker/.env.worker
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
for svc in agent-content agent-pyai; do
  echo "[mem-tune] recreate \$svc"
  \$COMPOSE -f "\$CF" --env-file "\$ENV" up -d --force-recreate --no-deps "\$svc"
done
sleep 20
for url in 8091:content 8082:pyai; do
  port=\${url%%:*}
  name=\${url##*:}
  code=\$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 3 http://127.0.0.1:\$port/actuator/health 2>/dev/null || curl -s -o /dev/null -w '%{http_code}' --connect-timeout 3 http://127.0.0.1:\$port/ 2>/dev/null || echo 000)
  echo "[mem-tune] \$name HTTP \$code"
done
free -h
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}' \$(docker ps --filter name=novel-agent-worker --format '{{.Names}}' | tr '\n' ' ')
EOF
}

apply_mw() {
  echo "=== MW: 同步 compose + recreate auth/gateway ==="
  deploy_ssh "$MW" "mkdir -p '$DIR/novel-agent/agent-document/docs/deploy/docker'"
  deploy_scp "$DOCKER_DIR/docker-compose.mw.yml" "$MW:$DIR/novel-agent/agent-document/docs/deploy/docker/docker-compose.mw.yml"
  ENV_MW="$DIR/novel-agent/agent-document/docs/deploy/docker/.env.mw"
  deploy_ssh "$MW" bash -s <<EOF
set -euo pipefail
cd '$DIR'
CF=novel-agent/agent-document/docs/deploy/docker/docker-compose.mw.yml
ENV=novel-agent/agent-document/docs/deploy/docker/.env.mw
upsert() { local f="\$1" k="\$2" v="\$3"; grep -q "^\${k}=" "\$f" && sed -i "s|^\${k}=.*|\${k}=\${v}|" "\$f" || echo "\${k}=\${v}" >> "\$f"; }
upsert "\$ENV" JAVA_OPTS_AUTH "-Xms64m -Xmx200m -XX:MaxMetaspaceSize=160m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError -Dfile.encoding=UTF-8"
upsert "\$ENV" JAVA_OPTS_GATEWAY "-Xms64m -Xmx192m -XX:MaxMetaspaceSize=96m -XX:MaxDirectMemorySize=64m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError -Dfile.encoding=UTF-8"
upsert "\$ENV" JAVA_MEM_LIMIT_AUTH "448m"
upsert "\$ENV" JAVA_MEM_LIMIT_GATEWAY "352m"
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
restore_hot_jar() {
  local svc="\$1" prefix="\$2"
  local cid=\$(\$COMPOSE -f "\$CF" --env-file "\$ENV" ps -q "\$svc" 2>/dev/null || true)
  local jar=\$(ls -t /opt/novel-agent/backups/\${prefix}-*.jar 2>/dev/null | head -1 || true)
  if [[ -z "\$cid" || -z "\$jar" ]]; then
    echo "[mem-tune] skip hot jar restore for \$svc (cid=\${cid:-none} jar=\${jar:-none})"
    return 0
  fi
  echo "[mem-tune] restore \$svc from \$jar"
  docker cp "\$jar" "\$cid:/app/app.jar"
  docker restart "\$cid" >/dev/null
}
upsert "\$ENV" JAVA_OPTS_CONSUMER "-Xms48m -Xmx140m -XX:MaxMetaspaceSize=72m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError -Dfile.encoding=UTF-8"
upsert "\$ENV" JAVA_OPTS_BILLING "-Xms48m -Xmx188m -XX:MaxMetaspaceSize=128m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError -Dfile.encoding=UTF-8"
upsert "\$ENV" JAVA_MEM_LIMIT_CONSUMER "224m"
upsert "\$ENV" JAVA_MEM_LIMIT_BILLING "384m"
for svc in agent-auth agent-gateway agent-consumer agent-billing; do
  echo "[mem-tune] recreate \$svc"
  \$COMPOSE -f "\$CF" --env-file "\$ENV" up -d --force-recreate --no-deps "\$svc"
done
restore_hot_jar agent-auth agent-auth
restore_hot_jar agent-gateway agent-gateway
sleep 25
code=\$(curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:8080/api/auth/api/login -H 'Content-Type: application/json' -d '{"username":"_probe","password":"_probe"}' 2>/dev/null || echo 000)
echo "[mem-tune] gateway probe HTTP \$code"
free -h
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}' novel-agent-mw-agent-auth-1 novel-agent-mw-agent-gateway-1
EOF
}

case "$TARGET" in
  worker) apply_worker ;;
  mw) apply_mw ;;
  all) apply_worker; apply_mw ;;
  *) echo "用法: $0 [worker|mw|all]"; exit 1 ;;
esac

echo "[apply-java-memory-tuning] done"
