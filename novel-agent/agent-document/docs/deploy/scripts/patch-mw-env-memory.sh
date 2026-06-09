#!/usr/bin/env bash
# MW 本机执行：写入低内存 .env.mw 键值
set -euo pipefail
ENV="${1:-/opt/novel-agent/novel-agent/agent-document/docs/deploy/docker/.env.mw}"
upsert() {
  local k="$1" v="$2"
  if grep -q "^${k}=" "$ENV"; then
    sed -i "s|^${k}=.*|${k}=${v}|" "$ENV"
  else
    echo "${k}=${v}" >> "$ENV"
  fi
}
upsert JAVA_OPTS_AUTH "-Xms64m -Xmx200m -XX:MaxMetaspaceSize=160m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError -Dfile.encoding=UTF-8"
upsert JAVA_OPTS_GATEWAY "-Xms64m -Xmx192m -XX:MaxMetaspaceSize=96m -XX:MaxDirectMemorySize=64m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError -Dfile.encoding=UTF-8"
upsert JAVA_MEM_LIMIT_AUTH "448m"
upsert JAVA_MEM_LIMIT_GATEWAY "352m"
echo "[patch-mw-env-memory] updated $ENV"
