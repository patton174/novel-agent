#!/usr/bin/env bash
# 修复 MW auth/gateway 502：注入 JWT_SECRET 并重建容器
#
#   bash novel-agent/agent-document/docs/deploy/scripts/apply-mw-jwt-env.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPLIT_ENV="${DEPLOY_SPLIT_ENV:-$SCRIPT_DIR/../docker/.env.split}"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_deploy-lib.sh"
if [[ -f "$SPLIT_ENV" ]]; then
  # shellcheck disable=SC1090
  source "$SPLIT_ENV"
fi

: "${MW_HOST:?MW_HOST 未设置}"
: "${JWT_SECRET:?JWT_SECRET 未设置（请在 .env.split 配置 ≥32 字符）}"
[[ "${#JWT_SECRET}" -ge 32 ]] || { echo "JWT_SECRET 至少 32 字符"; exit 1; }

MW_SSH="${MW_SSH:-root@${MW_HOST}}"
REMOTE_DIR="${MW_REMOTE_DIR:-/opt/novel-agent}"
ENV_REL="novel-agent/agent-document/docs/deploy/docker/.env.mw"
COMPOSE_FILE="novel-agent/agent-document/docs/deploy/docker/docker-compose.mw.yml"

echo "[jwt-env] 写入 MW .env.mw JWT_SECRET ..."
deploy_ssh "$MW_SSH" bash -s <<EOF
set -euo pipefail
cd '$REMOTE_DIR'
ENV='$ENV_REL'
touch "\$ENV"
grep -v '^JWT_SECRET=' "\$ENV" > "\$ENV.tmp" || true
mv "\$ENV.tmp" "\$ENV"
echo 'JWT_SECRET=$JWT_SECRET' >> "\$ENV"
grep '^JWT_SECRET=' "\$ENV"
EOF

echo "[jwt-env] 同步 compose + nacos 模板 ..."
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../../../.." && pwd)"
deploy_scp "$REPO_ROOT/novel-agent/agent-document/docs/deploy/docker/docker-compose.mw.yml" \
  "$MW_SSH:$REMOTE_DIR/$COMPOSE_FILE"
deploy_scp "$REPO_ROOT/novel-agent/agent-document/docs/deploy/docker/nacos-split/agent-auth.yaml" \
  "$MW_SSH:$REMOTE_DIR/novel-agent/agent-document/docs/deploy/docker/nacos-split/agent-auth.yaml"
deploy_scp "$REPO_ROOT/novel-agent/agent-document/docs/deploy/docker/nacos-split/agent-gateway.yaml" \
  "$MW_SSH:$REMOTE_DIR/novel-agent/agent-document/docs/deploy/docker/nacos-split/agent-gateway.yaml"

echo "[jwt-env] 重建 auth / gateway ..."
deploy_ssh "$MW_SSH" bash -s <<EOF
set -euo pipefail
cd '$REMOTE_DIR'
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
\$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' up -d --force-recreate agent-auth agent-gateway entry-nginx
sleep 20
\$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' ps agent-auth agent-gateway
EOF

deploy_wait_http_port "$MW_SSH" 8080 "gateway" 45
echo "[jwt-env] 完成。请重试 https://www.novel-agent.cn/api/auth/login"
