#!/usr/bin/env bash
# 上传 dist → Worker 打 runtime 镜像 → compose up frontend
set -euo pipefail

CI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$CI_DIR/_common.sh"
ci_require_deploy_env

DIST="${DIST_DIR:-$REPO_ROOT/frontend/dist}"
[[ -d "$DIST" ]] || { echo "缺少 $DIST"; exit 1; }

REMOTE="$(ci_remote worker)"
RDIR="$(ci_remote_dir worker)"
STAGE="$RDIR/$STAGING_DIR/frontend"
IMAGE=novel-studio/frontend-worker:latest
SHA="$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo manual)"

ci_setup_ssh
bash "$CI_DIR/sync-compose.sh" worker

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp -a "$DIST" "$TMP/dist"
cp "$DEPLOY_DIR/nginx-frontend-worker.conf.template" "$TMP/nginx-frontend-worker.conf"
cat > "$TMP/Dockerfile" <<'EOF'
FROM nginx:1.27-alpine
COPY nginx-frontend-worker.conf /etc/nginx/conf.d/default.conf
COPY dist /usr/share/nginx/html
EXPOSE 80
EOF
tar -czf "$TMP/frontend.tgz" -C "$TMP" dist nginx-frontend-worker.conf Dockerfile

echo "[deploy-frontend] → worker sha=$SHA"
bash "$CI_DIR/ensure-worker-secrets.sh"
deploy_ssh "$REMOTE" "mkdir -p '$STAGE'"
deploy_scp "$TMP/frontend.tgz" "$REMOTE:$STAGE/frontend.tgz"

deploy_ssh "$REMOTE" bash -s <<EOF
set -euo pipefail
STAGE='$STAGE'
RDIR='$RDIR'
DOCKER_REL='$DOCKER_REL'
IMAGE='$IMAGE'
cd "\$STAGE"
rm -rf dist nginx-frontend-worker.conf Dockerfile
tar -xzf frontend.tgz
docker build -t "\$IMAGE" .
cd "\$RDIR/\$DOCKER_REL"
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
\$COMPOSE -f docker-compose.worker.yml --env-file .env.worker up -d --no-deps --no-build --force-recreate frontend
curl -sf --connect-timeout 5 --max-time 10 "http://127.0.0.1:\${FRONTEND_PORT:-3000}/" -o /dev/null || {
  echo "[deploy-frontend] WARN: local frontend probe failed"
  \$COMPOSE -f docker-compose.worker.yml --env-file .env.worker ps frontend || true
  docker logs "\$(docker ps -q -f name=frontend | head -1)" --tail 40 2>&1 || true
}
EOF

echo "[deploy-frontend] 注册 crypto-runtime.json ..."
if ! bash "$CI_DIR/register-frontend-crypto.sh"; then
  echo "[deploy-frontend] 警告: crypto 注册失败，请检查 novel-studio /internal API 或 AGENT_INTERNAL_SERVICE_KEY"
  exit 1
fi

echo "[deploy-frontend] 完成"
