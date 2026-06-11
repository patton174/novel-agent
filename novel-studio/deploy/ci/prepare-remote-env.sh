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
mkdir -p "\$NEW"

if [[ "$role" == "worker" ]]; then
  if [[ -f "\$NEW/.env.worker" ]]; then
    echo "[prepare-env] worker .env.worker 已存在"
    exit 0
  fi
  [[ -f "\$OLD/.env.worker" ]] || { echo "[prepare-env] 缺少 \$OLD/.env.worker"; exit 1; }
  set -a
  # shellcheck disable=SC1091
  source "\$OLD/.env.worker"
  set +a

  jdbc="\${SPRING_DATASOURCE_URL:-}"
  if [[ -n "\$jdbc" ]]; then
    rest="\${jdbc#jdbc:postgresql://}"
    DB_HOST="\${rest%%:*}"
    rest="\${rest#*:}"
    DB_PORT="\${rest%%/*}"
    DB_NAME="\${rest#*/}"
    DB_NAME="\${DB_NAME%%\?*}"
  fi
  DB_HOST="\${DB_HOST:-\$MW_HOST}"
  DB_PORT="\${DB_PORT:-5432}"
  DB_NAME="\${DB_NAME:-novel_agent}"
  DB_USER="\${DB_USER:-\${SPRING_DATASOURCE_USERNAME:-postgres}}"
  DB_PASSWORD="\${DB_PASSWORD:-\${SPRING_DATASOURCE_PASSWORD:-}}"

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
REDIS_HOST=\${REDIS_HOST:-\${SPRING_DATA_REDIS_HOST:-\$MW_HOST}}
REDIS_PORT=\${REDIS_PORT:-6379}
REDIS_PASSWORD=\${REDIS_PASSWORD:-\${SPRING_DATA_REDIS_PASSWORD:-}}
RABBITMQ_HOST=\${RABBITMQ_HOST:-\${SPRING_RABBITMQ_HOST:-\$MW_HOST}}
RABBITMQ_PORT=\${RABBITMQ_PORT:-5672}
RABBITMQ_USER=\${RABBITMQ_USER:-\${SPRING_RABBITMQ_USERNAME:-guest}}
RABBITMQ_PASSWORD=\${RABBITMQ_PASSWORD:-\${SPRING_RABBITMQ_PASSWORD:-}}
JWT_SECRET=\${JWT_SECRET}
AGENT_INTERNAL_SERVICE_KEY=\${AGENT_INTERNAL_SERVICE_KEY}
PYTHON_AI_BASE_URL=http://python-lb:8000
JAVA_OPTS_STUDIO=-Xms128m -Xmx448m -XX:MaxMetaspaceSize=192m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError -Dfile.encoding=UTF-8
JAVA_MEM_LIMIT_STUDIO=640m
PYTHON_MEM_LIMIT=\${PYTHON_MEM_LIMIT:-304m}
MAILTRAP_TOKEN=\${MAILTRAP_TOKEN:-}
ENVEOF
  echo "[prepare-env] 已从旧 worker env 生成 \$NEW/.env.worker"
  exit 0
fi

if [[ -f "\$NEW/.env.mw" ]]; then
  echo "[prepare-env] mw .env.mw 已存在"
  exit 0
fi
if [[ -f "\$OLD/.env.mw" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "\$OLD/.env.mw"
  set +a
fi
DOMAIN="\${DOMAIN:-www.novel-agent.cn}"
DOMAIN_ALIASES="\${DOMAIN_ALIASES:-novel-agent.cn}"
CERT_NAME="\${CERT_NAME:-\$DOMAIN}"
cat > "\$NEW/.env.mw" <<ENVEOF
MW_HOST=\${MW_HOST}
WORKER_HOST=\${WORKER_HOST}
DOMAIN=\${DOMAIN}
DOMAIN_ALIASES=\${DOMAIN_ALIASES}
CERT_NAME=\${CERT_NAME}
ENTRY_PORT=\${ENTRY_PORT:-80}
ENTRY_SSL_PORT=\${ENTRY_SSL_PORT:-443}
ENVEOF
echo "[prepare-env] 已生成 \$NEW/.env.mw"

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
