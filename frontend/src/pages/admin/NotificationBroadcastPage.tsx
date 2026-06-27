import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Send } from 'lucide-react'
import { broadcastNotification, type NotificationCategory } from '@/api/notificationApi'
import {
  AppPageStack,
  AppShellCard,
  AppShellCardHeader,
} from '@/components/layout/AppPageStack'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { APP_BTN_MD } from '@/lib/appButtonTokens'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { appToast } from '@/stores/appToastStore'

const CATEGORIES: NotificationCategory[] = ['system', 'marketing', 'billing', 'agent']

export default function NotificationBroadcastPage() {
  const { t } = useTranslation(['notification'])
  useMarkRouteSeen()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<NotificationCategory>('system')
  const [sending, setSending] = useState(false)

  const handleSubmit = useCallback(async () => {
    const trimmedTitle = title.trim()
    const trimmedBody = body.trim()
    if (!trimmedTitle || !trimmedBody) return

    setSending(true)
    try {
      await broadcastNotification({
        title: trimmedTitle,
        body: trimmedBody,
        category,
      })
      appToast.success(t('notification:broadcast.success'))
      setTitle('')
      setBody('')
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('notification:broadcast.fail'))
    } finally {
      setSending(false)
    }
  }, [body, category, t, title])

  return (
    <AppPageStack>
      <AppShellCard>
        <AppShellCardHeader
          title={t('notification:broadcast.title')}
          description={t('notification:broadcast.desc')}
        />
        <div className="flex flex-col gap-4 p-4 pt-0">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-xs font-bold uppercase">{t('notification:broadcast.titleLabel')}</span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-xs font-bold uppercase">{t('notification:broadcast.bodyLabel')}</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              maxLength={4000}
              className="min-h-[120px] w-full resize-y border-2 border-foreground bg-background px-3 py-2 font-mono text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-xs font-bold uppercase">{t('notification:broadcast.categoryLabel')}</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as NotificationCategory)}
              className="h-10 w-full border-2 border-foreground bg-background px-3 font-mono text-sm"
            >
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {t(`notification:category.${value}`)}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            className={APP_BTN_MD}
            disabled={sending || !title.trim() || !body.trim()}
            onClick={() => void handleSubmit()}
          >
            <Send className="size-4" />
            {t('notification:broadcast.submit')}
          </Button>
        </div>
      </AppShellCard>
    </AppPageStack>
  )
}
