#!/usr/bin/env bash
# 国内 CN 机安装本机 Mihomo(Clash)，供 docker build / patchright 下载走本地代理
# 在 CN 上: bash setup-mihomo-cn.sh
# 导入订阅: bash /opt/clash/import-sub.sh 'https://你的订阅链接'
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$SCRIPT_DIR/setup-mihomo-worker.sh"

# 允许 Docker 构建容器经宿主机网关访问 7890
if [[ -f /etc/mihomo/config.yaml ]]; then
  python3 "$SCRIPT_DIR/patch-mihomo-config.py" 2>/dev/null || true
  systemctl restart mihomo
  sleep 2
fi

GW="$(docker network inspect bridge -f '{{(index .IPAM.Config 0).Gateway}}' 2>/dev/null || echo '172.17.0.1')"
echo ""
echo "===== CN 本机 Clash 就绪 ====="
echo "  本机测试:  curl -x http://127.0.0.1:7890 https://api.ip.sb/ip"
echo "  Docker build 用: http://${GW}:7890  （构建容器访问宿主机 Clash）"
echo "  导入节点: bash /opt/clash/import-sub.sh '<订阅URL>'"
echo "  然后构建: bash $SCRIPT_DIR/deploy-cn-build-local.sh"
