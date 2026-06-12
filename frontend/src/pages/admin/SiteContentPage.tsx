import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, FileText, Save } from 'lucide-react'
import {
  fetchAdminSiteContent,
  SITE_CONTENT_KEYS,
  updateAdminSiteContent,
  type SiteContentItem,
} from '@/api/billingAdminApi'
import { AgentMarkdown } from '@/components/agent/AgentMarkdown'
import {
  AppPageStack,
  AppShellCard,
  AppShellCardBody,
  AppShellCardHeader,
} from '@/components/layout/AppPageStack'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'

export default function SiteContentPage() {
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
      appToast.error(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [applyItem, selectedKey])

  useEffect(() => {
    void load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selectKey = (key: string) => {
    if (key === selectedKey) return
    if (isDirty && !window.confirm('有未保存的更改，确定切换页面？')) return
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
      appToast.success('已保存')
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const selectedLabel =
    SITE_CONTENT_KEYS.find((k) => k.key === selectedKey)?.label ?? selectedKey

  const keyPicker = (className?: string) => (
    <div className={cn('flex gap-2', className)}>
      {SITE_CONTENT_KEYS.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => selectKey(item.key)}
          className={cn(
            'shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors lg:w-full lg:rounded-lg lg:px-3 lg:py-2 lg:text-left',
            selectedKey === item.key
              ? 'border-primary/30 bg-primary/10 font-medium text-primary'
              : 'border-border text-muted-foreground hover:bg-muted',
          )}
        >
          <span className="inline-flex items-center gap-2">
            <FileText className="hidden size-4 shrink-0 lg:inline" />
            {item.label}
          </span>
        </button>
      ))}
    </div>
  )

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
        <aside className="w-full shrink-0 lg:sticky lg:top-6 lg:w-52">
          <AppShellCard>
            <AppShellCardHeader title="页面" description="隐私 · 条款 · 公告" />
            <AppShellCardBody className="py-2">
              <div className="-mx-1 overflow-x-auto px-1 pb-1 lg:hidden">{keyPicker('min-w-max')}</div>
              <ul className="hidden space-y-0.5 lg:block">
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
          <AppShellCard>
            <AppShellCardHeader
              title={selectedLabel}
              description={
                isDirty ? '有未保存的更改' : '编辑 Markdown，保存后公开页与仪表盘公告即时生效。'
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
                    {preview ? '编辑' : '预览'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 sm:flex-none"
                    disabled={saving || !isDirty}
                    onClick={() => void handleSave()}
                  >
                    <Save className="mr-1.5 size-4" />
                    {saving ? '保存中…' : '保存'}
                  </Button>
                </div>
              }
            />
            <AppShellCardBody>
              {preview ? (
                <div>
                  <h3 className="mb-4 text-xl font-semibold">{title || '预览'}</h3>
                  <div className="prose prose-slate max-w-none text-muted-foreground">
                    <AgentMarkdown text={bodyMd || '*（空）*'} variant="memory" />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="标题" />
                  <textarea
                    value={bodyMd}
                    onChange={(e) => setBodyMd(e.target.value)}
                    rows={18}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Markdown 正文"
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
