# 停止 Novel Agent 本地基础设施
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)
docker compose down
Write-Host "[infra] 已停止（数据卷保留，下次 up 数据仍在）"
