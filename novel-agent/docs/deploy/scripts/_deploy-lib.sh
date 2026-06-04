#!/usr/bin/env bash
# 部署脚本公共函数

# CI 可设 DEPLOY_SSH_OPTS="-i ~/.ssh/deploy_key -o StrictHostKeyChecking=yes"
deploy_ssh() {
  if [[ -n "${DEPLOY_SSH_OPTS:-}" ]]; then
    # shellcheck disable=SC2086
    ssh $DEPLOY_SSH_OPTS "$@"
  else
    ssh "$@"
  fi
}

deploy_scp() {
  if [[ -n "${DEPLOY_SCP_OPTS:-}" ]]; then
    # shellcheck disable=SC2086
    scp $DEPLOY_SCP_OPTS "$@"
  else
    scp "$@"
  fi
}

deploy_rsync_to() {
  local repo_root="$1"
  local remote_ssh="$2"
  local remote_dir="$3"
  deploy_ssh "$remote_ssh" "mkdir -p '$remote_dir'"
  local excludes=(
    --exclude '.git'
    --exclude 'node_modules'
    --exclude 'frontend/node_modules'
    --exclude '**/target'
    --exclude '.dev-logs'
    --exclude 'claude-code-ref'
    --exclude '.cursor'
    --exclude 'python-ai/__pycache__'
    --exclude 'python-ai/.venv'
  )
  if command -v rsync >/dev/null 2>&1; then
    rsync -avz --delete "${excludes[@]}" -e "${DEPLOY_RSYNC_SSH:-ssh ${DEPLOY_SSH_OPTS:-}}" "$repo_root/" "$remote_ssh:$remote_dir/"
  else
    local tar="/tmp/novel-agent-deploy-$$.tar.gz"
    tar -czf "$tar" \
      --exclude='.git' \
      --exclude='node_modules' \
      --exclude='frontend/node_modules' \
      --exclude='**/target' \
      --exclude='.dev-logs' \
      -C "$repo_root" .
    deploy_scp "$tar" "$remote_ssh:/tmp/novel-agent-deploy.tar.gz"
    deploy_ssh "$remote_ssh" "mkdir -p '$remote_dir' && tar -xzf /tmp/novel-agent-deploy.tar.gz -C '$remote_dir' && rm -f /tmp/novel-agent-deploy.tar.gz"
    rm -f "$tar"
  fi
}

deploy_scp_file() {
  local local_file="$1"
  local remote_ssh="$2"
  local remote_path="$3"
  deploy_ssh "$remote_ssh" "mkdir -p '$(dirname "$remote_path")'"
  deploy_scp "$local_file" "$remote_ssh:$remote_path"
}

deploy_compose_up() {
  local remote_ssh="$1"
  local remote_dir="$2"
  local compose_file="$3"
  local env_rel="$4"
  deploy_ssh "$remote_ssh" bash -s <<EOF
set -euo pipefail
cd '$remote_dir'
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then
  COMPOSE="docker-compose"
fi
\$COMPOSE -f '$compose_file' --env-file '$env_rel' build
\$COMPOSE -f '$compose_file' --env-file '$env_rel' up -d
\$COMPOSE -f '$compose_file' --env-file '$env_rel' ps
EOF
}
