#!/usr/bin/env bash
# 上传 dist → Worker 打 runtime 镜像 → compose up frontend → 注册 crypto
set -euo pipefail

CI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$CI_DIR/_common.sh"
ci_require_deploy_env
# shellcheck source=/dev/null
source "$REPO_ROOT/novel-agent/agent-document/docs/deploy/scripts/_deploy-lib.sh" 2>/dev/null || true

DIST="${DIST_DIR:-$REPO_ROOT/frontend/dist}"
[[ -d "$DIST" ]] || { echo "缺少 $DIST"; exit 1; }

REMOTE="$(ci_remote worker)"
RDIR="$(ci_remote_dir worker)"
STAGE="$RDIR/$STAGING_DIR/frontend"
IMAGE=novel-agent/frontend-worker:latest
SHA="$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo manual)"

ci_setup_ssh

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp -a "$DIST" "$TMP/dist"
NGINX_TMPL="$DEPLOY_DIR/nginx-frontend-worker.conf.template"
NGINX_OUT="$TMP/nginx-frontend-worker.conf"
if [[ -f "$DEPLOY_DIR/nginx-frontend-worker.conf" ]]; then
  cp "$DEPLOY_DIR/nginx-frontend-worker.conf" "$NGINX_OUT"
else
  : "${MW_HOST:?MW_HOST 必填（渲染 nginx 模板）}"
  sed "s/\${MW_HOST}/${MW_HOST}/g" "$NGINX_TMPL" > "$NGINX_OUT"
fi
cat > "$TMP/Dockerfile" <<'EOF'
FROM nginx:1.27-alpine
COPY nginx-frontend-worker.conf /etc/nginx/conf.d/default.conf
COPY dist /usr/share/nginx/html
EXPOSE 80
EOF
tar -czf "$TMP/frontend.tgz" -C "$TMP" dist nginx-frontend-worker.conf Dockerfile

echo "[deploy-frontend] → worker sha=$SHA"
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
\$COMPOSE -f docker-compose.worker.yml --env-file .env.worker up -d --no-deps --no-build frontend
EOF

bash "$REPO_ROOT/novel-agent/agent-document/docs/deploy/scripts/register-frontend-crypto.sh" || true
echo "[deploy-frontend] 完成"
