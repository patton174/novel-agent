# Shared dev port cleanup — kills listener process trees (uvicorn --reload leaves zombies on Windows).

function Test-DevPortListen([int]$Port) {
    return [bool](Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
}

function Stop-DevPortProcessTree([int]$ProcId, [string]$Label) {
    if (-not $ProcId -or $ProcId -le 0) { return }
    $proc = Get-Process -Id $ProcId -ErrorAction SilentlyContinue
    $name = if ($proc) { $proc.ProcessName } else { "?" }
    Write-Host "[$Label] killing PID $ProcId ($name)" -ForegroundColor Yellow
    # /T kills child workers (uvicorn reloader + worker)
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    cmd /c "taskkill /F /T /PID $ProcId 2>nul" | Out-Null
    $ErrorActionPreference = $prevEap
    Stop-Process -Id $ProcId -Force -ErrorAction SilentlyContinue
}

function Stop-DevPortExtraPythonOn8000([string]$Label) {
    if (-not (Get-Command Get-CimInstance -ErrorAction SilentlyContinue)) { return }
    try {
        Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" -ErrorAction SilentlyContinue |
            Where-Object { $_.CommandLine -match 'uvicorn|app\.main:app' -and $_.CommandLine -match '8000' } |
            ForEach-Object {
                Stop-DevPortProcessTree -ProcId $_.ProcessId -Label "$Label-extra"
            }
    } catch {
        # Best-effort; port listener loop is primary.
    }
}

function Stop-DevPortListener {
    param(
        [int]$Port,
        [string]$Label = "port-$Port",
        [int]$MaxAttempts = 8
    )
    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        if ($Port -eq 8000) {
            Stop-DevPortExtraPythonOn8000 -Label $Label
        }
        $conns = @()
        try {
            $conns = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
        } catch {
            $conns = @()
        }
        if ($conns.Count -eq 0) {
            if ($attempt -eq 1) {
                Write-Host "[$Label] :$Port free"
            } else {
                Write-Host "[$Label] :$Port cleared after $attempt attempt(s)" -ForegroundColor Green
            }
            return $true
        }
        $procIds = $conns | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $procIds) {
            Stop-DevPortProcessTree -ProcId $procId -Label "$Label`:$Port"
        }
        Start-Sleep -Milliseconds 700
    }
    if (Test-DevPortListen $Port) {
        Write-Host "[$Label] WARN: :$Port still busy after $MaxAttempts attempts" -ForegroundColor Red
        return $false
    }
    return $true
}
