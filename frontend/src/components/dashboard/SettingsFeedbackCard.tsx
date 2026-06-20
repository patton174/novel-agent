import { useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { postDanmaku } from '@/api/billingApi'
import { Button } from '@/components/ui/button'
import { APP_BTN_FULL_MD } from '@/lib/appButtonTokens'
import { cn } from '@/lib/utils'
import { appToast } from '@/stores/appToastStore'
import { useUserStore } from '@/stores/userStore'

const MIN_LEN = 2
const MAX_LEN = 200
const STORAGE_PREFIX = 'novelstudio:feedback:submitted:'

function submittedKey(userId: string | undefined): string | null {
  return userId ? `${STORAGE_PREFIX}${userId}` : null
}

function readSubmitted(userId: string | undefined): boolean {
  const key = submittedKey(userId)
  return key ? localStorage.getItem(key) === '1' : false
}

export function SettingsFeedbackCard() {
  const { t } = useTranslation(['dashboard'])
  const profile = useUserStore((s) => s.profile)
  const userId = profile?.userId
  const [submitted, setSubmitted] = useState<boolean>(() => readSubmitted(userId))
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (submitted) return
    const trimmed = message.trim()
    if (trimmed.length < MIN_LEN) {
      appToast.error(t('dashboard:settings.feedbackMinLength'))
      return
    }
    setSubmitting(true)
    try {
      await postDanmaku(trimmed.slice(0, MAX_LEN))
      const key = submittedKey(userId)
      if (key) localStorage.setItem(key, '1')
      setSubmitted(true)
      setMessage('')
      appToast.success(t('dashboard:settings.feedbackSent'))
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('dashboard:settings.feedbackError')
      appToast.error(msg)
      if (msg.includes('已评价')) {
        const key = submittedKey(userId)
        if (key) localStorage.setItem(key, '1')
        setSubmitted(true)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <CheckCircle2 className="size-4 text-emerald-500" />
        {t('dashboard:settings.feedbackAlreadySubmitted')}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
        disabled={submitting}
        rows={4}
        maxLength={MAX_LEN}
        placeholder={t('dashboard:settings.feedbackPlaceholder')}
        className={cn(
          'min-h-[100px] w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground shadow-xs outline-none',
          'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          'disabled:cursor-not-allowed disabled:opacity-60',
        )}
      />
      <Button
        type="button"
        className={APP_BTN_FULL_MD}
        disabled={submitting || message.trim().length < MIN_LEN}
        onClick={() => void handleSubmit()}
      >
        {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        {t('dashboard:settings.feedbackSubmit')}
      </Button>
    </div>
  )
}
