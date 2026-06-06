#!/usr/bin/env bash
# 双机分拆：生成 nginx / nacos / 各机 .env，并发布 Nacos
#
#   cp novel-agent/docs/deploy/docker/.env.split.example novel-agent/docs/deploy/docker/.env.split
#   # 编辑 WORKER_HOST / WORKER_SSH
#   bash novel-agent/docs/deploy/scripts/setup-split-config.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/../docker" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
SPLIT_ENV="${DEPLOY_SPLIT_ENV:-$DEPLOY_DIR/.env.split}"

if [[ ! -f "$SPLIT_ENV" ]]; then
  cp "$DEPLOY_DIR/.env.split.example" "$SPLIT_ENV"
  echo "[split-setup] 已创建 $SPLIT_ENV — 请先填写 WORKER_HOST 与 WORKER_SSH 后再运行"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$SPLIT_ENV"
set +a

if [[ "${WORKER_HOST:-}" == "YOUR_WORKER_HOST" || "${WORKER_HOST:-}" == "CHANGE_ME_WORKER_IP" || -z "${WORKER_HOST:-}" ]]; then
  echo "[split-setup] ERROR: 请在 $SPLIT_ENV 中设置 WORKER_HOST（第二台公网 IP）"
  exit 1
fi

MW_HOST="${MW_HOST:?请在 .env.split 设置 MW_HOST}"
GATEWAY_UPSTREAM="${GATEWAY_UPSTREAM:-http://${MW_HOST}:8080}"

echo "[split-setup] MW=$MW_HOST  Worker=$WORKER_HOST"

# nginx 配置
export WORKER_HOST
envsubst '${WORKER_HOST}' < "$DEPLOY_DIR/nginx-python-lb.conf.template" > "$DEPLOY_DIR/nginx-python-lb.conf"
export GATEWAY_UPSTREAM
envsubst '${GATEWAY_UPSTREAM}' < "$DEPLOY_DIR/nginx-frontend-worker.conf.template" > "$DEPLOY_DIR/nginx-frontend-worker.conf"
envsubst '${WORKER_HOST}' < "$DEPLOY_DIR/nginx-entry-mw.conf.template" > "$DEPLOY_DIR/nginx-entry-mw.conf"
echo "[split-setup] 已生成 nginx-python-lb.conf / nginx-frontend-worker.conf / nginx-entry-mw.conf"

# 各机 .env
cat > "$DEPLOY_DIR/.env.mw" <<EOF
HOST_IP=${MW_HOST}
MW_HOST=${MW_HOST}
WORKER_HOST=${WORKER_HOST}
NACOS_SERVER_ADDR=${NACOS_SERVER_ADDR}
NACOS_USERNAME=${NACOS_USERNAME}
NACOS_PASSWORD=${NACOS_PASSWORD}
NACOS_NAMESPACE=${NACOS_NAMESPACE}
GATEWAY_PORT=${GATEWAY_PORT:-8080}
ENTRY_PORT=${ENTRY_PORT:-80}
ENTRY_SSL_PORT=${ENTRY_SSL_PORT:-443}
PUBLIC_DOMAIN=${PUBLIC_DOMAIN:-}
PYTHON_LB_PORT=${PYTHON_LB_PORT:-8000}
SPRING_PROFILES_ACTIVE=${SPRING_PROFILES_ACTIVE:-dev}
PYTHON_LOG_LEVEL=${PYTHON_LOG_LEVEL:-INFO}
JAVA_OPTS_AUTH=${JAVA_OPTS_AUTH:--Xms96m -Xmx192m -Dfile.encoding=UTF-8}
JAVA_OPTS_GATEWAY=${JAVA_OPTS_GATEWAY:--Xms96m -Xmx256m -Dfile.encoding=UTF-8}
PYTHON_MEM_LIMIT=${PYTHON_MEM_LIMIT_MW:-384m}
JAVA_MEM_LIMIT_MW=${JAVA_MEM_LIMIT_MW:-448m}
SPRING_DATASOURCE_URL=jdbc:postgresql://${MW_HOST}:5432/novel_agent?sslmode=disable
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=${SPRING_DATASOURCE_PASSWORD:?请在 .env.split 设置 SPRING_DATASOURCE_PASSWORD}
SPRING_DATA_REDIS_HOST=${MW_HOST}
SPRING_DATA_REDIS_PASSWORD=${SPRING_DATA_REDIS_PASSWORD:?请在 .env.split 设置 SPRING_DATA_REDIS_PASSWORD}
SPRING_RABBITMQ_HOST=${MW_HOST}
SPRING_RABBITMQ_USERNAME=novel_agent
SPRING_RABBITMQ_PASSWORD=${SPRING_RABBITMQ_PASSWORD:?请在 .env.split 设置 SPRING_RABBITMQ_PASSWORD}
AGENT_PYTHON_BASE_URL=http://python-lb:8000
EOF

