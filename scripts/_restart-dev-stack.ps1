$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Stop-ListenerOnPort([int]$Port) {
    $conns = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    if (-not $conns) {
        Write-Host "Port ${Port}: free"
        return
    }
    foreach ($procId in ($conns | Select-Object -ExpandProperty OwningProcess -Unique)) {
        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
        $name = if ($proc) { $proc.ProcessName } else { "?" }
        Write-Host "Stopping PID $procId ($name) on :$Port"
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "=== Stop existing dev listeners ===" -ForegroundColor Yellow
Stop-ListenerOnPort 8080
Stop-ListenerOnPort 8000
Stop-ListenerOnPort 3000
Start-Sleep -Seconds 2

Write-Host "`n=== Apply CN PostgreSQL migrations (V18-V23) ===" -ForegroundColor Cyan
$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py) { $py = Get-Command py -ErrorAction SilentlyContinue }
if ($py) {
    & $py.Source "$Root\scripts\_apply_cn_schema_migrations.py"
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "CN schema migration script exited with code $LASTEXITCODE (check scripts\local-cn.env and DB connectivity)"
    }
} else {
    Write-Warning "Python not found; skip CN schema migrations"
}

& "$Root\scripts\start-local-dev.ps1" -Cn -Services "novel,pyai,frontend"
