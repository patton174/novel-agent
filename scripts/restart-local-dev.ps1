# Force-restart local dev stack (stop ports then start-local-dev.ps1)
param(
    [switch]$SkipBuild,
    [switch]$Remote = $true
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Stop-ListenerOnPort([int]$Port, [string]$Label) {
    $conns = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    if (-not $conns) { return }
    $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $pids) {
        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
        Write-Host "[$Label] stopping PID $procId ($($proc.ProcessName)) on :$Port" -ForegroundColor Yellow
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 1
}

Write-Host "=== Stop existing listeners ===" -ForegroundColor Cyan
Stop-ListenerOnPort 8080 "novel-studio"
Stop-ListenerOnPort 8000 "python-ai"
# uvicorn --reload leaves orphan multiprocessing children after parent exit
Get-Process python* -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -like "*Python*" } |
    ForEach-Object {
        Write-Host "[python-ai] stopping orphan PID $($_.Id)" -ForegroundColor Yellow
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
Stop-ListenerOnPort 3000 "frontend"
Start-Sleep -Seconds 2

$args = @("-ExecutionPolicy", "Bypass", "-File", "$Root\scripts\start-local-dev.ps1")
if ($Remote) { $args += "-Remote" }
if ($SkipBuild) { $args += "-SkipBuild" }
& powershell @args
