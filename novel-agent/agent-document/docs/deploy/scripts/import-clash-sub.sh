#!/usr/bin/env bash
# 导入 Clash 订阅到本机 mihomo（Clash UA，403 时可 --from-worker）
# 用法:
#   bash import-clash-sub.sh 'https://订阅链接'
#   bash import-clash-sub.sh --from-worker
set -euo pipefail

IMPORT=/opt/clash/import-sub.sh
if [[ -x "$IMPORT" ]]; then
  exec bash "$IMPORT" "$@"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$SCRIPT_DIR/setup-mihomo-cn.sh"
exec bash "$IMPORT" "$@"
