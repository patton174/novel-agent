# 本地/运维：验证生产 SEO 爬虫可达 + 可选 ping 搜索引擎
# 用法:
#   powershell -ExecutionPolicy Bypass -File scripts\verify-seo-crawl.ps1
#   $env:BAIDU_SITE_TOKEN="xxx"; powershell -File scripts\verify-seo-crawl.ps1 -Ping

param(
  [string]$SiteOrigin = "https://www.novel-agent.cn",
  [switch]$Ping,
  [switch]$SkipVerify
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Frontend = Join-Path $Root "frontend"

$env:SEO_SITE_ORIGIN = $SiteOrigin

if (-not $SkipVerify) {
  Push-Location $Frontend
  node scripts/verify-seo-crawl.mjs
  Pop-Location
}

if ($Ping) {
  Push-Location $Frontend
  node scripts/ping-search-engines.mjs
  Pop-Location
}

Write-Host "[verify-seo] OK ($SiteOrigin)"
