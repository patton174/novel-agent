# 本地 Mailtrap 发信测试（不依赖 Java 服务）
# 用法：
#   $env:MAILTRAP_TOKEN = "你的 Mailtrap Email Sending API Token"
#   .\novel-agent\scripts\test-mailtrap-send.ps1 -To 2037475020@qq.com

param(
    [string]$To = "2037475020@qq.com",
    [string]$FromEmail = "hello@noreply.novel-agent.cn",
    [string]$FromName = "Novel Agent"
)

$token = $env:MAILTRAP_TOKEN
if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Error "Set env MAILTRAP_TOKEN (Mailtrap Settings -> API Tokens -> Email Sending)"
    exit 1
}

$body = @{
    from = @{ email = $FromEmail; name = $FromName }
    to = @(@{ email = $To })
    subject = "Novel Agent Mailtrap local test"
    text = "Local test from test-mailtrap-send.ps1. If you receive this, token and from-domain are OK."
    category = "email-verification"
} | ConvertTo-Json -Depth 5 -Compress

try {
    $response = Invoke-WebRequest `
        -Uri "https://send.api.mailtrap.io/api/send" `
        -Method POST `
        -Headers @{
            Authorization = "Bearer $token"
            "Content-Type" = "application/json"
        } `
        -Body $body `
        -UseBasicParsing
    Write-Host "OK HTTP $($response.StatusCode)"
    Write-Host $response.Content
} catch {
    $resp = $_.Exception.Response
    if ($resp) {
        $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
        $txt = $reader.ReadToEnd()
        Write-Host "FAIL HTTP $([int]$resp.StatusCode)"
        Write-Host $txt
        exit 2
    }
    Write-Error $_
    exit 2
}
