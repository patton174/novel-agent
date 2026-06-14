import { useTranslation } from 'react-i18next'
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

export default function SystemSettingsPage() {
  const { t } = useTranslation(['admin'])
  useMarkRouteSeen()
  const [settings, setSettings] = useState<SiteSettingsMap | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const SETTING_FIELDS = [
    {
      key: 'registration.enabled',
      label: t('admin:settings.regEnabled'),
      description: t('admin:settings.regEnabledDesc'),
      type: 'boolean' as const,
    },
    {
      key: 'registration.require_email_verify',
      label: t('admin:settings.regVerify'),
      description: t('admin:settings.regVerifyDesc'),
      type: 'boolean' as const,
    },
    {
      key: 'agent.default_model',
      label: t('admin:settings.agentModel'),
      description: t('admin:settings.agentModelDesc'),
      type: 'string' as const,
    },
    {
      key: 'agent.max_tokens_per_run',
      label: t('admin:settings.agentTokens'),
      description: t('admin:settings.agentTokensDesc'),
      type: 'number' as const,
    },
    {
      key: 'crawl.max_concurrent_jobs',
      label: t('admin:settings.crawlJobs'),
      description: t('admin:settings.crawlJobsDesc'),
      type: 'number' as const,
    },
  ]

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setSettings(await fetchAdminSiteSettings())
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:settings.loadFail'))
    } finally {
      setLoading(false)
    }
  }, [t])

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
      appToast.success(t('admin:settings.saved'))
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:settings.saveFail'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppPageStack compact className="pb-20">
      <p className="text-sm text-muted-foreground">
        {t('admin:settings.pageDesc')}
      </p>

      <AppShellCard>
        <AppShellCardHeader title={t('admin:settings.cardTitle')} description={t('admin:settings.cardDesc')} />
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
            {saving ? t('admin:settings.saving') : t('admin:settings.saveBtn')}
          </Button>
        </div>
      </div>
    </AppPageStack>
  )
}
