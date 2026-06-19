#!/usr/bin/env bash
# 切换 Nacos 命名空间 + Spring Profile（dev / prod），渲染配置并发布到 Nacos
#
#   bash switch-nacos-env.sh prod          # 发布 prod 命名空间 + 生成本地 .env.mw/.env.worker
#   bash switch-nacos-env.sh prod --apply  # 同上，并同步 MW/Worker、重启 Java 服务
#   bash switch-nacos-env.sh dev           # 仅 dev 命名空间（本地/测试）
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/../docker" && pwd)"
SPLIT_ENV="${DEPLOY_SPLIT_ENV:-$DEPLOY_DIR/.env.split}"
APPLY_REMOTE=0

TARGET="${1:-prod}"
if [[ "$TARGET" == "--apply" ]]; then
  TARGET="prod"
  APPLY_REMOTE=1
elif [[ "${2:-}" == "--apply" ]]; then
  APPLY_REMOTE=1
fi

if [[ "$TARGET" != "dev" && "$TARGET" != "prod" ]]; then
  echo "用法: $0 {dev|prod} [--apply]"
  exit 1
fi

if [[ ! -f "$SPLIT_ENV" ]]; then
  echo "ERROR: 缺少 $SPLIT_ENV"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$SPLIT_ENV"
set +a

export DEPLOY_ENV="$TARGET"
export SPRING_PROFILES_ACTIVE="$TARGET"

if [[ "$TARGET" == "prod" ]]; then
  export NACOS_NAMESPACE="${NACOS_NAMESPACE_PROD:?请在 .env.split 设置 NACOS_NAMESPACE_PROD}"
else
  export NACOS_NAMESPACE="${NACOS_NAMESPACE_DEV:?请在 .env.split 设置 NACOS_NAMESPACE_DEV}"
fi

echo "[nacos-env] 目标环境: $TARGET"
echo "[nacos-env]   namespace=$NACOS_NAMESPACE"
echo "[nacos-env]   profile=$SPRING_PROFILES_ACTIVE"

bash "$SCRIPT_DIR/setup-split-config.sh"

if [[ "$APPLY_REMOTE" -ne 1 ]]; then
  echo ""
  echo "[nacos-env] 本地配置已更新。应用到服务器请执行:"
  echo "  bash $SCRIPT_DIR/switch-nacos-env.sh $TARGET --apply"
  exit 0
fi

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_deploy-lib.sh"

MW_SSH="${MW_SSH:-root@${MW_HOST:?}}"
WORKER_SSH="${WORKER_SSH:-root@${WORKER_HOST:?}}"
MW_DIR="${MW_REMOTE_DIR:-/opt/novel-agent}"
WORKER_DIR="${WORKER_REMOTE_DIR:-/opt/novel-agent}"
DOCKER_REL="legacy/novel-agent/agent-document/docs/deploy/docker"

echo "[nacos-env] 同步 .env.mw → MW ..."
deploy_scp "$DEPLOY_DIR/.env.mw" "$MW_SSH:$MW_DIR/$DOCKER_REL/.env.mw"
echo "[nacos-env] 同步 .env.worker → Worker ..."
deploy_scp "$DEPLOY_DIR/.env.worker" "$WORKER_SSH:$WORKER_DIR/$DOCKER_REL/.env.worker"

echo "[nacos-env] 重启 MW Java 服务 ..."
deploy_ssh "$MW_SSH" bash -s <<EOF
set -euo pipefail
cd '$MW_DIR/$DOCKER_REL'
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
\$COMPOSE -f docker-compose.mw.yml --env-file .env.mw up -d --force-recreate \\
  agent-gateway agent-auth agent-consumer agent-billing
sleep 20
\$COMPOSE -f docker-compose.mw.yml --env-file .env.mw ps
EOF

echo "[nacos-env] 重启 Worker Java 服务 ..."
deploy_ssh "$WORKER_SSH" bash -s <<EOF
set -euo pipefail
cd '$WORKER_DIR/$DOCKER_REL'
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
\$COMPOSE -f docker-compose.worker.yml --env-file .env.worker up -d --force-recreate \\
  agent-content agent-pyai
sleep 15
\$COMPOSE -f docker-compose.worker.yml --env-file .env.worker ps
EOF

echo "[nacos-env] 重注册 crypto-runtime（Worker）..."
bash "$SCRIPT_DIR/register-frontend-crypto.sh" || echo "[nacos-env] WARN: crypto 注册失败，请稍后手动执行"

echo "[nacos-env] 完成。Nacos 控制台请确认命名空间 $TARGET ($NACOS_NAMESPACE) 下各服务实例已注册。"
