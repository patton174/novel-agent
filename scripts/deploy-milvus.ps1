# 在 MW 部署 Milvus 并配置 Worker python-ai
# 用法:
#   $env:MW_HOST="107.150.112.140"
#   $env:WORKER_HOST="47.80.80.224"
#   $env:DEPLOY_SSH_KEY_FILE="C:\Users\你\.ssh\deploy_key"
#   powershell -ExecutionPolicy Bypass -File scripts\deploy-milvus.ps1

param(
    [string]$MwHost = $env:MW_HOST,
    [string]$WorkerHost = $env:WORKER_HOST,
    [string]$SshKeyFile = $env:DEPLOY_SSH_KEY_FILE
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not $MwHost) { $MwHost = "107.150.112.140" }
if (-not $WorkerHost) { $WorkerHost = "47.80.80.224" }

$env:MW_HOST = $MwHost
$env:WORKER_HOST = $WorkerHost
if ($SshKeyFile) { $env:DEPLOY_SSH_KEY_FILE = $SshKeyFile }

$bash = "D:\Program Files\Git\bin\bash.exe"
if (-not (Test-Path $bash)) {
    Write-Error "需要 Git Bash 执行 deploy-milvus.sh，或手动 SSH 到 MW 运行 docker compose"
}

& $bash -lc "bash novel-studio/deploy/ci/deploy-milvus.sh"
