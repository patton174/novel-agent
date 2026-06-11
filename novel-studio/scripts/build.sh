#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mvn -pl studio-app -am package -DskipTests "$@"
echo "Built: studio-app/target/studio-app-0.1.0-SNAPSHOT.jar"
