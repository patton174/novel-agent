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
$env:JAVA_HOME = "D:\Programs\Java\jdk_21"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
$env:SPRING_PROFILES_ACTIVE = "local"
$env:PYTHON_AI_BASE_URL = "http://127.0.0.1:8000"
$env:AGENT_PYTHON_BASE_URL = "http://127.0.0.1:8000"

$jar = Get-ChildItem "$Root\novel-studio\studio-app\target\studio-app-*.jar" |
    Where-Object { $_.Name -notmatch "original" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
if (-not $jar) { throw "studio-app jar not found" }

$log = Join-Path $Root "novel-studio-local.log"
Write-Host "Starting novel-studio -> $log"
java -jar $jar.FullName *> $log
