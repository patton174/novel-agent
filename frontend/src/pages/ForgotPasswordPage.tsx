import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthField } from '@/components/auth/AuthField'
import { AuthLegalNotice } from '@/components/auth/AuthLegalNotice'
import { AuthSubmitButton } from '@/components/auth/AuthSubmitButton'
import { requestPasswordReset } from '@/api/userApi'
import { appToast } from '@/stores/appToastStore'
import { useTranslation } from 'react-i18next'

export default function ForgotPasswordPage() {
  const { t } = useTranslation(['common', 'auth'])
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setFieldError(t('auth:forgot.emailInvalid'))
      return
    }
    setFieldError(undefined)
    setSubmitting(true)
    try {
      await requestPasswordReset(trimmed)
      setSent(true)
      appToast.success(t('auth:forgot.success'))
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('auth:forgot.fail'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title={t('auth:forgot.title')}
      subtitle={t('auth:forgot.subtitle')}
      marketing={{
        headline: t('auth:forgot.marketingHeadline'),
        description: t('auth:forgot.marketingDesc'),
      }}
      legal={<AuthLegalNotice variant="neutral" />}
      footer={
        <>
          {t('auth:forgot.remembered')}{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            {t('auth:forgot.backToLogin')}
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-4 text-sm leading-relaxed text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
          {t('auth:forgot.sentDesc1')}<span className="font-medium">{email.trim()}</span>{' '}
          {t('auth:forgot.sentDesc2')}
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <AuthField
            id="forgot-email"
            name="email"
            type="email"
            label={t('auth:forgot.emailLabel')}
            autoComplete="email"
            placeholder={t('auth:forgot.emailPlaceholder')}
            value={email}
            error={fieldError}
            onChange={(e) => {
              setEmail(e.target.value)
              setFieldError(undefined)
            }}
          />
          <AuthSubmitButton loading={submitting} loadingText={t('auth:forgot.submitting')}>
            {t('auth:forgot.submit')}
          </AuthSubmitButton>
        </form>
      )}
    </AuthShell>
  )
}
