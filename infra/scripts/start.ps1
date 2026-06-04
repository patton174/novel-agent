# 启动 Novel Agent 本地基础设施（Windows PowerShell）
$ErrorActionPreference = "Stop"
$InfraRoot = Split-Path -Parent $PSScriptRoot
Set-Location $InfraRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "未找到 docker 命令。请先安装并启动 Docker Desktop。"
}

$dockerInfo = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker 未运行。请打开 Docker Desktop 后重试。"
}

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "[infra] 已创建 .env（来自 .env.example）"
}

Write-Host "[infra] 启动 PostgreSQL / Redis / RabbitMQ ..."
docker compose up -d
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
docker compose ps
Write-Host ""
Write-Host "RabbitMQ 管理台: http://localhost:15672  (guest/guest，若未改 .env)"
Write-Host "检查连通: cd ..\novel-agent; python scripts\check_local_infra.py"
