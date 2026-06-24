$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Import-DotEnvFile([string]$Path) {
    if (-not (Test-Path $Path)) { return }
    $text = [IO.File]::ReadAllText($Path, [Text.UTF8Encoding]::new($false))
    foreach ($rawLine in ($text -split "`n")) {
        $line = $rawLine.TrimEnd("`r").Trim()
        if (-not $line -or $line.StartsWith("#")) { continue }
        $idx = $line.IndexOf("=")
        if ($idx -lt 1) { continue }
        $key = $line.Substring(0, $idx).Trim()
        $val = $line.Substring($idx + 1).Trim().Trim('"')
        Set-Item -Path "env:$key" -Value $val
    }
}

Import-DotEnvFile "$Root\scripts\local-cn.env"
$env:CONTENT_BASE_URL = "http://127.0.0.1:8080"
if ($env:AGENT_INTERNAL_SERVICE_KEY) {
    $env:INTERNAL_SERVICE_KEY = $env:AGENT_INTERNAL_SERVICE_KEY
} else {
    $env:INTERNAL_SERVICE_KEY = "dev-internal-key-change-me"
}
$env:AGENT_ALLOW_DIRECT_STREAM = "false"
$env:AGENT_DURABLE_CHECKPOINT = "true"
$env:KG_ENABLED = "true"

Write-Host "Starting python-ai :8000"
Set-Location "$Root\python-ai"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
