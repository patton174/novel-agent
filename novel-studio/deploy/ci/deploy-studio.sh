#!/usr/bin/env bash
# 上传 JAR → Worker docker build → compose up novel-studio
set -euo pipefail

CI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$CI_DIR/_common.sh"
ci_require_deploy_env

LOCAL_JAR="${LOCAL_JAR:-$REPO_ROOT/novel-studio/studio-app/target/studio-app-0.1.0-SNAPSHOT.jar}"
if ! ls "$LOCAL_JAR" >/dev/null 2>&1; then
  LOCAL_JAR="$(ls -1 "$REPO_ROOT/novel-studio/studio-app/target"/studio-app-*.jar 2>/dev/null | grep -v '\.original$' | head -1 || true)"
fi
[[ -n "$LOCAL_JAR" && -f "$LOCAL_JAR" ]] || { echo "缺少 studio-app JAR，请先 build-studio.sh"; exit 1; }

REMOTE="$(ci_remote worker)"
RDIR="$(ci_remote_dir worker)"
COMPOSE_FILE="$(ci_compose_file worker)"
ENV_FILE="$(ci_env_file worker)"
IMAGE=novel-studio/studio:latest
SHA="$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo manual)"
STAGE="$RDIR/$STAGING_DIR/novel-studio"

ci_setup_ssh

echo "[deploy-studio] → worker ($IMAGE) sha=$SHA"
bash "$CI_DIR/sync-compose.sh" worker
bash "$CI_DIR/ensure-worker-secrets.sh"

deploy_ssh "$REMOTE" "mkdir -p '$STAGE' '$RDIR/backups'"
deploy_scp "$LOCAL_JAR" "$REMOTE:$STAGE/app.jar"
deploy_scp "$DEPLOY_DIR/Dockerfile.studio.runtime" "$REMOTE:$STAGE/Dockerfile"

deploy_ssh "$REMOTE" bash -s <<EOF
set -euo pipefail
STAGE='$STAGE'
RDIR='$RDIR'
DOCKER_REL='$DOCKER_REL'
COMPOSE_FILE='$COMPOSE_FILE'
ENV_FILE='$ENV_FILE'
IMAGE='$IMAGE'
SHA='$SHA'

cd "\$STAGE"
docker build -f Dockerfile --build-arg JAR=app.jar -t "\$IMAGE" .

mkdir -p "\$RDIR/backups"
CID=\$(docker ps -q -f name=novel-studio | head -1)
if [[ -n "\$CID" ]] && docker exec "\$CID" test -f /app/app.jar 2>/dev/null; then
  docker cp "\$CID:/app/app.jar" "\$RDIR/backups/novel-studio-\${SHA}-prev.jar" 2>/dev/null || true
fi
cp app.jar "\$RDIR/backups/novel-studio-\${SHA}.jar" 2>/dev/null || true

cd "\$RDIR/\$DOCKER_REL"
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
\$COMPOSE -f "\$COMPOSE_FILE" --env-file "\$ENV_FILE" up -d --no-deps --no-build --force-recreate novel-studio
echo "[deploy-studio] waiting for health..."
ready=0
for attempt in \$(seq 1 60); do
  if curl -sf --connect-timeout 2 --max-time 8 "http://127.0.0.1:8080/actuator/health/liveness" 2>/dev/null | grep -q UP; then
    ready=1
    break
  fi
  if curl -sf --connect-timeout 2 --max-time 8 "http://127.0.0.1:8080/actuator/health" 2>/dev/null | grep -q '"status":"UP"'; then
    ready=1
    break
  fi
  echo "[deploy-studio] not ready \$attempt/60"
  sleep 3
done
if [[ "\$ready" -ne 1 ]]; then
  echo "[deploy-studio] ERROR: novel-studio failed to become healthy"
  \$COMPOSE -f "\$COMPOSE_FILE" --env-file "\$ENV_FILE" ps novel-studio || true
  CID=\$(docker ps -aq --filter "name=novel-studio-worker-novel-studio" | head -1)
  if [[ -n "\$CID" ]]; then
    docker logs --tail 120 "\$CID" 2>&1 || true
  fi
  exit 1
fi
echo "[deploy-studio] done"
\$COMPOSE -f "\$COMPOSE_FILE" --env-file "\$ENV_FILE" ps novel-studio
EOF

echo "[deploy-studio] 刷新 crypto-runtime.json ..."
bash "$CI_DIR/register-frontend-crypto.sh" || echo "[deploy-studio] crypto 注册跳过（可稍后单独跑 register-frontend-crypto.sh）"

echo "[deploy-studio] 完成"
