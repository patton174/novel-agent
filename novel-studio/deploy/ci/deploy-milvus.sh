#!/usr/bin/env bash
# 在 MW 部署 Milvus standalone，并配置 Worker python-ai 连接
# 用法:
#   export MW_HOST=107.150.112.140 WORKER_HOST=47.80.80.224
#   export DEPLOY_SSH_KEY_FILE=~/.ssh/deploy_key   # 或配置 DEPLOY_SSH_OPTS
#   bash novel-studio/deploy/ci/deploy-milvus.sh
set -euo pipefail

CI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$CI_DIR/_common.sh"
ci_require_deploy_env
ci_setup_ssh

MILVUS_PORT="${MILVUS_PORT:-19530}"
MILVUS_MEM_LIMIT="${MILVUS_MEM_LIMIT:-1280m}"
MILVUS_BIND="${MILVUS_BIND:-0.0.0.0}"

echo "[deploy-milvus] MW=$MW_HOST Worker=$WORKER_HOST port=$MILVUS_PORT"

deploy_ssh "$(ci_remote mw)" "mkdir -p '$(ci_remote_dir mw)/$DOCKER_REL'"
deploy_scp "$DEPLOY_DIR/docker-compose.milvus.yml" "$(ci_remote mw):$(ci_remote_dir mw)/$DOCKER_REL/docker-compose.milvus.yml"
deploy_scp "$CI_DIR/remote-up-milvus.sh" "$(ci_remote mw):/tmp/remote-up-milvus.sh"

deploy_ssh "$(ci_remote mw)" bash -s <<'REMOTE_UP'
set -euo pipefail
sed -i 's/\r$//' /tmp/remote-up-milvus.sh
bash /tmp/remote-up-milvus.sh
REMOTE_UP

deploy_ssh "$(ci_remote mw)" bash -s <<EOF
set -euo pipefail
RDIR='$(ci_remote_dir mw)'
DOCKER_REL='$DOCKER_REL'
MILVUS_PORT='$MILVUS_PORT'
MILVUS_MEM_LIMIT='$MILVUS_MEM_LIMIT'
MILVUS_BIND='$MILVUS_BIND'
WORKER_HOST='$WORKER_HOST'

cd "\$RDIR/\$DOCKER_REL"
ENV_FILE=".env.mw"
touch "\$ENV_FILE"
upsert() {
  if grep -q "^\$1=" "\$ENV_FILE" 2>/dev/null; then
    sed -i "s|^\$1=.*|\$1=\$2|" "\$ENV_FILE"
  else
    echo "\$1=\$2" >> "\$ENV_FILE"
  fi
}
upsert MILVUS_PORT "\$MILVUS_PORT"
upsert MILVUS_MEM_LIMIT "\$MILVUS_MEM_LIMIT"
upsert MILVUS_BIND "\$MILVUS_BIND"

if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -qi active; then
  ufw allow from "\$WORKER_HOST" to any port "\$MILVUS_PORT" proto tcp comment 'milvus-worker' || true
fi
EOF

echo "[deploy-milvus] 配置 Worker python-ai → Milvus"
deploy_ssh "$(ci_remote worker)" bash -s <<EOF
set -euo pipefail
RDIR='$(ci_remote_dir worker)'
MW_HOST='$MW_HOST'
MILVUS_PORT='$MILVUS_PORT'
PYENV="\$RDIR/python-ai/.env"
touch "\$PYENV"
upsert() {
  if grep -q "^\$1=" "\$PYENV" 2>/dev/null; then
    sed -i "s|^\$1=.*|\$1=\$2|" "\$PYENV"
  else
    echo "\$1=\$2" >> "\$PYENV"
  fi
}
upsert MILVUS_HOST "\$MW_HOST"
upsert MILVUS_PORT "\$MILVUS_PORT"
upsert KG_ENABLED "true"

cd "\$RDIR/$DOCKER_REL"
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
if \$COMPOSE -f docker-compose.worker.yml ps python-ai >/dev/null 2>&1; then
  \$COMPOSE -f docker-compose.worker.yml --env-file .env.worker up -d --no-deps --force-recreate python-ai
fi
EOF

echo "[deploy-milvus] 从 Worker 探测 Milvus 端口..."
deploy_ssh "$(ci_remote worker)" bash -s <<EOF
set -euo pipefail
if command -v nc >/dev/null 2>&1; then
  nc -z -w5 '$MW_HOST' '$MILVUS_PORT' && echo "[deploy-milvus] TCP $MW_HOST:$MILVUS_PORT OK" || echo "[deploy-milvus] WARN: TCP 探测失败"
elif python3 -c "import socket; s=socket.create_connection(('$MW_HOST',$MILVUS_PORT),5); s.close()" 2>/dev/null; then
  echo "[deploy-milvus] TCP $MW_HOST:$MILVUS_PORT OK"
else
  echo "[deploy-milvus] WARN: 无法从 Worker 连接 Milvus，检查 MW 防火墙 / MILVUS_BIND"
fi
EOF

echo "[deploy-milvus] 完成。请在编辑器中对小说执行「重建向量索引」，再试 SearchKnowledge。"
