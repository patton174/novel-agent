# Pull MW middleware credentials + Worker secrets into scripts/local-remote.env.
# Redis password: running container --requirepass (1Panel .env may be stale).
# PG/MQ: Worker .env.worker first (production truth), 1Panel as fallback.
# Usage: powershell -ExecutionPolicy Bypass -File scripts\pull-local-remote-env.ps1 [-SyncPythonAi]
param(
    [string]$MwHost = "107.150.112.140",
    [string]$WorkerHost = "47.80.80.224",
    [string]$WorkerEnvPath = "/opt/novel-agent/novel-studio/deploy/docker/.env.worker",
    [string]$MwRedisEnv = "/opt/1panel/apps/redis/redis/.env",
    [string]$MwPgEnv = "/opt/1panel/apps/postgresql/postgresql/.env",
    [string]$MwMqEnv = "/opt/1panel/apps/rabbitmq/rabbitmq/.env",
    [switch]$SyncPythonAi
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Out = Join-Path $Root "scripts\local-remote.env"

function Parse-DotEnv([string[]]$Lines) {
    $map = @{}
    foreach ($line in $Lines) {
        $t = $line.Trim()
        if (-not $t -or $t.StartsWith("#")) { continue }
        $idx = $t.IndexOf("=")
        if ($idx -lt 1) { continue }
        $map[$t.Substring(0, $idx).Trim()] = $t.Substring($idx + 1).Trim()
    }
    return $map
}

function Get-Val($map, [string[]]$Keys) {
    foreach ($k in $Keys) {
        if ($map.ContainsKey($k) -and $map[$k]) { return $map[$k] }
    }
    return ""
}

function Invoke-Ssh([string]$SshHost, [string]$Command) {
    # ssh 会把 post-quantum key exchange 等告警写到 stderr；Windows PowerShell 在
    # ErrorActionPreference=Stop 下会把原生命令的 stderr 当作终止错误，导致整个脚本中断。
    # 放宽本地策略并丢弃 stderr（仅以 $LASTEXITCODE 判定真正的失败）。
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $raw = ssh -o ConnectTimeout=15 -o BatchMode=yes "root@$SshHost" $Command 2>$null
        if ($LASTEXITCODE -ne 0) { throw "ssh failed for ${SshHost}: $Command" }
        return ($raw | Out-String).Trim()
    } finally {
        $ErrorActionPreference = $prev
    }
}

function Fetch-RemoteEnv([string]$SshHost, [string]$Path) {
    if (-not $Path) { return @{} }
    Write-Host "[pull] ${SshHost}:$Path" -ForegroundColor DarkCyan
    $raw = Invoke-Ssh $SshHost "test -f '$Path' && cat '$Path' || true"
    return Parse-DotEnv ($raw -split "`n")
}

function Get-RunningRedisPassword([string]$SshHost) {
    Write-Host "[pull] ${SshHost}: running redis container requirepass" -ForegroundColor DarkCyan
    $cmd = 'docker inspect $(docker ps --format "{{.Names}}" | grep 1Panel-redis | head -1) --format "{{index .Config.Cmd 3}}"'
    try {
        $pw = (Invoke-Ssh $SshHost $cmd)
        if ($pw -match '^(redis-server|/etc/)') { return "" }
        return $pw
    } catch {
        Write-Warning "Could not read running Redis password: $_"
        return ""
    }
}

function Update-PythonAiEnv([string]$LocalRemotePath) {
    $pyEnv = Join-Path $Root "python-ai\.env"
    if (-not (Test-Path $pyEnv)) {
        Copy-Item (Join-Path $Root "python-ai\.env.example") $pyEnv
    }
    $remote = Parse-DotEnv (Get-Content $LocalRemotePath)
    $lines = Get-Content $pyEnv
    $updates = @{
        "CONTENT_BASE_URL" = "http://127.0.0.1:8080"
        "BILLING_REPORT_URL" = "http://127.0.0.1:8080"
        "BILLING_REPORT_ENABLED" = "false"
        "AGENT_ALLOW_DIRECT_STREAM" = "true"
        "CRAWL_ORCHESTRATOR_ENABLED" = "false"
        "KG_ENABLED" = "true"
    }
    if ($remote["AGENT_INTERNAL_SERVICE_KEY"]) {
        $updates["INTERNAL_SERVICE_KEY"] = $remote["AGENT_INTERNAL_SERVICE_KEY"]
    }
    if ($remote["MILVUS_HOST"]) { $updates["MILVUS_HOST"] = $remote["MILVUS_HOST"] }
    if ($remote["MILVUS_PORT"]) { $updates["MILVUS_PORT"] = $remote["MILVUS_PORT"] }

    $seen = @{}
    $out = New-Object System.Collections.Generic.List[string]
    foreach ($line in $lines) {
        $t = $line.Trim()
        if ($t -match '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
            $key = $matches[1]
            if ($updates.ContainsKey($key)) {
                $out.Add("$key=$($updates[$key])")
                $seen[$key] = $true
                continue
            }
        }
        $out.Add($line)
    }
    foreach ($kv in $updates.GetEnumerator()) {
        if (-not $seen.ContainsKey($kv.Key)) {
            $out.Add("$($kv.Key)=$($kv.Value)")
        }
    }
    Set-Content -Path $pyEnv -Value $out -Encoding UTF8
    Write-Host "[pull] synced python-ai\.env (INTERNAL_SERVICE_KEY / MILVUS / local URLs)" -ForegroundColor Green
}

