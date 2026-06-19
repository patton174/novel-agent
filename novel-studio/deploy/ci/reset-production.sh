#!/usr/bin/env bash
# 破坏性重建：停掉旧微服务栈 → 清空 PostgreSQL → 启动 novel-studio 分布式栈
# 用法: bash reset-production.sh --yes-destroy-all
#
# 前提：MW / Worker 上已有 .env.mw / .env.worker（可从 *.example 复制并填密钥）
set -euo pipefail

CI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$CI_DIR/_common.sh"

if [[ "${1:-}" != "--yes-destroy-all" ]]; then
  echo "此脚本会删除线上所有微服务容器并 DROP 数据库 novel_agent。"
  echo "确认后执行: bash reset-production.sh --yes-destroy-all"
  exit 1
fi

ci_require_deploy_env
ci_setup_ssh

OLD_DOCKER_REL="legacy/novel-agent/agent-document/docs/deploy/docker"
NEW_DOCKER_REL="$DOCKER_REL"

bash "$CI_DIR/prepare-remote-env.sh"

echo "[reset] === 1/6 停止旧微服务栈 ==="
for role in mw worker; do
  remote="$(ci_remote "$role")"
  rdir="$(ci_remote_dir "$role")"
  deploy_ssh "$remote" bash -s <<EOF
set -euo pipefail
RDIR='$rdir'
OLD='$OLD_DOCKER_REL'
NEW='$NEW_DOCKER_REL'
compose_down() {
  local dir="\$1" file="\$2" env="\$3"
  [[ -f "\$dir/\$env" ]] || return 0
  [[ -f "\$dir/\$file" ]] || return 0
  cd "\$dir"
  COMPOSE="docker compose"
  if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
  \$COMPOSE -f "\$file" --env-file "\$env" down --remove-orphans 2>/dev/null || true
  return 0
}
compose_down "\$RDIR/\$OLD" docker-compose.mw.yml .env.mw
compose_down "\$RDIR/\$OLD" docker-compose.worker.yml .env.worker
compose_down "\$RDIR/\$NEW" docker-compose.mw.yml .env.mw
compose_down "\$RDIR/\$NEW" docker-compose.worker.yml .env.worker

# 强制移除遗留容器（旧镜像名 + compose 项目名）
for c in agent-gateway agent-auth agent-consumer agent-billing agent-content agent-pyai \
  novel-agent-mw-entry-nginx-1 novel-agent-mw-agent-gateway-1 novel-agent-mw-agent-auth-1 \
  novel-agent-mw-agent-consumer-1 novel-agent-mw-agent-billing-1 novel-agent-mw-python-lb-1 \
  novel-agent-worker-agent-content-1 novel-agent-worker-agent-pyai-1 \
  novel-agent-worker-python-ai-1 novel-agent-worker-python-lb-1 novel-agent-worker-frontend-1; do
  docker rm -f "\$c" 2>/dev/null || true
done
docker ps -a --format '{{.Names}}' | grep -E '^(agent-|novel-agent|novel-studio)' | while read -r c; do
  docker rm -f "\$c" 2>/dev/null || true
done || true
docker rm -f novel-studio 2>/dev/null || true

echo "[reset] 清理 Docker 磁盘..."
docker system prune -af 2>/dev/null || true
docker builder prune -af 2>/dev/null || true
for img in novel-agent/gateway novel-agent/auth novel-agent/consumer novel-agent/billing \
  novel-agent/content novel-agent/pyai; do
  docker rmi "\$img:latest" 2>/dev/null || true
done
echo "[reset] ${role} containers/images cleaned"
EOF
done

echo "[reset] === 2/6 清空 PostgreSQL ==="
WORKER_RDIR="$(ci_remote_dir worker)"
deploy_ssh "$(ci_remote worker)" bash -s <<EOF
set -euo pipefail
ENV_FILE='$WORKER_RDIR/$NEW_DOCKER_REL/.env.worker'
[[ -f "\$ENV_FILE" ]] || { echo "缺少 \$ENV_FILE"; exit 1; }
env_get() {
  local key="\$1" file="\$2"
  grep -E "^\${key}=" "\$file" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^"//;s/"\$//' || true
}
DB_HOST="\$(env_get DB_HOST "\$ENV_FILE")"
DB_PORT="\$(env_get DB_PORT "\$ENV_FILE")"
DB_NAME="\$(env_get DB_NAME "\$ENV_FILE")"
DB_USER="\$(env_get DB_USER "\$ENV_FILE")"
DB_PASSWORD="\$(env_get DB_PASSWORD "\$ENV_FILE")"
DB_PORT="\${DB_PORT:-5432}"
DB_NAME="\${DB_NAME:-novel_agent}"
run_psql() {
  local sql="\$1"
  if command -v psql >/dev/null 2>&1; then
    PGPASSWORD="\${DB_PASSWORD}" psql -h "\${DB_HOST}" -p "\${DB_PORT}" -U "\${DB_USER}" -d postgres -v ON_ERROR_STOP=1 -c "\$sql"
  else
    docker run --rm -e PGPASSWORD="\${DB_PASSWORD}" postgres:16-alpine \
      psql -h "\${DB_HOST}" -p "\${DB_PORT}" -U "\${DB_USER}" -d postgres -v ON_ERROR_STOP=1 -c "\$sql"
  fi
}
run_psql "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '\${DB_NAME}' AND pid <> pg_backend_pid();"
run_psql "DROP DATABASE IF EXISTS \${DB_NAME};"
run_psql "CREATE DATABASE \${DB_NAME};"
echo "[reset] database \${DB_NAME} recreated"
EOF

echo "[reset] === 3/6 同步 compose / nginx ==="
export DOMAIN="${DOMAIN:-novel-agent.cn}"
export DOMAIN_ALIASES="${DOMAIN_ALIASES:-www.novel-agent.cn}"
export CERT_NAME="${CERT_NAME:-novel-agent.cn}"
bash "$CI_DIR/sync-compose.sh" all

echo "[reset] === 4/6 启动 MW entry-nginx ==="
deploy_ssh "$(ci_remote mw)" bash -s <<EOF
set -euo pipefail
cd '$(ci_remote_dir mw)/$NEW_DOCKER_REL'
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
\$COMPOSE -f docker-compose.mw.yml --env-file .env.mw up -d --no-build entry-nginx
EOF

echo "[reset] === 5/6 启动 Worker 栈骨架（镜像由后续 CI 步骤上传）==="
deploy_ssh "$(ci_remote worker)" bash -s <<EOF
set -euo pipefail
cd '$(ci_remote_dir worker)/$NEW_DOCKER_REL'
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
\$COMPOSE -f docker-compose.worker.yml --env-file .env.worker up -d --no-build 2>/dev/null || true
EOF

echo "[reset] === 6/6 完成（novel-studio / python-ai / frontend 由 migrate workflow 继续部署）==="
echo "[reset] 完成。"
