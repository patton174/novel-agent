# 从 novel-agent 微服务迁移源码到 novel-studio（包名替换 + 去除 Nacos 引导类）
# 用法: powershell -ExecutionPolicy Bypass -File scripts/port-sources.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$SrcRoot = Join-Path (Split-Path -Parent $Root) "novel-agent"

# Source 指向旧包根目录，Target 指向新包根目录
$Mappings = @(
    @{
        Source = "agent-common/agent-common-core/src/main/java/com/novel/agent/common/core"
        Target = "studio-kernel/src/main/java/cn/novelstudio/kernel"
        From   = "com.novel.agent.common.core"
        To     = "cn.novelstudio.kernel"
    },
    @{
        Source = "agent-common/agent-common-service/src/main/java/com/novel/agent/common/service"
        Target = "studio-platform/studio-platform-web/src/main/java/cn/novelstudio/platform/web"
        From   = "com.novel.agent.common.service"
        To     = "cn.novelstudio.platform.web"
    },
    @{
        Source = "agent-common/agent-common-security/src/main/java/com/novel/agent/common/security"
        Target = "studio-platform/studio-platform-security/src/main/java/cn/novelstudio/platform/security"
        From   = "com.novel.agent.common.security"
        To     = "cn.novelstudio.platform.security"
    },
    @{
        Source = "agent-common/agent-common-mq/src/main/java/com/novel/agent/common/mq"
        Target = "studio-platform/studio-platform-messaging/src/main/java/cn/novelstudio/platform/messaging"
        From   = "com.novel.agent.common.mq"
        To     = "cn.novelstudio.platform.messaging"
    },
    @{
        Source = "agent-common/agent-common-mail/src/main/java/com/novel/agent/common/mail"
        Target = "studio-platform/studio-platform-mail/src/main/java/cn/novelstudio/platform/mail"
        From   = "com.novel.agent.common.mail"
        To     = "cn.novelstudio.platform.mail"
    },
    @{
        Source = "agent-common/agent-common-mail/src/main/resources"
        Target = "studio-platform/studio-platform-mail/src/main/resources"
        From   = $null
        To     = $null
    },
    @{
        Source = "agent-common/agent-common-image/src/main/java/com/novel/agent/common/image"
        Target = "studio-platform/studio-platform-media/src/main/java/cn/novelstudio/platform/media"
        From   = "com.novel.agent.common.image"
        To     = "cn.novelstudio.platform.media"
    },
    @{
        Source = "agent-service/agent-auth/src/main/java/com/novel/agent/auth"
        Target = "studio-modules/studio-module-auth/src/main/java/cn/novelstudio/module/auth"
        From   = "com.novel.agent.auth"
        To     = "cn.novelstudio.module.auth"
        SkipApplication = $true
    },
    @{
        Source = "agent-service/agent-auth/src/main/resources/db"
        Target = "studio-modules/studio-module-auth/src/main/resources/db/migration/auth"
        From   = $null
        To     = $null
    },
    @{
        Source = "agent-service/agent-content/src/main/java/com/novel/agent/content"
        Target = "studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content"
        From   = "com.novel.agent.content"
        To     = "cn.novelstudio.module.content"
        SkipApplication = $true
    },
    @{
        Source = "agent-service/agent-content/src/main/resources/db"
        Target = "studio-modules/studio-module-content/src/main/resources/db/migration/content"
        From   = $null
        To     = $null
    },
    @{
        Source = "agent-service/agent-pyai/src/main/java/com/novel/agent/pyai"
        Target = "studio-modules/studio-module-agent/src/main/java/cn/novelstudio/module/agent"
        From   = "com.novel.agent.pyai"
        To     = "cn.novelstudio.module.agent"
        SkipApplication = $true
    },
    @{
        Source = "agent-service/agent-billing/src/main/java/com/novel/agent/billing"
        Target = "studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing"
        From   = "com.novel.agent.billing"
        To     = "cn.novelstudio.module.billing"
        SkipApplication = $true
    },
    @{
        Source = "agent-service/agent-billing/src/main/resources/db"
        Target = "studio-modules/studio-module-billing/src/main/resources/db/migration/billing"
        From   = $null
        To     = $null
    },
    @{
        Source = "agent-service/agent-consumer/src/main/java/com/novel/agent/consumer"
        Target = "studio-modules/studio-module-worker/src/main/java/cn/novelstudio/module/worker"
        From   = "com.novel.agent.consumer"
        To     = "cn.novelstudio.module.worker"
        SkipApplication = $true
    }
)

