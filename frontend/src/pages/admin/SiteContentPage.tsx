import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, FileText, Save } from 'lucide-react'
import {
  fetchAdminSiteContent,
  SITE_CONTENT_KEYS,
  updateAdminSiteContent,
  type SiteContentItem,
} from '@/api/billingAdminApi'
import { SiteMarkdown } from '@/components/content/SiteMarkdown'
import {
  AppPageStack,
  AppShellCard,
  AppShellCardBody,
  AppShellCardHeader,
} from '@/components/layout/AppPageStack'
import { ProSelect } from '@/components/pro/ProSelect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'

export default function SiteContentPage() {
  const { t } = useTranslation(['admin', 'common'])
  useMarkRouteSeen()
  const [items, setItems] = useState<SiteContentItem[]>([])
  const [selectedKey, setSelectedKey] = useState<string>('privacy')
  const [title, setTitle] = useState('')
  const [bodyMd, setBodyMd] = useState('')
  const [savedTitle, setSavedTitle] = useState('')
  const [savedBodyMd, setSavedBodyMd] = useState('')
  const [preview, setPreview] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const isDirty = useMemo(
    () => title !== savedTitle || bodyMd !== savedBodyMd,
    [title, bodyMd, savedTitle, savedBodyMd],
  )

  const applyItem = useCallback((item: SiteContentItem | undefined, key: string) => {
    const nextTitle = item?.title ?? SITE_CONTENT_KEYS.find((k) => k.key === key)?.label ?? key
    const nextBody = item?.bodyMd ?? ''
    setSelectedKey(key)
    setTitle(nextTitle)
    setBodyMd(nextBody)
    setSavedTitle(nextTitle)
    setSavedBodyMd(nextBody)
    setPreview(false)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await fetchAdminSiteContent()
      setItems(list)
      const current = list.find((i) => i.contentKey === selectedKey) ?? list[0]
      if (current) {
        applyItem(current, current.contentKey)
      }
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('common:feedback.loadFail'))
    } finally {
      setLoading(false)
    }
  }, [applyItem, selectedKey, t])

  useEffect(() => {
    void load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isDirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  const selectKey = (key: string) => {
    if (key === selectedKey) return
    if (isDirty && !window.confirm(t('admin:siteContent.unsavedConfirm'))) return
    const item = items.find((i) => i.contentKey === key)
    applyItem(item, key)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateAdminSiteContent(selectedKey, { title: title.trim(), bodyMd })
      setItems((prev) => {
        const next = prev.filter((i) => i.contentKey !== updated.contentKey)
        return [...next, updated].sort((a, b) => a.contentKey.localeCompare(b.contentKey))
      })
      setSavedTitle(updated.title)
      setSavedBodyMd(updated.bodyMd)
      appToast.success(t('common:feedback.saved'))
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('common:feedback.saveFail'))
    } finally {
      setSaving(false)
    }
  }

  const selectedLabel =
    SITE_CONTENT_KEYS.find((k) => k.key === selectedKey)?.label ?? selectedKey

  if (loading) {
    return (
      <AppPageStack>
        <Skeleton className="h-10 w-full max-w-xl rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </AppPageStack>
    )
  }

  return (
    <AppPageStack>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="hidden w-full shrink-0 lg:sticky lg:top-6 lg:block lg:w-52">
          <AppShellCard>
            <AppShellCardHeader title={t('admin:siteContent.pageTitle')} description={t('admin:siteContent.pageDesc')} />
            <AppShellCardBody className="py-2">
              <ul className="space-y-0.5">
                {SITE_CONTENT_KEYS.map((item) => (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => selectKey(item.key)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                        selectedKey === item.key
                          ? 'bg-primary/10 font-medium text-primary'
                          : 'text-muted-foreground hover:bg-muted',
                      )}
                    >
                      <FileText className="size-4 shrink-0" />
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </AppShellCardBody>
          </AppShellCard>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 lg:hidden">
            <label htmlFor="site-content-key" className="mb-1.5 block font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t('admin:siteContent.editLabel')}
            </label>
            <ProSelect
              id="site-content-key"
              variant="pixel"
              value={selectedKey}
              className="w-full"
              onChange={selectKey}
              options={SITE_CONTENT_KEYS.map((item) => ({
                value: item.key,
                label: item.label,
              }))}
            />
          </div>
          <AppShellCard>
            <AppShellCardHeader
              title={selectedLabel}
              description={
                isDirty ? t('admin:siteContent.unsaved') : t('admin:siteContent.editDesc')
              }
              action={
                <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none"
                    onClick={() => setPreview((p) => !p)}
                  >
                    <Eye className="mr-1.5 size-4" />
                    {preview ? t('admin:siteContent.edit') : t('admin:siteContent.preview')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 sm:flex-none"
                    disabled={saving || !isDirty}
                    onClick={() => void handleSave()}
                  >
                    <Save className="mr-1.5 size-4" />
                    {saving ? t('admin:siteContent.saving') : t('admin:siteContent.save')}
                  </Button>
                </div>
              }
            />
            <AppShellCardBody>
              {preview ? (
                <div>
                  <h3 className="mb-4 text-xl font-semibold">{title || t('admin:siteContent.previewTitle')}</h3>
                  <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-4">
                    <SiteMarkdown text={bodyMd || t('admin:siteContent.empty')} />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('admin:siteContent.titlePlaceholder')} />
                  <textarea
                    value={bodyMd}
                    onChange={(e) => setBodyMd(e.target.value)}
                    rows={18}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder={t('admin:siteContent.bodyPlaceholder')}
                  />
                </div>
              )}
            </AppShellCardBody>
          </AppShellCard>
        </div>
      </div>
    </AppPageStack>
  )
}