cat > "$DEPLOY_DIR/.env.worker" <<EOF
HOST_IP=${WORKER_HOST}
MW_HOST=${MW_HOST}
WORKER_HOST=${WORKER_HOST}
NACOS_SERVER_ADDR=${NACOS_SERVER_ADDR}
NACOS_USERNAME=${NACOS_USERNAME}
NACOS_PASSWORD=${NACOS_PASSWORD}
NACOS_NAMESPACE=${NACOS_NAMESPACE}
FRONTEND_PORT=${FRONTEND_PORT:-3000}
GATEWAY_UPSTREAM=${GATEWAY_UPSTREAM}
SPRING_PROFILES_ACTIVE=${SPRING_PROFILES_ACTIVE:-dev}
PYTHON_LOG_LEVEL=${PYTHON_LOG_LEVEL:-INFO}
JAVA_OPTS_CONTENT=${JAVA_OPTS_CONTENT:--Xms96m -Xmx256m -Dfile.encoding=UTF-8}
JAVA_OPTS_PYAI=${JAVA_OPTS_PYAI:--Xms96m -Xmx256m -Dfile.encoding=UTF-8}
JAVA_OPTS_CONSUMER=${JAVA_OPTS_CONSUMER:--Xms96m -Xmx192m -Dfile.encoding=UTF-8}
PYTHON_MEM_LIMIT=${PYTHON_MEM_LIMIT:-256m}
PYTHON_MEM_LIMIT_2=${PYTHON_MEM_LIMIT_2:-256m}
JAVA_MEM_LIMIT_CONTENT=${JAVA_MEM_LIMIT_CONTENT:-384m}
JAVA_MEM_LIMIT_PYAI=${JAVA_MEM_LIMIT_PYAI:-288m}
JAVA_MEM_LIMIT_CONSUMER=${JAVA_MEM_LIMIT_CONSUMER:-256m}
SPRING_DATASOURCE_URL=jdbc:postgresql://${MW_HOST}:5432/novel_agent?sslmode=disable
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=${SPRING_DATASOURCE_PASSWORD}
SPRING_DATA_REDIS_HOST=${MW_HOST}
SPRING_DATA_REDIS_PASSWORD=${SPRING_DATA_REDIS_PASSWORD}
SPRING_RABBITMQ_HOST=${MW_HOST}
SPRING_RABBITMQ_USERNAME=novel_agent
SPRING_RABBITMQ_PASSWORD=${SPRING_RABBITMQ_PASSWORD}
AGENT_PYTHON_BASE_URL=http://python-ai:8000
AGENT_CONTENT_BASE_URL=http://agent-content:8091
EOF
echo "[split-setup] 已生成 .env.mw / .env.worker"

# Nacos（替换 Worker IP）
NACOS_RENDER="$DEPLOY_DIR/nacos-split-rendered"
rm -rf "$NACOS_RENDER"
mkdir -p "$NACOS_RENDER"
for f in "$DEPLOY_DIR/nacos-split"/*.yaml; do
  sed -e "s/WORKER_HOST_PLACEHOLDER/${WORKER_HOST}/g" \
      -e "s/YOUR_MW_HOST/${MW_HOST}/g" \
      -e "s|YOUR_DB_PASSWORD|${SPRING_DATASOURCE_PASSWORD}|g" \
      -e "s|YOUR_REDIS_PASSWORD|${SPRING_DATA_REDIS_PASSWORD}|g" \
      -e "s|YOUR_RMQ_PASSWORD|${SPRING_RABBITMQ_PASSWORD}|g" \
      "$f" > "$NACOS_RENDER/$(basename "$f")"
done

if [[ ! -f "$REPO_ROOT/python-ai/.env" ]]; then
  echo "[split-setup] WARN: 缺少 python-ai/.env"
else
  echo "[split-setup] python-ai/.env OK"
fi

export NACOS_CONFIG_DIR="$NACOS_RENDER"
export NACOS_AUTH_IDENTITY_KEY="${NACOS_AUTH_IDENTITY_KEY:-root}"
export NACOS_AUTH_IDENTITY_VALUE="${NACOS_AUTH_IDENTITY_VALUE:?请在 .env.split 设置 NACOS_AUTH_IDENTITY_VALUE}"
python "$REPO_ROOT/novel-agent/scripts/publish_nacos_config.py"
echo "[split-setup] Nacos 双机配置已发布"

echo ""
echo "======== 双机资源分配（CPU 优化）========"
echo "MW (${MW_HOST}, 4G — 中间件 + 轻量 Java):"
echo "  entry-nginx(32m,:80) + python-lb(32m,:8000) + gateway(300m) + auth(300m)  ≈664m"
echo "  + PG/Redis/MQ/Nacos（CPU 主要消耗在此机）"
echo ""
echo "Worker (${WORKER_HOST}, 2G — LLM + 业务 Java):"
echo "  python-ai#1(320m) + python-ai#2(320m) + content(288m)"
echo "  + pyai(288m) + consumer(224m) + frontend(64m)  ≈1.5G"
echo ""
echo "入口: http://${MW_HOST}/  (80 → 前端 + /api → Gateway)"
echo "Python 内部（PyAI/Content → python-ai:8000）；对外 LB: ${MW_HOST}:8000 → Worker :8000/:8001"
echo ""
echo "Worker 防火墙: 放行 ${MW_HOST} → TCP 8000、8001、8082、8091、9848(出站到MW Nacos)"
