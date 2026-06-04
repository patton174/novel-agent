#!/usr/bin/env bash
# 杀掉占用端口并重启本地开发栈（Python / PyAI / Content / Consumer / Frontend）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_BAT="$SCRIPT_DIR/env.bat"

load_env_bat() {
  [[ -f "$ENV_BAT" ]] || return 0
  while IFS= read -r line; do
    line="${line%%$'\r'}"
    [[ "$line" =~ ^[[:space:]]*set[[:space:]]+\"?([A-Za-z_][A-Za-z0-9_]*)=(.*)\"?[[:space:]]*$ ]] || continue
    local key="${BASH_REMATCH[1]}"
    local val="${BASH_REMATCH[2]}"
    val="${val%\"}"
    val="${val#\"}"
    case "$key" in
      PATH) continue ;;
    esac
    export "$key=$val"
  done < "$ENV_BAT"
}

load_env_bat

winpath_to_unix() {
  local p="$1"
  p="${p//\\//}"
  if [[ "$p" =~ ^([A-Za-z]):/(.*)$ ]]; then
    echo "/${BASH_REMATCH[1],,}/${BASH_REMATCH[2]}"
  else
    echo "$p"
  fi
}

ROOT="${PROJECT_ROOT:-/d/Users/JZJ/Desktop/novel-ai-platform}"
ROOT="$(winpath_to_unix "$ROOT")"
JAVA_HOME="${JAVA_HOME:-/d/Programs/Java/jdk_21}"
JAVA_HOME="$(winpath_to_unix "$JAVA_HOME")"
export JAVA_HOME
export PATH="$JAVA_HOME/bin:/usr/bin:/bin:/usr/local/bin:${PATH:-}"
export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-dev}"
export NACOS_SERVER_ADDR="${NACOS_SERVER_ADDR:-127.0.0.1:8848}"
export NACOS_USERNAME="${NACOS_USERNAME:-nacos}"
export NACOS_PASSWORD="${NACOS_PASSWORD:-}"
export NACOS_NAMESPACE="${NACOS_NAMESPACE:-dev}"
export JAVA_OPTS="${JAVA_OPTS:--Xms256m -Xmx768m -Dfile.encoding=UTF-8}"

if ! command -v java >/dev/null 2>&1; then
  echo "[restart-dev] ERROR: java not found. JAVA_HOME=$JAVA_HOME" >&2
  exit 1
fi
JAVA_VER=$(java -version 2>&1 | while IFS= read -r line; do echo "$line"; break; done)
echo "[restart-dev] profile=$SPRING_PROFILES_ACTIVE nacos=$NACOS_SERVER_ADDR"
echo "[restart-dev] $JAVA_VER"

LOGDIR="$ROOT/.dev-logs"
mkdir -p "$LOGDIR"

PORTS=(3000 8000 8082 8090 8091)

kill_python_uvicorn() {
  echo "[restart-dev] killing uvicorn / orphan workers on :8000"
  powershell.exe -NoProfile -Command \
    "Get-CimInstance Win32_Process -Filter \"Name='python.exe'\" | Where-Object { \$_.CommandLine -match 'uvicorn' -and \$_.CommandLine -match '--port 8000' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }" \
    2>/dev/null || true
  powershell.exe -NoProfile -Command \
    "Get-CimInstance Win32_Process -Filter \"Name='python.exe'\" | Where-Object { \$_.CommandLine -match 'multiprocessing.spawn' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }" \
    2>/dev/null || true
}

kill_port() {
  local port="$1"
  local pids
  pids=$(netstat -ano 2>/dev/null | grep ":${port} " | grep LISTENING | awk '{print $NF}' | sort -u || true)
  for pid in $pids; do
    if [[ -n "$pid" && "$pid" != "0" ]]; then
      echo "  kill port ${port} pid ${pid}"
      taskkill //F //PID "$pid" >/dev/null 2>&1 || true
    fi
  done
}

