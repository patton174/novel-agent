import { useCallback, useEffect, useState } from 'react'
import { Eye, FileText, Save } from 'lucide-react'
import {
  fetchAdminSiteContent,
  SITE_CONTENT_KEYS,
  updateAdminSiteContent,
  type SiteContentItem,
} from '@/api/billingAdminApi'
import { AgentMarkdown } from '@/components/agent/AgentMarkdown'
import { Button } from '@/components/ui/button'
import { ContentPending } from '@/components/loading/ContentPending'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'

export default function SiteContentPage() {
  useMarkRouteSeen()
  const [items, setItems] = useState<SiteContentItem[]>([])
  const [selectedKey, setSelectedKey] = useState<string>('privacy')
  const [title, setTitle] = useState('')
  const [bodyMd, setBodyMd] = useState('')
  const [preview, setPreview] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await fetchAdminSiteContent()
      setItems(list)
      const current = list.find((i) => i.contentKey === selectedKey) ?? list[0]
      if (current) {
        setSelectedKey(current.contentKey)
        setTitle(current.title)
        setBodyMd(current.bodyMd)
      }
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [selectedKey])

  useEffect(() => {
    void load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selectKey = (key: string) => {
    setSelectedKey(key)
    const item = items.find((i) => i.contentKey === key)
    setTitle(item?.title ?? SITE_CONTENT_KEYS.find((k) => k.key === key)?.label ?? key)
    setBodyMd(item?.bodyMd ?? '')
    setPreview(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateAdminSiteContent(selectedKey, { title: title.trim(), bodyMd })
      setItems((prev) => {
        const next = prev.filter((i) => i.contentKey !== updated.contentKey)
        return [...next, updated].sort((a, b) => a.contentKey.localeCompare(b.contentKey))
      })
      appToast.success('已保存')
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <ContentPending label="加载站点内容…" />
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
      <aside className="w-full shrink-0 lg:w-48">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">页面</p>
        <ul className="space-y-1">
          {SITE_CONTENT_KEYS.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => selectKey(item.key)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  selectedKey === item.key
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                <FileText className="size-4 shrink-0" />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            编辑 Markdown，保存后公开页与仪表盘公告即时生效。
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setPreview((p) => !p)}>
              <Eye className="mr-1.5 size-4" />
              {preview ? '编辑' : '预览'}
            </Button>
            <Button type="button" size="sm" disabled={saving} onClick={() => void handleSave()}>
              <Save className="mr-1.5 size-4" />
              {saving ? '保存中…' : '保存'}
            </Button>
          </div>
        </div>

        {preview ? (
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">{title || '预览'}</h2>
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
      </div>
    </div>
  )
}
