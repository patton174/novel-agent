# Pull Worker/MW env from production and restart local dev stack
# Usage: powershell -ExecutionPolicy Bypass -File scripts\sync-local-env-from-server.ps1

param(
    [string]$WorkerHost = "47.80.80.224",
    [string]$WorkerUser = "root",
    [switch]$SkipRestart
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$remotePyAi = "/opt/novel-agent/python-ai/.env"
$remoteWorker = "/opt/novel-agent/novel-studio/deploy/docker/.env.worker"
$localPyAi = Join-Path $Root "python-ai\.env"
$localRemote = Join-Path $Root "scripts\local-remote.env"
$tmpPyAi = Join-Path $env:TEMP "novel-agent-pyai.env"
$tmpWorker = Join-Path $env:TEMP "novel-agent-worker.env"

Write-Host "=== Sync env from ${WorkerUser}@${WorkerHost} ===" -ForegroundColor Cyan

scp -o BatchMode=yes "${WorkerUser}@${WorkerHost}:${remotePyAi}" $tmpPyAi
scp -o BatchMode=yes "${WorkerUser}@${WorkerHost}:${remoteWorker}" $tmpWorker

function Set-EnvLine([hashtable]$map, [string]$key, [string]$value) {
    $map[$key] = $value
}

function Resolve-PublicMwHost([string]$HostValue, [string]$MwHost) {
    if (-not $HostValue) { return $MwHost }
    if ($HostValue -match '^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)') { return $MwHost }
    return $HostValue
}

function Parse-DotEnv([string]$path) {
    $map = @{}
    Get-Content $path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }
        $idx = $line.IndexOf("=")
        if ($idx -lt 1) { return }
        $k = $line.Substring(0, $idx).Trim()
        $v = $line.Substring($idx + 1).Trim()
        $map[$k] = $v
    }
    return $map
}

function Write-DotEnv([string]$path, [hashtable]$map, [string[]]$keyOrder) {
    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add("# synced from server $(Get-Date -Format 'yyyy-MM-dd HH:mm') — do not commit")
    foreach ($k in $keyOrder) {
        if ($map.ContainsKey($k)) {
            $lines.Add("$k=$($map[$k])")
        }
    }
    foreach ($k in ($map.Keys | Sort-Object)) {
        if ($keyOrder -contains $k) { continue }
        $lines.Add("$k=$($map[$k])")
    }
    $lines | Set-Content -Path $path -Encoding UTF8
}

$py = Parse-DotEnv $tmpPyAi
$py["CONTENT_BASE_URL"] = "http://127.0.0.1:8080"
$py["BILLING_REPORT_URL"] = "http://127.0.0.1:8080"
$py["BILLING_REPORT_ENABLED"] = "false"
$py["AGENT_ALLOW_DIRECT_STREAM"] = "true"
$py["CRAWL_ORCHESTRATOR_ENABLED"] = "false"
if ($py.ContainsKey("INTERNAL_SERVICE_KEY") -and $py["INTERNAL_SERVICE_KEY"]) {
    # keep server key
} elseif ($py.ContainsKey("AGENT_INTERNAL_SERVICE_KEY")) {
    $py["INTERNAL_SERVICE_KEY"] = $py["AGENT_INTERNAL_SERVICE_KEY"]
}

Write-DotEnv $localPyAi $py @(
    "ACTIVE_PROVIDER", "LLM_PROTOCOL", "OPENAI_API_KEY", "OPENAI_BASE_URL", "OPENAI_MODEL",
    "CONTENT_BASE_URL", "INTERNAL_SERVICE_KEY", "AGENT_ALLOW_DIRECT_STREAM", "LOG_LEVEL"
)
Write-Host "[ok] python-ai\.env" -ForegroundColor Green

