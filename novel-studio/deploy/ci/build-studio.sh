#!/usr/bin/env bash
# GitHub Actions：编译 novel-studio 单体 JAR
set -euo pipefail

CI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$CI_DIR/_common.sh"

cd "$REPO_ROOT/novel-studio"
mvn -B -pl studio-app -am package -DskipTests

JAR="$(ls -1 studio-app/target/studio-app-*.jar | grep -v '\.original$' | head -1)"
[[ -f "$JAR" ]] || { echo "缺少 studio-app JAR"; exit 1; }
echo "BUILT_JAR=$REPO_ROOT/novel-studio/$JAR"
