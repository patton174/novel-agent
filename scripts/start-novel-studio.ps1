param([switch]$Remote)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

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
        Set-Item -Path "env:$key" -Value $val
    }
}

if ($Remote) {
    & "$Root\scripts\pull-local-remote-env.ps1" -SyncPythonAi
    $candidates = @(
        "$Root\scripts\local-remote.env",
        "$Root\novel-agent\agent-document\docs\deploy\docker\.env.mw"
    )
    foreach ($path in $candidates) {
        if (Test-Path $path) { Import-DotEnvFile $path; break }
    }
    if ($env:SPRING_DATASOURCE_URL -match "jdbc:postgresql://([^:/]+)") { $env:DB_HOST = $matches[1] }
    if ($env:SPRING_DATASOURCE_USERNAME) { $env:DB_USER = $env:SPRING_DATASOURCE_USERNAME }
    if ($env:SPRING_DATASOURCE_PASSWORD) { $env:DB_PASSWORD = $env:SPRING_DATASOURCE_PASSWORD }
    if ($env:SPRING_DATA_REDIS_HOST) { $env:REDIS_HOST = $env:SPRING_DATA_REDIS_HOST }
    if ($env:SPRING_DATA_REDIS_PASSWORD) { $env:REDIS_PASSWORD = $env:SPRING_DATA_REDIS_PASSWORD }
    if ($env:SPRING_RABBITMQ_HOST) { $env:RABBITMQ_HOST = $env:SPRING_RABBITMQ_HOST }
    if ($env:SPRING_RABBITMQ_USERNAME) { $env:RABBITMQ_USER = $env:SPRING_RABBITMQ_USERNAME }
    if ($env:SPRING_RABBITMQ_PASSWORD) { $env:RABBITMQ_PASSWORD = $env:SPRING_RABBITMQ_PASSWORD }
    if (-not $env:DB_HOST) { $env:DB_HOST = "107.150.112.140" }
    if (-not $env:REDIS_HOST) { $env:REDIS_HOST = $env:DB_HOST }
} else {
    Import-DotEnvFile "$Root\infra\.env"
    if ($env:POSTGRES_PASSWORD) { $env:DB_PASSWORD = $env:POSTGRES_PASSWORD }
}

$env:JAVA_HOME = "D:\Programs\Java\jdk_21"
$env:Path = "$env:JAVA_HOME\bin;" + $env:Path
$env:SPRING_PROFILES_ACTIVE = "local"
if (-not $env:AGENT_RUNTIME_MODE) { $env:AGENT_RUNTIME_MODE = "queued" }
if (-not $env:AGENT_PG_RUN_ENABLED) { $env:AGENT_PG_RUN_ENABLED = "true" }
if (-not $env:AGENT_MQ_LISTENER_AUTO_STARTUP) { $env:AGENT_MQ_LISTENER_AUTO_STARTUP = "true" }
if ($env:AGENT_INTERNAL_SERVICE_KEY) { $env:INTERNAL_SERVICE_KEY = $env:AGENT_INTERNAL_SERVICE_KEY }
if ($env:RABBITMQ_USER) { $env:RABBITMQ_USERNAME = $env:RABBITMQ_USER }

$jar = Get-ChildItem "$Root\novel-studio\studio-app\target\studio-app-*.jar" |
    Where-Object { $_.Name -notmatch "original" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
if (-not $jar) { throw "jar not found" }

Start-Process java -ArgumentList @("-jar", $jar.FullName) -WorkingDirectory $Root -WindowStyle Normal
