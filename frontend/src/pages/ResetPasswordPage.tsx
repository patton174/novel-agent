import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthField } from '@/components/auth/AuthField'
import { AuthLegalNotice } from '@/components/auth/AuthLegalNotice'
import { AuthSubmitButton } from '@/components/auth/AuthSubmitButton'
import { confirmPasswordReset } from '@/api/userApi'
import { appToast } from '@/stores/appToastStore'
import { useTranslation } from 'react-i18next'

export default function ResetPasswordPage() {
  const { t } = useTranslation(['common', 'auth'])
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const linkParams = useMemo(() => {
    const token = searchParams.get('token')?.trim()
    const sig = searchParams.get('sig')?.trim()
    const expRaw = searchParams.get('exp')?.trim()
    const exp = expRaw ? Number(expRaw) : NaN
    if (!token || !sig || !Number.isFinite(exp)) return null
    return { token, sig, exp }
  }, [searchParams])

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!linkParams) return
    const next: { password?: string; confirm?: string } = {}
    if (password.length < 6) next.password = t('auth:reset.passwordShort')
    if (password !== confirm) next.confirm = t('auth:reset.passwordMismatch')
    if (Object.keys(next).length > 0) {
      setFieldErrors(next)
      return
    }
    setFieldErrors({})
    setSubmitting(true)
    try {
      await confirmPasswordReset(linkParams.token, linkParams.sig, linkParams.exp, password)
      appToast.success(t('auth:reset.success'))
      navigate('/login')
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('auth:reset.fail'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title={t('auth:reset.title')}
      subtitle={t('auth:reset.subtitle')}
      marketing={{
        headline: t('auth:reset.marketingHeadline'),
        description: t('auth:reset.marketingDesc'),
      }}
      legal={<AuthLegalNotice variant="neutral" />}
      footer={
        <>
          <Link to="/login" className="font-medium text-primary hover:underline">
            {t('auth:reset.backToLogin')}
          </Link>
        </>
      }
    >
      {!linkParams ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-4 text-sm text-destructive">
          {t('auth:reset.invalidLink1')}
          <Link to="/forgot-password" className="mx-1 font-medium underline">
            {t('auth:reset.invalidLink2')}
          </Link>
          {t('auth:reset.invalidLink3')}
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <AuthField
            id="reset-password"
            name="password"
            type="password"
            label={t('auth:reset.passwordLabel')}
            autoComplete="new-password"
            placeholder={t('auth:reset.passwordPlaceholder')}
            value={password}
            error={fieldErrors.password}
            onChange={(e) => {
              setPassword(e.target.value)
              setFieldErrors((prev) => ({ ...prev, password: undefined }))
            }}
          />
          <AuthField
            id="reset-confirm"
            name="confirmPassword"
            type="password"
            label={t('auth:reset.confirmPasswordLabel')}
            autoComplete="new-password"
            placeholder={t('auth:reset.confirmPasswordPlaceholder')}
            value={confirm}
            error={fieldErrors.confirm}
            onChange={(e) => {
              setConfirm(e.target.value)
              setFieldErrors((prev) => ({ ...prev, confirm: undefined }))
            }}
          />
          <AuthSubmitButton loading={submitting} loadingText={t('auth:reset.submitting')}>
            {t('auth:reset.submit')}
          </AuthSubmitButton>
        </form>
      )}
    </AuthShell>
  )
}
