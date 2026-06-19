#!/usr/bin/env bash
# 导入 Clash 订阅到本机 mihomo
#   bash import-clash-sub.sh 'https://订阅链接'
#   bash import-clash-sub.sh --from-worker
#   bash import-clash-sub.sh --refresh   # 用仓库最新逻辑重写 /opt/clash/import-sub.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF=/etc/mihomo/config.yaml

refresh_import_script() {
  bash "$SCRIPT_DIR/setup-mihomo-worker.sh" >/dev/null 2>&1 || true
  # setup-mihomo-worker 会重写 /opt/clash/import-sub.sh
  if [[ "${1:-}" == "--refresh-only" ]]; then
    echo "已刷新 /opt/clash/import-sub.sh"
    exit 0
  fi
}

from_worker() {
  for host in 10.66.0.3 47.80.80.224; do
    echo "scp root@${host}:/etc/mihomo/config.yaml → ${CONF}"
    if scp -o BatchMode=yes -o ConnectTimeout=15 "root@${host}:${CONF}" "$CONF"; then
      systemctl restart mihomo
      sleep 2
      systemctl is-active mihomo
      curl -fsS -x http://127.0.0.1:7890 --max-time 15 https://api.ip.sb/ip && echo " proxy OK"
      return 0
    fi
  done
  echo "ERROR: 无法从 Worker 拷贝 config.yaml（检查 MW→Worker→CN SSH）" >&2
  return 1
}

fetch_sub() {
  local url="$1"
  local tmp
  tmp="$(mktemp)"
  local ua
  for ua in \
    "ClashforWindows/0.20.39" \
    "clash-verge/v1.4.7" \
    "ClashMeta/1.19.0"; do
    echo "try User-Agent: $ua"
    if curl -fsSL -A "$ua" -H "Accept: */*" --connect-timeout 30 "$url" -o "$tmp"; then
      if ! grep -qE '^(mixed-port|port|proxies):' "$tmp" 2>/dev/null; then
        base64 -d "$tmp" > "${tmp}.yaml" 2>/dev/null && mv "${tmp}.yaml" "$tmp" || true
      fi
      if ! grep -q '^mixed-port:' "$tmp" 2>/dev/null; then
        { echo 'mixed-port: 7890'; echo 'allow-lan: true'; echo 'bind-address: "0.0.0.0"'; cat "$tmp"; } > "${tmp}.m"
        mv "${tmp}.m" "$tmp"
      fi
      cp "$tmp" "$CONF"
      rm -f "$tmp"
      systemctl restart mihomo && sleep 2
      curl -fsS -x http://127.0.0.1:7890 --max-time 15 https://api.ip.sb/ip && echo " proxy OK"
      return 0
    fi
  done
  rm -f "$tmp"
  echo "ERROR: 订阅 403/失败。云服务器 IP 常被机场封禁，请用: bash $0 --from-worker" >&2
  return 1
}

case "${1:-}" in
  --refresh|--refresh-only)
    refresh_import_script "${1}"
    ;;
  --from-worker)
    from_worker
    ;;
  "")
    echo "用法: $0 <订阅URL> | --from-worker | --refresh"
    exit 1
    ;;
  *)
    fetch_sub "$1"
    ;;
esac
