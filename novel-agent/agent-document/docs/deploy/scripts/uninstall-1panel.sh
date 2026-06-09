#!/usr/bin/env bash
# 卸载 1Panel 面板进程以释放内存
# - Worker：无 1Panel 应用，可完整卸载
# - MW：PG/Redis/RabbitMQ 数据在 /opt/1panel/apps/，仅停面板服务，不删数据目录
set -eu

ROLE="${1:?用法: uninstall-1panel.sh <mw|worker>}"

stop_panel() {
  systemctl stop 1panel 2>/dev/null || 1pctl stop 2>/dev/null || true
  systemctl disable 1panel 2>/dev/null || true
  echo "[1panel] 面板服务已停止并禁用"
}

case "$ROLE" in
  worker)
    echo "[1panel] Worker：完整卸载（无中间件依赖）"
    stop_panel
    if command -v 1pctl >/dev/null 2>&1; then
      yes yes | 1pctl uninstall 2>/dev/null || 1pctl uninstall <<< "yes" 2>/dev/null || true
    fi
    rm -rf /usr/local/bin/1pctl /usr/bin/1panel 2>/dev/null || true
    rm -rf /opt/1panel 2>/dev/null || true
    systemctl daemon-reload
    free -h
    echo WORKER_1PANEL_REMOVED
    ;;
  mw)
    echo "[1panel] MW：仅停面板（保留 /opt/1panel/apps 内 PG/Redis/RabbitMQ 数据）"
    stop_panel
    # 确认中间件容器仍在跑
    for c in 1Panel-postgresql-ow0K 1Panel-redis-8rIx 1Panel-rabbitmq-yaNR nacos-standalone; do
      if docker ps --format '{{.Names}}' | grep -qx "$c"; then
        echo "[1panel] OK: $c running"
      else
        echo "[1panel] WARN: $c not running" >&2
      fi
    done
    ps aux | grep '[1]panel' || echo "[1panel] 无 1panel 进程"
    free -h
    echo MW_1PANEL_STOPPED_DATA_KEPT
    ;;
  *)
    echo "未知角色: $ROLE" >&2
    exit 1
    ;;
esac
