# Windows Server 2019+：原生安装 PG / Redis / RabbitMQ（无 Docker Desktop）
# 必须以管理员身份运行 PowerShell
$ErrorActionPreference = "Stop"

function Test-IsAdmin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $p = New-Object Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-OsCaption {
    (Get-CimInstance Win32_OperatingSystem).Caption
}

Write-Host "=== Novel Agent 基础设施（Windows Server 原生） ===" -ForegroundColor Cyan
Write-Host (Get-OsCaption)

if (-not (Test-IsAdmin)) {
    Write-Warning "请右键 PowerShell -> 以管理员身份运行，否则 Chocolatey 安装可能失败。"
}

$choco = Get-Command choco -ErrorAction SilentlyContinue
if (-not $choco) {
    Write-Host ""
    Write-Host "[提示] 未检测到 Chocolatey。" -ForegroundColor Yellow
    Write-Host "请按 infra\README-WINDOWS-SERVER-2019.md 手动安装 PostgreSQL / Memurai(Redis) / RabbitMQ。"
    Write-Host "或先安装 Chocolatey: https://chocolatey.org/install"
    exit 1
}

Write-Host ""
Write-Host "将使用 Chocolatey 安装（可能需几分钟）..." -ForegroundColor Green
Write-Host "  - PostgreSQL"
Write-Host "  - redis-64"
Write-Host "  - rabbitmq (含 Erlang)"
Write-Host ""

choco install postgresql16 --params '/Password:changeme' -y --no-progress
choco install redis-64 -y --no-progress
choco install rabbitmq -y --no-progress

Write-Host ""
Write-Host "=== 安装包已执行，请完成以下手动步骤 ===" -ForegroundColor Cyan
Write-Host "1. PostgreSQL: 创建数据库 novel_agent（pgAdmin 或 psql）"
Write-Host "2. Redis: 若需密码 changeme ，编辑 redis.windows-service.conf 的 requirepass 并重启 Redis 服务"
Write-Host "3. RabbitMQ: 在 sbin 目录执行:"
Write-Host '   rabbitmq-plugins enable rabbitmq_management'
Write-Host '   rabbitmq-service start'
Write-Host "4. 管理台: http://localhost:15672  (guest/guest)"
Write-Host ""
Write-Host "验证: cd novel-agent; python scripts\check_local_infra.py"