$w = Parse-DotEnv $tmpWorker
$remote = @{}
if ($w["DB_HOST"]) { $remote["DB_HOST"] = $w["DB_HOST"] }
elseif ($w["SPRING_DATASOURCE_URL"] -match "postgresql://([^:/]+)") { $remote["DB_HOST"] = $matches[1] }
$remote["DB_PORT"] = if ($w["DB_PORT"]) { $w["DB_PORT"] } else { "5432" }
$remote["DB_NAME"] = if ($w["DB_NAME"]) { $w["DB_NAME"] } else { "novel_agent" }
$remote["DB_USER"] = if ($w["DB_USER"]) { $w["DB_USER"] } elseif ($w["SPRING_DATASOURCE_USERNAME"]) { $w["SPRING_DATASOURCE_USERNAME"] } else { "postgres" }
$remote["DB_PASSWORD"] = if ($w["DB_PASSWORD"]) { $w["DB_PASSWORD"] } else { $w["SPRING_DATASOURCE_PASSWORD"] }
$remote["REDIS_HOST"] = if ($w["REDIS_HOST"]) { $w["REDIS_HOST"] } else { $w["SPRING_DATA_REDIS_HOST"] }
$remote["REDIS_PORT"] = if ($w["REDIS_PORT"]) { $w["REDIS_PORT"] } else { "6379" }
$remote["REDIS_PASSWORD"] = if ($w["REDIS_PASSWORD"]) { $w["REDIS_PASSWORD"] } else { $w["SPRING_DATA_REDIS_PASSWORD"] }
$remote["RABBITMQ_HOST"] = if ($w["RABBITMQ_HOST"]) { $w["RABBITMQ_HOST"] } else { $w["SPRING_RABBITMQ_HOST"] }
$remote["RABBITMQ_PORT"] = if ($w["RABBITMQ_PORT"]) { $w["RABBITMQ_PORT"] } else { "5672" }
$remote["RABBITMQ_USER"] = if ($w["RABBITMQ_USER"]) { $w["RABBITMQ_USER"] } else { $w["SPRING_RABBITMQ_USERNAME"] }
$remote["RABBITMQ_PASSWORD"] = if ($w["RABBITMQ_PASSWORD"]) { $w["RABBITMQ_PASSWORD"] } else { $w["SPRING_RABBITMQ_PASSWORD"] }
if ($w["AGENT_INTERNAL_SERVICE_KEY"]) { $remote["AGENT_INTERNAL_SERVICE_KEY"] = $w["AGENT_INTERNAL_SERVICE_KEY"] }
if ($w["JWT_SECRET"]) { $remote["JWT_SECRET"] = $w["JWT_SECRET"] }
$remote["MW_HOST"] = if ($w["MW_HOST"]) { $w["MW_HOST"] } else { "107.150.112.140" }
$mw = $remote["MW_HOST"]
$remote["DB_HOST"] = Resolve-PublicMwHost $remote["DB_HOST"] $mw
$remote["REDIS_HOST"] = Resolve-PublicMwHost $remote["REDIS_HOST"] $mw
$remote["RABBITMQ_HOST"] = Resolve-PublicMwHost $remote["RABBITMQ_HOST"] $mw
$remote["MILVUS_HOST"] = $mw
$remote["MILVUS_PORT"] = "19530"
# 本地 Java 直连本机 python-ai，勿用 Worker Docker 内网 python-lb
$remote["PYTHON_AI_BASE_URL"] = "http://127.0.0.1:8000"

Write-DotEnv $localRemote $remote @(
    "MW_HOST", "DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD",
    "REDIS_HOST", "REDIS_PORT", "REDIS_PASSWORD",
    "RABBITMQ_HOST", "RABBITMQ_PORT", "RABBITMQ_USER", "RABBITMQ_PASSWORD",
    "AGENT_INTERNAL_SERVICE_KEY", "MILVUS_HOST", "MILVUS_PORT"
)
Write-Host "[ok] scripts\local-remote.env" -ForegroundColor Green

Remove-Item $tmpPyAi, $tmpWorker -Force -ErrorAction SilentlyContinue

if (-not $SkipRestart) {
    Write-Host "`n=== Restart local dev stack ===" -ForegroundColor Cyan
    Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
        Where-Object { $_.LocalPort -in 8080, 8000, 3000 } |
        ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 2
    & "$Root\scripts\start-local-dev.ps1" -Remote
}
