import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { AdminButton, AdminTextInput } from '@/components/admin/AdminFormControls'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'
import {
  pickSiteSettings,
  SITE_SETTING_FIELDS,
  SITE_SETTING_GROUPS,
  type SiteSettingFieldDef,
} from '@/config/siteSettingsCatalog'

function clampNumber(value: number, min?: number, max?: number): number {
  let next = value
  if (min != null) next = Math.max(min, next)
  if (max != null) next = Math.min(max, next)
  return next
}

function SettingRow({
  field,
  value,
  onChange,
}: {
  field: SiteSettingFieldDef
  value: boolean | string | number | undefined
  onChange: (value: boolean | string | number) => void
}) {
  const { t } = useTranslation(['admin'])

  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{t(field.labelKey)}</p>
        <p className="text-xs text-muted-foreground">{t(field.descriptionKey)}</p>
      </div>
      <div className="shrink-0">
        {field.type === 'boolean' ? (
          <Switch checked={Boolean(value)} onCheckedChange={(checked) => onChange(checked)} />
        ) : (
          <AdminTextInput
            type="number"
            className="w-28"
            min={field.min}
            max={field.max}
            value={String(value ?? '')}
            onChange={(e) => {
              const parsed = Number(e.target.value)
              onChange(clampNumber(Number.isFinite(parsed) ? parsed : field.min ?? 0, field.min, field.max))
            }}
          />
        )}
      </div>
    </div>
  )
}

export default function SystemSettingsPage() {
  const { t } = useTranslation(['admin'])
  useMarkRouteSeen()
  const [settings, setSettings] = useState<SiteSettingsMap | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fieldsByGroup = useMemo(() => {
    const map = new Map<(typeof SITE_SETTING_GROUPS)[number]['key'], SiteSettingFieldDef[]>()
    for (const group of SITE_SETTING_GROUPS) {
      map.set(group.key, SITE_SETTING_FIELDS.filter((f) => f.groupKey === group.key))
    }
    return map
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAdminSiteSettings()
      setSettings(pickSiteSettings(data))
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
      const updated = await updateAdminSiteSettings(pickSiteSettings(settings))
      setSettings(pickSiteSettings(updated))
      appToast.success(t('admin:settings.saved'))
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('admin:settings.saveFail'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppPageStack compact className="pb-20">
      <p className="text-sm text-muted-foreground">{t('admin:settings.pageDesc')}</p>

      {SITE_SETTING_GROUPS.map((group) => {
        const fields = fieldsByGroup.get(group.key) ?? []
        return (
          <AppShellCard key={group.key}>
            <AppShellCardHeader title={t(group.titleKey)} description={t(group.descKey)} />
            {loading || !settings ? (
              <div className="divide-y divide-border/60">
                {fields.map((field) => (
                  <div key={field.key} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-9 w-28 shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {fields.map((field) => (
                  <SettingRow
                    key={field.key}
                    field={field}
                    value={settings[field.key]}
                    onChange={(value) => setValue(field.key, value)}
                  />
                ))}
              </div>
            )}
          </AppShellCard>
        )
      })}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 px-4 py-3 backdrop-blur-md md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="mx-auto flex max-w-3xl justify-end">
          <AdminButton disabled={saving || loading || !settings} onClick={() => void handleSave()}>
            <Save className="size-4" />
            {saving ? t('admin:settings.saving') : t('admin:settings.saveBtn')}
          </AdminButton>
        </div>
      </div>
    </AppPageStack>
  )
}
