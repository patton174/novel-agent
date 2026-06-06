#!/usr/bin/env bash
# =============================================================================
# [已废弃 DEPRECATED — 2026-06-05]
#
# 本脚本曾用于本地启动 Python / PyAI / Content / Consumer / Frontend。
# 现已废弃：env.bat 指向生产 Nacos/MQ，本地 Consumer 会与线上 Worker 抢
# agent.run.dispatch.queue，导致 www.novel-agent.cn Agent 无响应。
#
# 验收与日常使用请直接访问线上：https://www.novel-agent.cn
# 代码改动后通过 CI / deploy-fast.sh 部署到 Worker。
#
# 若确需本地调试，请单独手动启动所需服务，且勿连生产 RabbitMQ（107.150.112.140:5672）。
# =============================================================================
set -euo pipefail

echo "[restart-dev.sh] 已废弃，不再启动本地开发栈。" >&2
echo "  原因：连生产 MQ 时本地 Consumer 会抢走线上 Agent dispatch 消息。" >&2
echo "  请使用线上环境验收，或通过 CI 部署。" >&2
exit 1
