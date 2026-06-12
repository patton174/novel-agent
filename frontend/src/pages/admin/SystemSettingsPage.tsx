import { useCallback, useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import {
  fetchAdminSiteSettings,
  updateAdminSiteSettings,
  type SiteSettingsMap,
} from '@/api/billingAdminApi'
import {
  AppPageStack,
  AppShellCard,
  AppShellCardHeader,
} from '@/components/layout/AppPageStack'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { APP_BTN_MD } from '@/lib/appButtonTokens'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'

const SETTING_FIELDS = [
  {
    key: 'registration.enabled',
    label: '开放注册',
    description: '关闭后新用户无法注册（维护模式）',
    type: 'boolean' as const,
  },
  {
    key: 'registration.require_email_verify',
    label: '注册需邮箱验证',
    description: '新用户须验证邮箱后才能登录',
    type: 'boolean' as const,
  },
  {
    key: 'agent.default_model',
    label: '默认模型',
    description: 'Agent 默认 LLM 模型 ID',
    type: 'string' as const,
  },
  {
    key: 'agent.max_tokens_per_run',
    label: '单次 Run 最大 Tokens',
    description: '单次 Agent 运行 token 上限提示值',
    type: 'number' as const,
  },
  {
    key: 'crawl.max_concurrent_jobs',
    label: '爬虫最大并发',
    description: '内容服务爬虫并发任务上限',
    type: 'number' as const,
  },
]

export default function SystemSettingsPage() {
  useMarkRouteSeen()
  const [settings, setSettings] = useState<SiteSettingsMap | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setSettings(await fetchAdminSiteSettings())
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '加载系统参数失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const setValue = (key: string, value: boolean | string | number) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const updated = await updateAdminSiteSettings(settings)
      setSettings(updated)
      appToast.success('系统参数已保存')
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppPageStack narrow className="pb-20">
      <p className="text-sm text-muted-foreground">
        参数保存后约 60 秒内对各服务生效。关闭注册会立即拦截新用户注册请求。
      </p>

      <AppShellCard>
        <AppShellCardHeader title="运行参数" description="注册、Agent 与爬虫全局配置" />
        {loading || !settings ? (
          <div className="divide-y divide-border/60">
            {SETTING_FIELDS.map((field) => (
              <div key={field.key} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-9 w-36 shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {SETTING_FIELDS.map((field) => (
              <div
                key={field.key}
                className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{field.label}</p>
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                </div>
                <div className="shrink-0">
                  {field.type === 'boolean' ? (
                    <Switch
                      checked={Boolean(settings[field.key])}
                      onCheckedChange={(checked) => setValue(field.key, checked)}
                    />
                  ) : field.type === 'number' ? (
                    <Input
                      type="number"
                      className="w-36"
                      value={String(settings[field.key] ?? '')}
                      onChange={(e) => setValue(field.key, Number(e.target.value) || 0)}
                    />
                  ) : (
                    <Input
                      className="w-48"
                      value={String(settings[field.key] ?? '')}
                      onChange={(e) => setValue(field.key, e.target.value)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </AppShellCard>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 px-4 py-3 backdrop-blur-md md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="mx-auto flex max-w-2xl justify-end">
          <Button type="button" className={APP_BTN_MD} disabled={saving || loading || !settings} onClick={() => void handleSave()}>
            <Save className="mr-1.5 size-4" />
            {saving ? '保存中…' : '保存参数'}
          </Button>
        </div>
      </div>
    </AppPageStack>
  )
}
