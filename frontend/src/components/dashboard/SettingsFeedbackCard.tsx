import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { postDanmaku } from '@/api/billingApi'
import { Button } from '@/components/ui/button'
import { APP_BTN_FULL_MD } from '@/lib/appButtonTokens'
import { cn } from '@/lib/utils'
import { appToast } from '@/stores/appToastStore'

const MIN_LEN = 2
const MAX_LEN = 200

export function SettingsFeedbackCard() {
  const { t } = useTranslation(['dashboard'])
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    const trimmed = message.trim()
    if (trimmed.length < MIN_LEN) {
      appToast.error(t('dashboard:settings.feedbackMinLength'))
      return
    }
    setSubmitting(true)
    try {
      await postDanmaku(trimmed.slice(0, MAX_LEN))
      setMessage('')
      appToast.success(t('dashboard:settings.feedbackSent'))
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('dashboard:settings.feedbackError'))
    } finally {
      setSubmitting(false)
    }
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
