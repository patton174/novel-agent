#!/usr/bin/env bash
# 部署脚本公共函数

deploy_rsync_to() {
  local repo_root="$1"
  local remote_ssh="$2"
  local remote_dir="$3"
  ssh "$remote_ssh" "mkdir -p '$remote_dir'"
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
    rsync -avz --delete "${excludes[@]}" "$repo_root/" "$remote_ssh:$remote_dir/"
  else
    local tar="/tmp/novel-agent-deploy-$$.tar.gz"
    tar -czf "$tar" \
      --exclude='.git' \
      --exclude='node_modules' \
      --exclude='frontend/node_modules' \
      --exclude='**/target' \
      --exclude='.dev-logs' \
      -C "$repo_root" .
    scp "$tar" "$remote_ssh:/tmp/novel-agent-deploy.tar.gz"
    ssh "$remote_ssh" "mkdir -p '$remote_dir' && tar -xzf /tmp/novel-agent-deploy.tar.gz -C '$remote_dir' && rm -f /tmp/novel-agent-deploy.tar.gz"
    rm -f "$tar"
  fi
}

deploy_scp_file() {
  local local_file="$1"
  local remote_ssh="$2"
  local remote_path="$3"
  ssh "$remote_ssh" "mkdir -p '$(dirname "$remote_path")'"
  scp "$local_file" "$remote_ssh:$remote_path"
}

deploy_compose_up() {
  local remote_ssh="$1"
  local remote_dir="$2"
  local compose_file="$3"
  local env_rel="$4"
  ssh "$remote_ssh" bash -s <<EOF
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
