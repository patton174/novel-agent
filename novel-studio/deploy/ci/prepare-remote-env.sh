#!/usr/bin/env bash
# 首次迁移：若 novel-studio 目录无 .env，从旧微服务 .env 自动生成
set -euo pipefail

CI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$CI_DIR/_common.sh"
ci_require_deploy_env
ci_setup_ssh

OLD_DOCKER_REL="novel-agent/agent-document/docs/deploy/docker"
NEW_DOCKER_REL="$DOCKER_REL"

bootstrap_env_on() {
  local role="$1"
  local remote
  local rdir
  remote="$(ci_remote "$role")"
  rdir="$(ci_remote_dir "$role")"

  deploy_ssh "$remote" bash -s <<EOF
set -euo pipefail
RDIR='$rdir'
OLD="\$RDIR/$OLD_DOCKER_REL"
NEW="\$RDIR/$NEW_DOCKER_REL"
CI_MW_HOST='$MW_HOST'
CI_WORKER_HOST='$WORKER_HOST'
mkdir -p "\$NEW"

env_get() {
  local key="\$1" file="\$2"
  [[ -f "\$file" ]] || return 0
  grep -E "^\${key}=" "\$file" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^"//;s/"\$//' || true
}

if [[ "$role" == "worker" ]]; then
  if [[ -f "\$NEW/.env.worker" ]]; then
    echo "[prepare-env] worker .env.worker 已存在"
    exit 0
  fi
  [[ -f "\$OLD/.env.worker" ]] || { echo "[prepare-env] 缺少 \$OLD/.env.worker"; exit 1; }

  MW_HOST="\$(env_get MW_HOST "\$OLD/.env.worker")"
  MW_HOST="\${MW_HOST:-\$CI_MW_HOST}"
  HOST_IP="\$(env_get HOST_IP "\$OLD/.env.worker")"
  WORKER_HOST="\$(env_get WORKER_HOST "\$OLD/.env.worker")"
  WORKER_HOST="\${WORKER_HOST:-\$CI_WORKER_HOST}"
  SPRING_PROFILES_ACTIVE="\$(env_get SPRING_PROFILES_ACTIVE "\$OLD/.env.worker")"
  FRONTEND_PORT="\$(env_get FRONTEND_PORT "\$OLD/.env.worker")"
  jdbc="\$(env_get SPRING_DATASOURCE_URL "\$OLD/.env.worker")"
  DB_USER="\$(env_get DB_USER "\$OLD/.env.worker")"
  DB_PASSWORD="\$(env_get DB_PASSWORD "\$OLD/.env.worker")"
  JWT_SECRET="\$(env_get JWT_SECRET "\$OLD/.env.worker")"
  AGENT_INTERNAL_SERVICE_KEY="\$(env_get AGENT_INTERNAL_SERVICE_KEY "\$OLD/.env.worker")"
  [[ -n "\$JWT_SECRET" ]] || JWT_SECRET="\$(env_get JWT_SECRET "\$OLD/.env.mw")"
  [[ -n "\$AGENT_INTERNAL_SERVICE_KEY" ]] || AGENT_INTERNAL_SERVICE_KEY="\$(env_get AGENT_INTERNAL_SERVICE_KEY "\$OLD/.env.mw")"
  MAILTRAP_TOKEN="\$(env_get MAILTRAP_TOKEN "\$OLD/.env.worker")"
  [[ -n "\$MAILTRAP_TOKEN" ]] || MAILTRAP_TOKEN="\$(env_get MAILTRAP_TOKEN "\$OLD/.env.mw")"
  [[ -n "\$MAILTRAP_TOKEN" ]] || MAILTRAP_TOKEN="\$(env_get MAILTRAP_TOKEN "\$OLD/.env.split")"
  AUTH_EMAIL_LINK_SECRET="\$(env_get AUTH_EMAIL_LINK_SECRET "\$OLD/.env.worker")"
  [[ -n "\$AUTH_EMAIL_LINK_SECRET" ]] || AUTH_EMAIL_LINK_SECRET="\$(env_get AUTH_EMAIL_LINK_SECRET "\$OLD/.env.mw")"
  [[ -n "\$AUTH_EMAIL_LINK_SECRET" ]] || AUTH_EMAIL_LINK_SECRET="\$(env_get AUTH_EMAIL_LINK_SECRET "\$OLD/.env.split")"

  if [[ -n "\$jdbc" ]]; then
    rest="\${jdbc#jdbc:postgresql://}"
    DB_HOST="\${rest%%:*}"
    rest="\${rest#*:}"
    DB_PORT="\${rest%%/*}"
    DB_NAME="\${rest#*/}"
    DB_NAME="\${DB_NAME%%\?*}"
  fi
  [[ -n "\$(env_get SPRING_DATASOURCE_USERNAME "\$OLD/.env.worker")" ]] && DB_USER="\$(env_get SPRING_DATASOURCE_USERNAME "\$OLD/.env.worker")"
  [[ -n "\$(env_get SPRING_DATASOURCE_PASSWORD "\$OLD/.env.worker")" ]] && DB_PASSWORD="\$(env_get SPRING_DATASOURCE_PASSWORD "\$OLD/.env.worker")"

  DB_HOST="\${DB_HOST:-\$MW_HOST}"
  DB_PORT="\${DB_PORT:-5432}"
  DB_NAME="\${DB_NAME:-novel_agent}"
  DB_USER="\${DB_USER:-postgres}"
  REDIS_HOST="\$(env_get REDIS_HOST "\$OLD/.env.worker")"
  REDIS_HOST="\${REDIS_HOST:-\$(env_get SPRING_DATA_REDIS_HOST "\$OLD/.env.worker")}"
  REDIS_HOST="\${REDIS_HOST:-\$MW_HOST}"
  REDIS_PASSWORD="\$(env_get REDIS_PASSWORD "\$OLD/.env.worker")"
  REDIS_PASSWORD="\${REDIS_PASSWORD:-\$(env_get SPRING_DATA_REDIS_PASSWORD "\$OLD/.env.worker")}"
  RABBITMQ_HOST="\$(env_get RABBITMQ_HOST "\$OLD/.env.worker")"
  RABBITMQ_HOST="\${RABBITMQ_HOST:-\$(env_get SPRING_RABBITMQ_HOST "\$OLD/.env.worker")}"
  RABBITMQ_HOST="\${RABBITMQ_HOST:-\$MW_HOST}"
  RABBITMQ_USER="\$(env_get RABBITMQ_USER "\$OLD/.env.worker")"
  RABBITMQ_USER="\${RABBITMQ_USER:-\$(env_get SPRING_RABBITMQ_USERNAME "\$OLD/.env.worker")}"
  RABBITMQ_USER="\${RABBITMQ_USER:-guest}"
  RABBITMQ_PASSWORD="\$(env_get RABBITMQ_PASSWORD "\$OLD/.env.worker")"
  RABBITMQ_PASSWORD="\${RABBITMQ_PASSWORD:-\$(env_get SPRING_RABBITMQ_PASSWORD "\$OLD/.env.worker")}"

  cat > "\$NEW/.env.worker" <<ENVEOF
MW_HOST=\${MW_HOST}
HOST_IP=\${HOST_IP:-\$WORKER_HOST}
WORKER_HOST=\${WORKER_HOST:-\$HOST_IP}
SPRING_PROFILES_ACTIVE=\${SPRING_PROFILES_ACTIVE:-prod}
FRONTEND_PORT=\${FRONTEND_PORT:-3000}
DB_HOST=\${DB_HOST}
DB_PORT=\${DB_PORT}
DB_NAME=\${DB_NAME}
DB_USER=\${DB_USER}
DB_PASSWORD=\${DB_PASSWORD}
REDIS_HOST=\${REDIS_HOST}
REDIS_PORT=6379
REDIS_PASSWORD=\${REDIS_PASSWORD}
RABBITMQ_HOST=\${RABBITMQ_HOST}
RABBITMQ_PORT=5672
RABBITMQ_USER=\${RABBITMQ_USER}
RABBITMQ_PASSWORD=\${RABBITMQ_PASSWORD}
JWT_SECRET=\${JWT_SECRET}
AGENT_INTERNAL_SERVICE_KEY=\${AGENT_INTERNAL_SERVICE_KEY}
MAILTRAP_TOKEN=\${MAILTRAP_TOKEN}
AUTH_EMAIL_LINK_SECRET=\${AUTH_EMAIL_LINK_SECRET}
AUTH_FRONTEND_BASE_URL=\${AUTH_FRONTEND_BASE_URL:-https://www.novel-agent.cn}
PYTHON_AI_BASE_URL=http://python-lb:8000
JAVA_OPTS_STUDIO=-Xms128m -Xmx448m -XX:MaxMetaspaceSize=192m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError -Dfile.encoding=UTF-8
JAVA_MEM_LIMIT_STUDIO=640m
PYTHON_MEM_LIMIT=\${PYTHON_MEM_LIMIT:-304m}
ENVEOF
  echo "[prepare-env] 已从旧 worker env 生成 \$NEW/.env.worker"
  exit 0
fi

if [[ -f "\$NEW/.env.mw" ]]; then
  echo "[prepare-env] mw .env.mw 已存在"
else
  MW_HOST="\$(env_get MW_HOST "\$OLD/.env.mw")"
  MW_HOST="\${MW_HOST:-\$CI_MW_HOST}"
  WORKER_HOST="\$(env_get WORKER_HOST "\$OLD/.env.mw")"
  WORKER_HOST="\${WORKER_HOST:-\$CI_WORKER_HOST}"
  DOMAIN="\$(env_get DOMAIN "\$OLD/.env.mw")"
  DOMAIN_ALIASES="\$(env_get DOMAIN_ALIASES "\$OLD/.env.mw")"
  CERT_NAME="\$(env_get CERT_NAME "\$OLD/.env.mw")"
  DOMAIN="\${DOMAIN:-www.novel-agent.cn}"
  DOMAIN_ALIASES="\${DOMAIN_ALIASES:-novel-agent.cn}"
  CERT_NAME="\${CERT_NAME:-\$DOMAIN}"
  cat > "\$NEW/.env.mw" <<ENVEOF
MW_HOST=\${MW_HOST}
WORKER_HOST=\${WORKER_HOST}
DOMAIN=\${DOMAIN}
DOMAIN_ALIASES=\${DOMAIN_ALIASES}
CERT_NAME=\${CERT_NAME}
ENTRY_PORT=80
ENTRY_SSL_PORT=443
ENVEOF
  echo "[prepare-env] 已生成 \$NEW/.env.mw"
fi

if [[ ! -e "\$NEW/letsencrypt" && -d "\$OLD/letsencrypt" ]]; then
  ln -sfn "\$OLD/letsencrypt" "\$NEW/letsencrypt"
  echo "[prepare-env] letsencrypt → 旧目录软链"
fi
if [[ ! -e "\$NEW/certbot-www" && -d "\$OLD/certbot-www" ]]; then
  ln -sfn "\$OLD/certbot-www" "\$NEW/certbot-www"
fi
EOF
}

bootstrap_env_on worker
bootstrap_env_on mw
echo "[prepare-env] 完成"
