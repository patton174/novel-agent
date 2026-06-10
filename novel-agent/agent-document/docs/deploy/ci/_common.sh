#!/usr/bin/env bash
# CI / 部署脚本公共变量（密钥在服务器 .env.mw / .env.worker，不进 GitHub）
set -euo pipefail

CI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$CI_DIR/../docker" && pwd)"
REPO_ROOT="$(cd "$CI_DIR/../../../../.." && pwd)"

export DOCKER_REL="novel-agent/agent-document/docs/deploy/docker"
export STAGING_DIR="deploy-staging"

# 仅 deploy 脚本需要；build-* 脚本不调用
ci_require_deploy_env() {
  export MW_HOST="${MW_HOST:?设置 GitHub Secret MW_HOST}"
  export WORKER_HOST="${WORKER_HOST:?设置 GitHub Secret WORKER_HOST}"
  export MW_SSH="${MW_SSH:-root@${MW_HOST}}"
  export WORKER_SSH="${WORKER_SSH:-root@${WORKER_HOST}}"
  export MW_REMOTE_DIR="${MW_REMOTE_DIR:-/opt/novel-agent}"
  export WORKER_REMOTE_DIR="${WORKER_REMOTE_DIR:-/opt/novel-agent}"
}

ci_setup_ssh() {
  ci_require_deploy_env
  if [[ -n "${DEPLOY_SSH_OPTS:-}" ]]; then
    return 0
  fi
  if [[ -n "${DEPLOY_SSH_KEY_FILE:-}" && -f "${DEPLOY_SSH_KEY_FILE}" ]]; then
    mkdir -p ~/.ssh
    chmod 700 ~/.ssh
    cp "${DEPLOY_SSH_KEY_FILE}" ~/.ssh/deploy_key
    chmod 600 ~/.ssh/deploy_key
    export DEPLOY_SSH_OPTS="${DEPLOY_SSH_OPTS:--i ~/.ssh/deploy_key -o StrictHostKeyChecking=yes -o ConnectTimeout=30 -o BatchMode=yes}"
    export DEPLOY_SCP_OPTS="${DEPLOY_SCP_OPTS:-$DEPLOY_SSH_OPTS}"
    ssh-keyscan -H "$MW_HOST" >> ~/.ssh/known_hosts 2>/dev/null || true
    ssh-keyscan -H "$WORKER_HOST" >> ~/.ssh/known_hosts 2>/dev/null || true
  fi
}

ci_remote() {
  local target="$1"
  if [[ "$target" == "mw" ]]; then
    echo "$MW_SSH"
  else
    echo "$WORKER_SSH"
  fi
}

ci_remote_dir() {
  local target="$1"
  if [[ "$target" == "mw" ]]; then
    echo "$MW_REMOTE_DIR"
  else
    echo "$WORKER_REMOTE_DIR"
  fi
}

ci_compose_file() {
  local target="$1"
  if [[ "$target" == "mw" ]]; then
    echo "docker-compose.mw.yml"
  else
    echo "docker-compose.worker.yml"
  fi
}

ci_env_file() {
  local target="$1"
  if [[ "$target" == "mw" ]]; then
    echo ".env.mw"
  else
    echo ".env.worker"
  fi
}