$GlobalReplacements = @(
    @{ From = "com.novel.agent.common.core"; To = "cn.novelstudio.kernel" },
    @{ From = "com.novel.agent.common.service"; To = "cn.novelstudio.platform.web" },
    @{ From = "com.novel.agent.common.security"; To = "cn.novelstudio.platform.security" },
    @{ From = "com.novel.agent.common.mq"; To = "cn.novelstudio.platform.messaging" },
    @{ From = "com.novel.agent.common.mail"; To = "cn.novelstudio.platform.mail" },
    @{ From = "com.novel.agent.common.image"; To = "cn.novelstudio.platform.media" },
    @{ From = "com.novel.agent.auth"; To = "cn.novelstudio.module.auth" },
    @{ From = "com.novel.agent.content"; To = "cn.novelstudio.module.content" },
    @{ From = "com.novel.agent.pyai"; To = "cn.novelstudio.module.agent" },
    @{ From = "com.novel.agent.billing"; To = "cn.novelstudio.module.billing" },
    @{ From = "com.novel.agent.consumer"; To = "cn.novelstudio.module.worker" }
)

function Transform-Content([string]$text) {
    foreach ($r in $GlobalReplacements) {
        $text = $text.Replace($r.From, $r.To)
    }
    return $text
}

function Copy-MappedTree($map) {
    $src = Join-Path $SrcRoot $map.Source
    $dst = Join-Path $Root $map.Target
    if (-not (Test-Path $src)) {
        Write-Warning "Skip missing: $src"
        return
    }
    if (Test-Path $dst) {
        Remove-Item -Recurse -Force $dst
    }
    New-Item -ItemType Directory -Force -Path $dst | Out-Null

    Get-ChildItem -Path $src -Recurse -File | ForEach-Object {
        $rel = $_.FullName.Substring($src.Length).TrimStart('\', '/')
        if ($map.SkipApplication -and $_.Name -match 'Application\.java$') {
            Write-Host "  skip Application: $rel"
            return
        }
        $outPath = Join-Path $dst $rel
        $outDir = Split-Path $outPath -Parent
        if (-not (Test-Path $outDir)) {
            New-Item -ItemType Directory -Force -Path $outDir | Out-Null
        }
        if ($_.Extension -in @(".java", ".yml", ".yaml", ".properties", ".sql", ".imports")) {
            $content = Get-Content -Raw -Encoding UTF8 $_.FullName
            if ($map.From -and $map.To) {
                $content = $content.Replace($map.From, $map.To)
            }
            $content = Transform-Content $content
            $content = $content -replace '(?m)^import org\.springframework\.cloud\.[^\r\n]+\r?\n', ''
            $content = $content -replace '(?m)^import com\.alibaba\.cloud\.[^\r\n]+\r?\n', ''
            $content = $content -replace '(?m)^@EnableFeignClients[^\r\n]*\r?\n', ''
            $content = $content -replace '(?m)^@EnableDiscoveryClient[^\r\n]*\r?\n', ''
            $utf8NoBom = New-Object System.Text.UTF8Encoding $false
            [System.IO.File]::WriteAllText($outPath, $content, $utf8NoBom)
        } else {
            Copy-Item $_.FullName $outPath -Force
        }
    }
    Write-Host "OK $($map.Source) -> $($map.Target)"
}

Write-Host "=== port-sources: $SrcRoot -> $Root ==="
foreach ($m in $Mappings) {
    Copy-MappedTree $m
}

# 清理 bootstrap / nacos 配置
Get-ChildItem -Path $Root -Recurse -Filter "bootstrap*.yml" | Remove-Item -Force
Get-ChildItem -Path $Root -Recurse -Filter "bootstrap*.yaml" | Remove-Item -Force

Write-Host "=== done ==="
