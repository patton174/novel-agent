#!/usr/bin/env bash
# Worker 本机执行：写入低内存 .env.worker 键值
set -euo pipefail
ENV="${1:-/opt/novel-agent/novel-agent/agent-document/docs/deploy/docker/.env.worker}"
upsert() {
  local k="$1" v="$2"
  if grep -q "^${k}=" "$ENV"; then
    sed -i "s|^${k}=.*|${k}=${v}|" "$ENV"
  else
    echo "${k}=${v}" >> "$ENV"
  fi
}
upsert JAVA_OPTS_CONTENT "-Xms64m -Xmx228m -XX:MaxMetaspaceSize=120m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError -Dfile.encoding=UTF-8"
upsert JAVA_OPTS_PYAI "-Xms48m -Xmx160m -XX:MaxMetaspaceSize=80m -XX:MaxDirectMemorySize=48m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError -Dfile.encoding=UTF-8"
upsert JAVA_OPTS_CONSUMER "-Xms48m -Xmx140m -XX:MaxMetaspaceSize=72m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError -Dfile.encoding=UTF-8"
upsert JAVA_OPTS_BILLING "-Xms48m -Xmx188m -XX:MaxMetaspaceSize=128m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError -Dfile.encoding=UTF-8"
upsert PYTHON_MEM_LIMIT "304m"
upsert PYTHON_MEM_LIMIT_2 "256m"
upsert JAVA_MEM_LIMIT_CONTENT "368m"
upsert JAVA_MEM_LIMIT_PYAI "240m"
upsert JAVA_MEM_LIMIT_CONSUMER "224m"
upsert JAVA_MEM_LIMIT_BILLING "384m"
echo "[patch-worker-env-memory] updated $ENV"
