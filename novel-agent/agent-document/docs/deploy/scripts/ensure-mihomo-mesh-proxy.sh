#!/usr/bin/env bash
# 确保 Worker Mihomo 对 WireGuard 内网开放，并验证 MW/CN 可走代理加速
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_deploy-lib.sh"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/../docker/.env.split"

WORKER_SSH="${WORKER_SSH:-root@${WORKER_HOST}}"
MW_SSH="${MW_SSH:-root@${MW_HOST}}"
CN_HOST="${CN_HOST:-118.89.123.201}"
WORKER_WG_IP="${WORKER_WG_IP:-10.66.0.3}"
PROXY="http://${WORKER_WG_IP}:7890"

log() { echo "[$(date '+%H:%M:%S')] [mihomo-mesh] $*"; }

log "1/4 Worker: 检查 mihomo 服务 ..."
deploy_ssh "$WORKER_SSH" bash -s <<'REMOTE'
set -eu
if ! systemctl is-active mihomo >/dev/null 2>&1; then
  echo "WARN: mihomo 未运行，尝试启动 ..."
  systemctl start mihomo || true
fi
if [[ -f /etc/mihomo/config.yaml ]]; then
  python3 - <<'PY' 2>/dev/null || true
import re
from pathlib import Path
p = Path("/etc/mihomo/config.yaml")
t = p.read_text(encoding="utf-8")
t = t.replace("allow-lan: false", "allow-lan: true")
if "bind-address:" not in t:
    t = t.replace("allow-lan: true", 'allow-lan: true\nbind-address: "*"', 1)
t = re.sub(r"^bind-address:.*\n", 'bind-address: "*"\n', t, count=1, flags=re.M)
p.write_text(t, encoding="utf-8")
print("config patched")
PY
  systemctl restart mihomo
  sleep 2
fi
systemctl is-active mihomo
ss -tlnp | grep 7890 || { echo "ERROR: 7890 未监听"; exit 1; }
curl -fsS -x http://127.0.0.1:7890 --max-time 15 https://api.ip.sb/ip && echo " worker-local OK"
REMOTE

log "2/4 MW: 经 Worker 代理探测 ($PROXY) ..."
deploy_ssh "$MW_SSH" bash -s <<REMOTE
set -eu
PROXY="$PROXY"
curl -fsS -x "\$PROXY" --max-time 20 https://api.ip.sb/ip && echo " MW-via-worker OK"
REMOTE

log "3/4 CN: 经 Worker 代理探测 ($PROXY) ..."
deploy_ssh "$MW_SSH" ssh -o BatchMode=yes "root@${CN_HOST}" bash -s <<REMOTE
set -eu
PROXY="$PROXY"
command -v nc >/dev/null || (apt-get update -qq && apt-get install -y -qq netcat-openbsd >/dev/null)
curl -fsS -x "\$PROXY" --max-time 25 https://api.ip.sb/ip && echo " CN-via-worker OK"
REMOTE

log "4/4 完成 — 部署脚本将自动 source mesh-proxy-env.sh 走此代理"
log "Worker 本地: http://127.0.0.1:7890 | 内网: $PROXY"
