#!/usr/bin/env bash
# GitHub Actions：编译单个 Java 模块 → target/*.jar
# 用法: MODULE=agent-gateway bash build-java.sh
set -euo pipefail

CI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$CI_DIR/_common.sh"

MODULE="${1:-${MODULE:?MODULE 必填，如 agent-gateway}}"

cd "$REPO_ROOT/novel-agent"

if [[ "$MODULE" == "agent-auth" ]]; then
  bash "$REPO_ROOT/novel-agent/agent-document/docs/deploy/scripts/build-email-templates.sh"
fi

mvn -B -q -pl ":$MODULE" -am package -DskipTests -Dspring-boot.repackage.skip=false

JAR="$REPO_ROOT/novel-agent/agent-service/$MODULE/target/${MODULE}-1.0.0-SNAPSHOT.jar"
[[ -f "$JAR" ]] || { echo "缺少 $JAR"; exit 1; }
echo "BUILT_JAR=$JAR"