wait_port_free() {
  local port="$1"
  local tries="${2:-15}"
  local i
  for ((i = 1; i <= tries; i++)); do
    if ! netstat -ano 2>/dev/null | grep -q ":${port} .*LISTENING"; then
      return 0
    fi
    sleep 1
  done
  echo "[restart-dev] WARN: port ${port} still in use after ${tries}s" >&2
  return 1
}

echo "[restart-dev] stopping services on ports: ${PORTS[*]}"
kill_python_uvicorn
for port in "${PORTS[@]}"; do
  kill_port "$port"
done
sleep 2
for port in "${PORTS[@]}"; do
  wait_port_free "$port" 10 || true
done

echo "[restart-dev] starting python-ai :8000"
wait_port_free 8000 5 || true
cd "$ROOT/python-ai"
export PYTHONIOENCODING=utf-8
export PYTHONUTF8=1
nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload \
  >"$LOGDIR/python-ai.log" 2>&1 &
sleep 5

echo "[restart-dev] starting pyai :8082"
wait_port_free 8082 5 || true
cd "$ROOT/novel-agent/agent-pyai"
nohup mvn spring-boot:run -DskipTests >"$LOGDIR/pyai.log" 2>&1 &
sleep 10

echo "[restart-dev] starting content :8091"
wait_port_free 8091 10 || true
cd "$ROOT/novel-agent/agent-content"
nohup mvn spring-boot:run -DskipTests -Dspring-boot.run.mainClass=com.novel.agent.content.NovelAgentContentApplication -Dspring-boot.run.arguments=--server.port=8091 >"$LOGDIR/content.log" 2>&1 &
sleep 5

echo "[restart-dev] starting consumer :8090"
cd "$ROOT/novel-agent/agent-consumer"
nohup mvn spring-boot:run -DskipTests -Dspring-boot.run.mainClass=com.novel.agent.consumer.NovelAgentConsumerApplication -Dspring-boot.run.arguments=--server.port=8090 >"$LOGDIR/consumer.log" 2>&1 &
sleep 5

echo "[restart-dev] starting frontend :3000"
cd "$ROOT/frontend"
export VITE_DIRECT_PYTHON=false
export VITE_REMOTE_AUTH="${VITE_REMOTE_AUTH:-http://192.168.6.24:8081}"
export VITE_LOCAL_PYAI="${VITE_LOCAL_PYAI:-http://127.0.0.1:8082}"
export VITE_LOCAL_CONTENT="${VITE_LOCAL_CONTENT:-http://127.0.0.1:8091}"
nohup npm run dev -- --host >"$LOGDIR/frontend.log" 2>&1 &

echo "[restart-dev] waiting for ports..."
for i in $(seq 1 40); do
  up=0
  for port in 8000 8082 8091 8090 3000; do
    if netstat -ano 2>/dev/null | grep -q ":${port} .*LISTENING"; then
      up=$((up + 1))
    fi
  done
  echo "  attempt ${i}: ${up}/5 listening"
  if [[ "$up" -ge 5 ]]; then
    break
  fi
  sleep 3
done

echo ""
netstat -ano 2>/dev/null | grep -E ":(3000|8000|8082|8090|8091) .*LISTENING" || true

missing=()
for port in 8000 8082 8091 8090 3000; do
  if ! netstat -ano 2>/dev/null | grep -q ":${port} .*LISTENING"; then
    missing+=("$port")
  fi
done

if ((${#missing[@]} > 0)); then
  echo ""
  echo "[restart-dev] FAILED: ports not listening: ${missing[*]}" >&2
  for svc in pyai:8082 content:8091 consumer:8090 python-ai:8000 frontend:3000; do
    name="${svc%%:*}"
    port="${svc##*:}"
    if [[ " ${missing[*]} " == *" ${port} "* ]]; then
      log="${LOGDIR}/${name}.log"
      echo "" >&2
      echo "----- tail ${log} -----" >&2
      tail -n 40 "$log" 2>/dev/null >&2 || echo "(no log)" >&2
    fi
  done
  exit 1
fi

echo ""
echo "[restart-dev] OK: 3000 8000 8082 8090 8091 all listening. logs: ${LOGDIR}"