Write-Host "=== Pull MW runtime + Worker env ===" -ForegroundColor Cyan

$mwRedis = Fetch-RemoteEnv $MwHost $MwRedisEnv
$mwPg = Fetch-RemoteEnv $MwHost $MwPgEnv
$mwMq = Fetch-RemoteEnv $MwHost $MwMqEnv
$mwInfra = Fetch-RemoteEnv $MwHost "/opt/novel-agent/novel-studio/deploy/docker/.env.infra"
$worker = Fetch-RemoteEnv $WorkerHost $WorkerEnvPath

$dbUser = Get-Val $mwInfra @("DB_USER")
if (-not $dbUser) { $dbUser = Get-Val $worker @("DB_USER") }
if (-not $dbUser) { $dbUser = Get-Val $mwPg @("PANEL_DB_ROOT_USER") }
if (-not $dbUser) { $dbUser = "postgres" }

$dbPassword = Get-Val $mwInfra @("DB_PASSWORD")
if (-not $dbPassword) { $dbPassword = Get-Val $worker @("DB_PASSWORD") }
if (-not $dbPassword) { $dbPassword = Get-Val $mwPg @("PANEL_DB_ROOT_PASSWORD") }

$redisPassword = Get-Val $mwInfra @("REDIS_PASSWORD")
if (-not $redisPassword) { $redisPassword = Get-RunningRedisPassword $MwHost }
if (-not $redisPassword) { $redisPassword = Get-Val $worker @("REDIS_PASSWORD") }
if (-not $redisPassword) { $redisPassword = Get-Val $mwRedis @("PANEL_REDIS_ROOT_PASSWORD") }

$mqUser = Get-Val $mwInfra @("RABBITMQ_USER")
if (-not $mqUser) { $mqUser = Get-Val $worker @("RABBITMQ_USER") }
if (-not $mqUser) { $mqUser = Get-Val $mwMq @("RABBITMQ_DEFAULT_USER") }
if (-not $mqUser) { $mqUser = "guest" }

$mqPassword = Get-Val $mwInfra @("RABBITMQ_PASSWORD")
if (-not $mqPassword) { $mqPassword = Get-Val $worker @("RABBITMQ_PASSWORD") }
if (-not $mqPassword) { $mqPassword = Get-Val $mwMq @("RABBITMQ_DEFAULT_PASS") }

$internalKey = Get-Val $worker @("AGENT_INTERNAL_SERVICE_KEY", "INTERNAL_SERVICE_KEY")
$dbName = Get-Val $worker @("DB_NAME"); if (-not $dbName) { $dbName = "novel_agent" }
$milvusPort = Get-Val $worker @("MILVUS_PORT"); if (-not $milvusPort) { $milvusPort = "19530" }

$content = @"
# Auto-generated by scripts/pull-local-remote-env.ps1 — do not commit
MW_HOST=$MwHost

DB_HOST=$MwHost
DB_PORT=5432
DB_NAME=$dbName
DB_USER=$dbUser
DB_PASSWORD=$dbPassword

REDIS_HOST=$MwHost
REDIS_PORT=6379
REDIS_PASSWORD=$redisPassword

RABBITMQ_HOST=$MwHost
RABBITMQ_PORT=5672
RABBITMQ_USER=$mqUser
RABBITMQ_PASSWORD=$mqPassword

MILVUS_HOST=$MwHost
MILVUS_PORT=$milvusPort

AGENT_INTERNAL_SERVICE_KEY=$internalKey
"@

[IO.File]::WriteAllText($Out, $content.TrimEnd(), [Text.UTF8Encoding]::new($false))

$missing = @()
if (-not $dbPassword) { $missing += "DB_PASSWORD" }
if (-not $redisPassword) { $missing += "REDIS_PASSWORD" }
if (-not $mqPassword) { $missing += "RABBITMQ_PASSWORD" }
if ($missing.Count) { Write-Warning "Missing: $($missing -join ', ')" }

Write-Host "[pull] wrote $Out (secrets not printed)" -ForegroundColor Green
Write-Host "  redis: .env.infra -> running container -> worker -> 1Panel"
Write-Host "  pg/mq: .env.infra -> worker -> 1Panel; hosts -> MW public IP"

if ($SyncPythonAi) {
    Update-PythonAiEnv $Out
}
