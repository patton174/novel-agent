#!/usr/bin/env bash
# Worker 安装 Mihomo (Clash Meta) 作为本地 HTTP/SOCKS 网关
# 用法:
#   bash setup-mihomo-worker.sh
#   bash /opt/clash/import-sub.sh 'https://your-subscription-url'

set -euo pipefail

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
  curl -fsSL -o "${tmp}.gz" "https://github.com/MetaCubeX/mihomo/releases/download/${ver}/mihomo-linux-amd64-${ver}.gz"
  gunzip -f "${tmp}.gz"
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
  exit 1
fi
CONF=/etc/mihomo/config.yaml
TMP=$(mktemp)
curl -fsSL "$SUB_URL" -o "$TMP"
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
