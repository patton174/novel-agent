#!/usr/bin/env bash
# Worker 安装 Mihomo (Clash Meta) 作为本地 HTTP/SOCKS 网关
# 用法:
#   bash setup-mihomo-worker.sh
#   bash /opt/clash/import-sub.sh 'https://your-subscription-url'

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "${SCRIPT_DIR}/_cn-mirrors.sh"

MIHOMO_BIN=/usr/local/bin/mihomo
CONF_DIR=/etc/mihomo
SERVICE=/etc/systemd/system/mihomo.service
IMPORT=/opt/clash/import-sub.sh

install_mihomo() {
  if [ -x "$MIHOMO_BIN" ]; then
    echo "mihomo already installed"
    return
  fi
  echo "Installing mihomo..."
  tmp=$(mktemp)
  ver=v1.19.12
  ok=0
  while IFS= read -r url; do
    [[ -n "$url" ]] || continue
    echo "  try: $url"
    if curl -fSL --connect-timeout 25 --retry 2 -o "${tmp}.gz" "$url"; then
      ok=1
      break
    fi
  done < <(mihomo_release_urls "$ver")
  if [[ "$ok" -ne 1 ]]; then
    echo "  GitHub 下载失败，尝试从 Worker 拷贝 ..."
    for host in 10.66.0.3 47.80.80.224; do
      if scp -o BatchMode=yes -o ConnectTimeout=10 "root@${host}:/usr/local/bin/mihomo" "$tmp" 2>/dev/null; then
        ok=1
        break
      fi
    done
  fi
  if [[ "$ok" -ne 1 ]]; then
    echo "ERROR: 无法安装 mihomo（GitHub SSL/网络失败，Worker 也无法 scp）" >&2
    rm -f "$tmp" "${tmp}.gz"
    exit 1
  fi
  if [[ -f "${tmp}.gz" ]]; then
    gunzip -f "${tmp}.gz"
  fi
  install -m 755 "$tmp" "$MIHOMO_BIN"
  rm -f "$tmp"
  echo "installed: $($MIHOMO_BIN -v || true)"
}

write_default_config() {
  mkdir -p "$CONF_DIR"
  if [ -f "$CONF_DIR/config.yaml" ]; then
    return
  fi
  cat > "$CONF_DIR/config.yaml" <<'YAML'
mixed-port: 7890
allow-lan: true
bind-address: "0.0.0.0"
mode: rule
log-level: info
external-controller: 127.0.0.1:9090
proxies: []
proxy-groups:
  - name: PROXY
    type: select
    proxies:
      - DIRECT
rules:
  - MATCH,DIRECT
YAML
}

write_import_script() {
  mkdir -p /opt/clash
  cat > "$IMPORT" <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail
SUB_URL="${1:-}"
if [ -z "$SUB_URL" ]; then
  echo "Usage: $0 <clash_subscription_url>"
  echo "  或从 Worker 拷配置: $0 --from-worker"
  exit 1
fi
CONF=/etc/mihomo/config.yaml
TMP=$(mktemp)

fetch_sub() {
  local url="$1" out="$2"
  local ua
  for ua in \
    "ClashforWindows/0.20.39" \
    "clash-verge/v1.4.7" \
    "ClashMeta/1.19.0" \
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"; do
    echo "  try User-Agent: $ua"
    if curl -fsSL -A "$ua" -H "Accept: */*" --connect-timeout 30 --retry 1 "$url" -o "$out"; then
      return 0
    fi
  done
  return 1
}

if [[ "$SUB_URL" == "--from-worker" ]]; then
  for host in 10.66.0.3 47.80.80.224; do
    echo "  scp from root@${host}:/etc/mihomo/config.yaml ..."
    if scp -o BatchMode=yes -o ConnectTimeout=15 "root@${host}:/etc/mihomo/config.yaml" "$CONF" 2>/dev/null; then
      systemctl restart mihomo && sleep 2
      curl -fsS -x http://127.0.0.1:7890 --max-time 15 https://api.ip.sb/ip && echo " proxy OK"
      exit 0
    fi
  done
  echo "ERROR: 无法从 Worker 拷贝 config.yaml" >&2
  exit 1
fi

fetch_sub "$SUB_URL" "$TMP" || {
  echo "ERROR: 订阅下载失败 (403/网络)。可尝试:" >&2
  echo "  bash $0 --from-worker   # 从 Worker 复制已导入的配置" >&2
  exit 1
}
# 部分订阅为 base64 单行
if ! grep -qE '^(mixed-port|port|proxies):' "$TMP" 2>/dev/null; then
  if base64 -d "$TMP" > "${TMP}.yaml" 2>/dev/null; then
    mv "${TMP}.yaml" "$TMP"
  fi
fi
if ! grep -q '^mixed-port:' "$TMP" 2>/dev/null; then
  {
    echo 'mixed-port: 7890'
    echo 'allow-lan: true'
    echo 'bind-address: "0.0.0.0"'
    echo 'external-controller: 127.0.0.1:9090'
    cat "$TMP"
  } > "${TMP}.merged"
  mv "${TMP}.merged" "$TMP"
fi
cp "$TMP" "$CONF"
rm -f "$TMP"
systemctl restart mihomo
sleep 2
systemctl is-active mihomo
echo "Test egress IP:"
curl -fsS -x http://127.0.0.1:7890 --max-time 15 https://api.ip.sb/ip || echo "proxy test failed"
SCRIPT
  chmod +x "$IMPORT"
}

write_systemd() {
  cat > "$SERVICE" <<'UNIT'
[Unit]
Description=Mihomo (Clash Meta) proxy gateway
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/mihomo -d /etc/mihomo
Restart=on-failure
RestartSec=3
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
UNIT
  systemctl daemon-reload
  systemctl enable mihomo
  systemctl restart mihomo
}

main() {
  install_mihomo
  write_default_config
  write_import_script
  write_systemd
  sleep 1
  systemctl status mihomo --no-pager | head -10 || true
  ss -tlnp | grep -E '7890|9090' || true
  echo
  echo "Next: bash $IMPORT '<your_clash_subscription_url>'"
  echo "Then set python-ai/.env: CRAWL_HTTP_PROXY=http://172.24.0.1:7890"
}

main "$@"
