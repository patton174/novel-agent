#!/usr/bin/env bash
# 将 CI 已构建的 python-ai 镜像传到 Worker 并 compose up
set -euo pipefail

CI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$CI_DIR/_common.sh"
ci_require_deploy_env

IMAGE="${PYTHON_AI_IMAGE:-novel-agent/python-ai:latest}"
REMOTE="$(ci_remote worker)"
RDIR="$(ci_remote_dir worker)"
SHA="$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo manual)"

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "本地无镜像 $IMAGE，请先 build-python-ai.sh"
  exit 1
fi

ci_setup_ssh
bash "$CI_DIR/sync-compose.sh" worker

TAR="/tmp/python-ai-${SHA}.tar.gz"
echo "[deploy-python-ai] 导出镜像..."
docker save "$IMAGE" | gzip > "$TAR"
trap 'rm -f "$TAR"' EXIT

echo "[deploy-python-ai] 上传 → worker sha=$SHA"
deploy_scp "$TAR" "$REMOTE:/tmp/python-ai-deploy.tar.gz"

deploy_ssh "$REMOTE" bash -s <<EOF
set -euo pipefail
RDIR='$RDIR'
DOCKER_REL='$DOCKER_REL'
IMAGE='$IMAGE'
echo "[deploy-python-ai] 清理 Worker 磁盘..."
docker system prune -af 2>/dev/null || true
docker builder prune -af 2>/dev/null || true
gunzip -c /tmp/python-ai-deploy.tar.gz | docker load
rm -f /tmp/python-ai-deploy.tar.gz
cd "\$RDIR/\$DOCKER_REL"
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
\$COMPOSE -f docker-compose.worker.yml --env-file .env.worker up -d --no-deps --no-build python-ai
EOF

echo "[deploy-python-ai] 完成"
