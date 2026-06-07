#!/usr/bin/env bash
# 在服务器 /opt/novel-agent 内执行（由 deploy-from-git / CI 调用）
set -euo pipefail

ROLE="${1:?mw|worker}"
ONLY_SVC="${2:-}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../.." && pwd)"
FAST="$REPO_ROOT/novel-agent/agent-document/docs/deploy/scripts/deploy-fast.sh"
MVN_IMAGE="${MVN_IMAGE:-maven:3.9-eclipse-temurin-21}"

build_jar_remote() {
  local module="$1"
  local jar="$2"
  local out="$REPO_ROOT/novel-agent/agent-service/$module/target/$jar"
  mkdir -p "$(dirname "$out")"
  echo "[server-deploy] Docker Maven 编译 $module ..."
  docker run --rm \
    -v "$REPO_ROOT/novel-agent:/build/novel-agent" \
    -v novel-agent-m2:/root/.m2 \
    -w /build/novel-agent \
    "$MVN_IMAGE" \
    mvn -q -pl ":$module" -am package -DskipTests
  [[ -f "$out" ]] || { echo "缺少 $out"; exit 1; }
  echo "$out"
}

hot_jar() {
  local target="$1"
  local compose_svc="$2"
  local module="$3"
  local jar="$4"
  local cf env_rel
  if [[ "$target" == "mw" ]]; then
    cf="novel-agent/agent-document/docs/deploy/docker/docker-compose.mw.yml"
    env_rel="novel-agent/agent-document/docs/deploy/docker/.env.mw"
  else
    cf="novel-agent/agent-document/docs/deploy/docker/docker-compose.worker.yml"
    env_rel="novel-agent/agent-document/docs/deploy/docker/.env.worker"
  fi
  local jar_path
  jar_path="$(build_jar_remote "$module" "$jar")"
  cd "$REPO_ROOT"
  COMPOSE="docker compose"
  if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
  CID=$($COMPOSE -f "$cf" --env-file "$env_rel" ps -q "$compose_svc")
  if [[ -z "$CID" ]]; then
    $COMPOSE -f "$cf" --env-file "$env_rel" up -d "$compose_svc"
    CID=$($COMPOSE -f "$cf" --env-file "$env_rel" ps -q "$compose_svc")
  fi
  docker cp "$jar_path" "$CID:/app/app.jar"
  docker restart "$CID"
  echo "[server-deploy] 已热更新 $compose_svc"
}

deploy_frontend() {
  cd "$REPO_ROOT/frontend"
  docker run --rm \
    -v "$REPO_ROOT/frontend:/app" \
    -w /app \
    node:22-alpine \
    sh -c "corepack enable && corepack prepare pnpm@9.15.9 --activate && pnpm install --frozen-lockfile && pnpm exec vite build"
  cd "$REPO_ROOT"
  local cf="novel-agent/agent-document/docs/deploy/docker/docker-compose.worker.yml"
  local env_rel="novel-agent/agent-document/docs/deploy/docker/.env.worker"
  COMPOSE="docker compose"
  if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
  CID=$($COMPOSE -f "$cf" --env-file "$env_rel" ps -q frontend)
  if [[ -z "$CID" ]]; then
    $COMPOSE -f "$cf" --env-file "$env_rel" up -d frontend
    CID=$($COMPOSE -f "$cf" --env-file "$env_rel" ps -q frontend)
  fi
  docker cp "$REPO_ROOT/frontend/dist/." "$CID:/usr/share/nginx/html/"
  docker restart "$CID"
  echo "[server-deploy] 前端已更新"
}

deploy_one() {
  local svc="$1"
  case "$svc" in
    gateway|gw) hot_jar mw agent-gateway agent-gateway agent-gateway-1.0.0-SNAPSHOT.jar ;;
    auth)       hot_jar mw agent-auth agent-auth agent-auth-1.0.0-SNAPSHOT.jar ;;
    pyai)       hot_jar worker agent-pyai agent-pyai agent-pyai-1.0.0-SNAPSHOT.jar ;;
    content)    hot_jar worker agent-content agent-content agent-content-1.0.0-SNAPSHOT.jar ;;
    consumer)   hot_jar worker agent-consumer agent-consumer agent-consumer-1.0.0-SNAPSHOT.jar ;;
    frontend|fe) deploy_frontend ;;
    *) echo "[server-deploy] 未知服务: $svc"; exit 1 ;;
  esac
}

if [[ -n "$ONLY_SVC" ]]; then
  deploy_one "$ONLY_SVC"
  exit 0
fi

if [[ "${AUTO_DETECT:-1}" == "1" ]] && git -C "$REPO_ROOT" rev-parse HEAD@{1} >/dev/null 2>&1; then
  mapfile -t CHANGED < <(git -C "$REPO_ROOT" diff --name-only HEAD@{1} HEAD 2>/dev/null || git -C "$REPO_ROOT" diff --name-only HEAD~1 HEAD)
else
  mapfile -t CHANGED < <(git -C "$REPO_ROOT" diff --name-only HEAD~1 HEAD 2>/dev/null || echo "")
fi

need() {
  local pat="$1"
  for f in "${CHANGED[@]}"; do
    [[ "$f" == $pat ]] && return 0
  done
  return 1
}

deploy_list=()
if [[ "$ROLE" == "mw" ]]; then
  need "novel-agent/agent-service/agent-gateway/*" && deploy_list+=(gateway)
  need "novel-agent/agent-service/agent-auth/*" && deploy_list+=(auth)
  if [[ ${#deploy_list[@]} -eq 0 && ${#CHANGED[@]} -gt 0 ]]; then
    need "novel-agent/agent-common/*" && deploy_list+=(gateway auth)
  fi
else
  need "novel-agent/agent-service/agent-pyai/*" && deploy_list+=(pyai)
  need "novel-agent/agent-service/agent-content/*" && deploy_list+=(content)
  need "novel-agent/agent-service/agent-consumer/*" && deploy_list+=(consumer)
  need "frontend/*" && deploy_list+=(frontend)
  if [[ ${#deploy_list[@]} -eq 0 && ${#CHANGED[@]} -gt 0 ]]; then
    need "novel-agent/agent-common/*" && deploy_list+=(pyai content)
  fi
fi

if [[ ${#deploy_list[@]} -eq 0 ]]; then
  echo "[server-deploy] $ROLE: 无匹配变更，跳过部署"
  exit 0
fi

for svc in "${deploy_list[@]}"; do
  deploy_one "$svc"
done
