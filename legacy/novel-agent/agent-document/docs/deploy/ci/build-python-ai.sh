#!/usr/bin/env bash
# GitHub Actions：构建 python-ai Docker 镜像（含 Chromium，不在 Worker 上编译）
set -euo pipefail

CI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$CI_DIR/_common.sh"

IMAGE="${PYTHON_AI_IMAGE:-novel-agent/python-ai:latest}"
DOCKERFILE="$DEPLOY_DIR/Dockerfile.python-ai"

cd "$REPO_ROOT"
docker build -f "$DOCKERFILE" -t "$IMAGE" .
echo "BUILT_IMAGE=$IMAGE"
