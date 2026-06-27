param(
    [switch]$Rebuild
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
. "$PSScriptRoot\_dev-ports.ps1"

Write-Host "=== Stop existing dev listeners ===" -ForegroundColor Yellow
Stop-DevPortListener -Port 8080 -Label "novel-studio"
Stop-DevPortListener -Port 8000 -Label "python-ai"
Stop-DevPortListener -Port 3000 -Label "frontend"
Start-Sleep -Seconds 1

Write-Host "`n=== Apply CN PostgreSQL migrations ===" -ForegroundColor Cyan
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

if ($Rebuild) {
    & "$Root\scripts\start-local-dev.ps1" -Cn -Services "novel,pyai,frontend" -Rebuild
} else {
    & "$Root\scripts\start-local-dev.ps1" -Cn -Services "novel,pyai,frontend" -SkipBuild
}
