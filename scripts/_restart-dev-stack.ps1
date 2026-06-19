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

& "$Root\scripts\start-local-dev.ps1" -Cn -Services "novel,pyai,frontend"
