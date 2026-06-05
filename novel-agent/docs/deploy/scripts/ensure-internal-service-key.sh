#!/usr/bin/env bash
# 确保 .env.split 与 MW .env.mw 存在 AGENT_INTERNAL_SERVICE_KEY
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPLIT_ENV="${DEPLOY_SPLIT_ENV:-$SCRIPT_DIR/../docker/.env.split}"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_deploy-lib.sh"
if [[ -f "$SPLIT_ENV" ]]; then
  # shellcheck disable=SC1090
  source "$SPLIT_ENV"
fi

: "${MW_HOST:?}"

if [[ -z "${AGENT_INTERNAL_SERVICE_KEY:-}" && -z "${INTERNAL_SERVICE_KEY:-}" ]]; then
  KEY="$(openssl rand -hex 24)"
  echo "AGENT_INTERNAL_SERVICE_KEY=$KEY" >> "$SPLIT_ENV"
  export AGENT_INTERNAL_SERVICE_KEY="$KEY"
  echo "[internal-key] 已生成并写入 .env.split"
else
  export AGENT_INTERNAL_SERVICE_KEY="${AGENT_INTERNAL_SERVICE_KEY:-${INTERNAL_SERVICE_KEY}}"
fi

MW_SSH="${MW_SSH:-root@${MW_HOST}}"
REMOTE_DIR="${MW_REMOTE_DIR:-/opt/novel-agent}"
ENV_REL="novel-agent/docs/deploy/docker/.env.mw"

deploy_ssh "$MW_SSH" bash -s <<EOF
set -euo pipefail
cd '$REMOTE_DIR'
ENV='$ENV_REL'
touch "\$ENV"
grep -v '^AGENT_INTERNAL_SERVICE_KEY=' "\$ENV" > "\$ENV.tmp" || true
mv "\$ENV.tmp" "\$ENV"
echo 'AGENT_INTERNAL_SERVICE_KEY=$AGENT_INTERNAL_SERVICE_KEY' >> "\$ENV"
grep '^AGENT_INTERNAL_SERVICE_KEY=' "\$ENV" | sed 's/=.*$/=***/'
EOF

echo "[internal-key] MW .env.mw 已同步"

REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
deploy_scp "$REPO_ROOT/novel-agent/docs/deploy/docker/docker-compose.mw.yml" \
  "$MW_SSH:$REMOTE_DIR/novel-agent/docs/deploy/docker/docker-compose.mw.yml"

COMPOSE_FILE="novel-agent/docs/deploy/docker/docker-compose.mw.yml"
deploy_ssh "$MW_SSH" bash -s <<EOF
set -euo pipefail
cd '$REMOTE_DIR'
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
\$COMPOSE -f '$COMPOSE_FILE' --env-file '$ENV_REL' up -d --force-recreate agent-auth
sleep 12
EOF
echo "[internal-key] agent-auth 已重建以加载 AGENT_INTERNAL_SERVICE_KEY"
