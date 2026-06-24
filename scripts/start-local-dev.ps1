# Local dev stack (no production deploy)
# Usage:
#   CN dev infra:     powershell -ExecutionPolicy Bypass -File scripts\start-local-dev.ps1 -Cn
#   Remote DB (MW):   powershell -ExecutionPolicy Bypass -File scripts\start-local-dev.ps1 -Remote
#   Local infra:      powershell -ExecutionPolicy Bypass -File scripts\start-local-dev.ps1

param(
    [switch]$SkipBuild,
    [switch]$Remote,
    [switch]$Cn,
    [string]$Services = "novel,pyai,frontend"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Resolve-PublicMwHost([string]$HostValue, [string]$MwHost) {
    if (-not $HostValue) { return $MwHost }
    # Worker .env 常为 Docker 内网地址（如 10.66.0.2），本机开发需改连 MW 公网 IP
    if ($HostValue -match '^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)') { return $MwHost }
    return $HostValue
}

function Import-DotEnvFile([string]$Path) {
    if (-not (Test-Path $Path)) { return }
    $text = [IO.File]::ReadAllText($Path, [Text.UTF8Encoding]::new($false))
    if ($text.Length -gt 0 -and [int][char]$text[0] -eq 0xFEFF) { $text = $text.Substring(1) }
    foreach ($rawLine in ($text -split "`n")) {
        $line = $rawLine.TrimEnd("`r").Trim()
        if (-not $line -or $line.StartsWith("#")) { continue }
        $idx = $line.IndexOf("=")
        if ($idx -lt 1) { continue }
        $key = $line.Substring(0, $idx).Trim()
        $val = $line.Substring($idx + 1).Trim()
        if ($val.StartsWith('"') -and $val.EndsWith('"')) { $val = $val.Substring(1, $val.Length - 2) }
        Set-Item -Path "env:$key" -Value $val
    }
}

Import-DotEnvFile "$Root\infra\.env"

function Apply-RemoteInfraEnv() {
    $candidates = @(
        "$Root\scripts\local-remote.env",
        "$Root\novel-agent\agent-document\docs\deploy\docker\.env.mw",
        "$Root\novel-agent\agent-document\docs\deploy\docker\.env.worker"
    )
    $loaded = $false
    foreach ($path in $candidates) {
        if (Test-Path $path) {
            Import-DotEnvFile $path
            Write-Host "[remote] loaded $path" -ForegroundColor DarkCyan
            $loaded = $true
            break
        }
    }
    if (-not $loaded) {
        Write-Error "Remote mode: create scripts\local-remote.env from local-remote.env.example (or restore .env.mw)"
    }

    if ($env:SPRING_DATASOURCE_URL -match "jdbc:postgresql://([^:/]+)") {
        $env:DB_HOST = $matches[1]
    }
    if ($env:SPRING_DATASOURCE_USERNAME) { $env:DB_USER = $env:SPRING_DATASOURCE_USERNAME }
    if ($env:SPRING_DATASOURCE_PASSWORD) { $env:DB_PASSWORD = $env:SPRING_DATASOURCE_PASSWORD }
    if ($env:SPRING_DATA_REDIS_HOST) { $env:REDIS_HOST = $env:SPRING_DATA_REDIS_HOST }
    if ($env:SPRING_DATA_REDIS_PASSWORD) { $env:REDIS_PASSWORD = $env:SPRING_DATA_REDIS_PASSWORD }
    if ($env:SPRING_RABBITMQ_HOST) { $env:RABBITMQ_HOST = $env:SPRING_RABBITMQ_HOST }
    if ($env:SPRING_RABBITMQ_USERNAME) { $env:RABBITMQ_USER = $env:SPRING_RABBITMQ_USERNAME }
    if ($env:SPRING_RABBITMQ_PASSWORD) { $env:RABBITMQ_PASSWORD = $env:SPRING_RABBITMQ_PASSWORD }
    if ($env:RABBITMQ_USER) { $env:RABBITMQ_USERNAME = $env:RABBITMQ_USER }
    if (-not $env:MW_HOST) { $env:MW_HOST = "107.150.112.140" }
    if (-not $env:DB_HOST) { $env:DB_HOST = $env:MW_HOST }
    if (-not $env:REDIS_HOST) { $env:REDIS_HOST = $env:MW_HOST }
    if (-not $env:RABBITMQ_HOST) { $env:RABBITMQ_HOST = $env:MW_HOST }
    $env:DB_HOST = Resolve-PublicMwHost $env:DB_HOST $env:MW_HOST
    $env:REDIS_HOST = Resolve-PublicMwHost $env:REDIS_HOST $env:MW_HOST
    $env:RABBITMQ_HOST = Resolve-PublicMwHost $env:RABBITMQ_HOST $env:MW_HOST
    if (-not $env:MILVUS_HOST) { $env:MILVUS_HOST = $env:MW_HOST }
    if (-not $env:MILVUS_PORT) { $env:MILVUS_PORT = "19530" }
}

if ($Remote) {
    Write-Host "`n=== Pull MW credentials ===" -ForegroundColor Cyan
    & "$Root\scripts\pull-local-remote-env.ps1" -SyncPythonAi
    Apply-RemoteInfraEnv
    if ($env:AGENT_INTERNAL_SERVICE_KEY) {
        $env:INTERNAL_SERVICE_KEY = $env:AGENT_INTERNAL_SERVICE_KEY
    }
}

if ($Cn) {
    $cnEnv = Join-Path $Root "scripts\local-cn.env"
    if (-not (Test-Path $cnEnv)) {
        Write-Error "CN mode: missing scripts\local-cn.env (middleware on 118.89.123.201)"
    }
    Import-DotEnvFile $cnEnv
    Write-Host "[cn] loaded $cnEnv" -ForegroundColor DarkCyan
    if ($env:AGENT_INTERNAL_SERVICE_KEY) {
        $env:INTERNAL_SERVICE_KEY = $env:AGENT_INTERNAL_SERVICE_KEY
    }
}

$env:JAVA_HOME = "D:\Programs\Java\jdk_21"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

if (-not $env:DB_PASSWORD -and $env:POSTGRES_PASSWORD) { $env:DB_PASSWORD = $env:POSTGRES_PASSWORD }
if (-not $env:DB_PASSWORD) { $env:DB_PASSWORD = "changeme" }
if (-not $env:REDIS_PASSWORD) { $env:REDIS_PASSWORD = "changeme" }
if (-not $env:RABBITMQ_USER) { $env:RABBITMQ_USER = "guest" }
if (-not $env:RABBITMQ_PASSWORD) { $env:RABBITMQ_PASSWORD = "guest" }
$env:SPRING_PROFILES_ACTIVE = "local"
if (-not $env:AGENT_RUNTIME_MODE) { $env:AGENT_RUNTIME_MODE = "queued" }
if (-not $env:AGENT_PG_RUN_ENABLED) { $env:AGENT_PG_RUN_ENABLED = "true" }
if (-not $env:AGENT_MQ_LISTENER_AUTO_STARTUP) { $env:AGENT_MQ_LISTENER_AUTO_STARTUP = "true" }
$env:PYTHON_AI_BASE_URL = "http://127.0.0.1:8000"
$env:AGENT_PYTHON_BASE_URL = "http://127.0.0.1:8000"

function Test-PortListen([int]$Port) {
    return [bool](Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
}

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

function Test-TcpReachable([string]$HostName, [int]$Port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $iar = $client.BeginConnect($HostName, $Port, $null, $null)
        $ok = $iar.AsyncWaitHandle.WaitOne(3000, $false)
        if ($ok -and $client.Connected) { $client.EndConnect($iar); return $true }
        return $false
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

Write-Host "=== Infra check ===" -ForegroundColor Cyan
if ($Remote) {
    $pgOk = Test-TcpReachable $env:DB_HOST 5432
    $redisOk = Test-TcpReachable $env:REDIS_HOST 6379
    $mqOk = Test-TcpReachable $env:RABBITMQ_HOST 5672
    Write-Host "  Remote PostgreSQL $($env:DB_HOST):5432 -> $(if ($pgOk) { 'OK' } else { 'FAIL' })"
    Write-Host "  Remote Redis      $($env:REDIS_HOST):6379 -> $(if ($redisOk) { 'OK' } else { 'FAIL' })"
    Write-Host "  Remote RabbitMQ   $($env:RABBITMQ_HOST):5672 -> $(if ($mqOk) { 'OK' } else { 'FAIL' })"
    if (-not $pgOk -or -not $redisOk -or -not $mqOk) {
        Write-Error "Cannot reach MW PostgreSQL/Redis/RabbitMQ. Check VPN/firewall or MW_HOST in local-remote.env"
    }
    if ($env:AGENT_RUNTIME_MODE -eq "queued") {
        Write-Host "  [info] queued mode: owner Java SSE + PG event persist (no worker dispatch queue)." -ForegroundColor DarkCyan
    }
} elseif ($Cn) {
    # CN 节点 118.89.123.201 上的独立开发中间件：PG:15432 / Redis:16379 / MQ-AMQP:15672 / Milvus:19530
    $cnHost = "118.89.123.201"
    $pgOk = Test-TcpReachable $cnHost 15432
    $redisOk = Test-TcpReachable $cnHost 16379
    $mqOk = Test-TcpReachable $cnHost 15672
    $milvusOk = Test-TcpReachable $cnHost 19530
    Write-Host "  CN PostgreSQL  $($cnHost):15432 -> $(if ($pgOk) { 'OK' } else { 'FAIL' })"
    Write-Host "  CN Redis       $($cnHost):16379 -> $(if ($redisOk) { 'OK' } else { 'FAIL' })"
    Write-Host "  CN RabbitMQ    $($cnHost):15672 -> $(if ($mqOk) { 'OK' } else { 'FAIL' })"
    Write-Host "  CN Milvus      $($cnHost):19530 -> $(if ($milvusOk) { 'OK' } else { 'FAIL' })"
    if (-not $pgOk -or -not $redisOk -or -not $mqOk) {
        Write-Error "Cannot reach CN dev middleware on $cnHost. Check it is up: ssh root@$cnHost 'cd /opt/novel-dev-infra && docker compose ps'"
    }
    Write-Host "  [cn] Independent dev middleware; owner SSE hot path (no agent.run.dispatch.queue)." -ForegroundColor DarkGreen
} else {
    $pgOk = Test-PortListen 5432
    $redisOk = Test-PortListen 6379
    $mqOk = Test-PortListen 5672
    Write-Host "  PostgreSQL :5432 -> $(if ($pgOk) { 'OK' } else { 'MISSING' })"
    Write-Host "  Redis      :6379 -> $(if ($redisOk) { 'OK' } else { 'MISSING' })"
    Write-Host "  RabbitMQ   :5672 -> $(if ($mqOk) { 'OK' } else { 'MISSING' })"
    if (-not $pgOk -or -not $redisOk -or ($env:AGENT_RUNTIME_MODE -eq "queued" -and -not $mqOk)) {
        Write-Error "Start PostgreSQL, Redis and RabbitMQ first (cd infra; docker compose up -d), or use -Remote"
    }
}

if (-not (Test-Path "python-ai\.env")) {
    Copy-Item "python-ai\.env.example" "python-ai\.env"
    Write-Host "[python-ai] Created .env - set OPENAI_API_KEY then restart python-ai" -ForegroundColor Yellow
}

if (-not (Test-Path "frontend\.env.local")) {
    Write-Error "Missing frontend\.env.local"
}

$want = $Services.Split(",") | ForEach-Object { $_.Trim().ToLower() }

function Test-PyAiLlmKeyConfigured() {
    $envPath = Join-Path $Root "python-ai\.env"
    if (-not (Test-Path $envPath)) { return $false }
    $hasKey = $false
    Get-Content $envPath | ForEach-Object {
        $line = $_.Trim()
        if ($line -match '^(OPENAI_API_KEY|DEEPSEEK_API_KEY)=(.+)$') {
            if ($matches[2].Trim() -and $matches[2].Trim() -notmatch '^(your-|sk-your-)') {
                $hasKey = $true
            }
        }
    }
    return $hasKey
}

if ($want -contains "pyai") {
    if (-not (Test-PyAiLlmKeyConfigured)) {
        Write-Host "[python-ai] WARN: OPENAI_API_KEY / DEEPSEEK_API_KEY not set in python-ai\.env" -ForegroundColor Yellow
        Write-Host "          Agent will show llm_configured=false until you add a key and restart python-ai" -ForegroundColor Yellow
    }
}

if ($want -contains "novel") {
    if (-not $SkipBuild) {
        Write-Host "`n=== Build novel-studio ===" -ForegroundColor Cyan
        Push-Location novel-studio
        mvn -pl studio-app -am package -DskipTests -q
        if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
        Pop-Location
    }
    $jar = Get-ChildItem "novel-studio\studio-app\target\studio-app-*.jar" |
        Where-Object { $_.Name -notmatch "original" } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if (-not $jar) { Write-Error "studio-app jar not found" }
    if (Test-PortListen 8080) {
        Write-Host "[novel-studio] port 8080 busy, skip" -ForegroundColor Yellow
    } else {
        Write-Host "`n=== Start novel-studio :8080 ===" -ForegroundColor Cyan
        Start-Process -FilePath "java" -ArgumentList @("-jar", $jar.FullName) `
            -WorkingDirectory $Root -WindowStyle Normal
    }
}

if ($want -contains "pyai") {
    if (Test-PortListen 8000) {
        Stop-ListenerOnPort 8000 "python-ai"
    }
    if (Test-PortListen 8000) {
        Write-Host "[python-ai] port 8000 still busy after stop, skip" -ForegroundColor Yellow
    } else {
        Write-Host "`n=== Start python-ai :8000 ===" -ForegroundColor Cyan
        $env:CONTENT_BASE_URL = "http://127.0.0.1:8080"
        if ($env:AGENT_INTERNAL_SERVICE_KEY) {
            $env:INTERNAL_SERVICE_KEY = $env:AGENT_INTERNAL_SERVICE_KEY
        } else {
            $env:INTERNAL_SERVICE_KEY = "dev-internal-key-change-me"
        }
        # owner Java SSE → /internal/agent/run/stream（禁止浏览器直连 /agent/run/stream）
        $env:AGENT_ALLOW_DIRECT_STREAM = "false"
        $env:AGENT_DURABLE_CHECKPOINT = "true"
        if ($Remote -and $env:MILVUS_HOST) {
            $env:MILVUS_HOST = $env:MILVUS_HOST
            $env:MILVUS_PORT = if ($env:MILVUS_PORT) { $env:MILVUS_PORT } else { "19530" }
        }
        $env:KG_ENABLED = "true"
        Start-Process -FilePath "python" -ArgumentList @("-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload") `
            -WorkingDirectory "$Root\python-ai" -WindowStyle Normal
    }
}

if ($want -contains "frontend") {
    if (Test-PortListen 3000) {
        Write-Host "[frontend] port 3000 busy, skip" -ForegroundColor Yellow
    } else {
        if (-not (Test-Path "frontend\node_modules")) {
            Write-Host "`n=== npm install (frontend) ===" -ForegroundColor Cyan
            Push-Location frontend
            npm install
            Pop-Location
        }
        Write-Host "`n=== Start frontend :3000 ===" -ForegroundColor Cyan
        $env:VITE_MONOLITH = "true"
        $env:VITE_SECURITY_BYPASS = "true"
        $env:VITE_SECURITY_AES = "false"
        $env:VITE_ROUTE_OBFUSCATION = "false"
        $env:VITE_FIELD_ENCRYPTION = "false"
        $env:VITE_SECURITY_ENCRYPT_STREAM = "false"
        # dev server 默认启用自签证书 HTTPS（vite.config.ts 内部判断 NODE_ENV !== 'production'）
        Start-Process -FilePath "npm" -ArgumentList @("run", "dev", "--", "--host") `
            -WorkingDirectory "$Root\frontend" -WindowStyle Normal
    }
}

Write-Host "`n=== Ready ===" -ForegroundColor Green
Write-Host "  Frontend:  https://127.0.0.1:3000  (dev uses self-signed HTTPS)"
Write-Host "  Models:    https://127.0.0.1:3000/dashboard/settings#api-models"
Write-Host "  Monolith:  http://127.0.0.1:8080"
Write-Host "  Python AI: http://127.0.0.1:8000"
Write-Host "  Health:    http://127.0.0.1:8080/actuator/health"
Write-Host "  Agent:     runtime=$($env:AGENT_RUNTIME_MODE) pg-run=$($env:AGENT_PG_RUN_ENABLED) mq-listener=$($env:AGENT_MQ_LISTENER_AUTO_STARTUP)"
