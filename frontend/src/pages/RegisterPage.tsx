import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchPublicSiteSettings } from '@/api/billingApi'
import { register, sendEmailCode } from '../utils/authApi'
import { getFingerprint } from '../security/fingerprint'
import SliderCaptchaModal from '../components/auth/SliderCaptchaModal'
import { AuthShell } from '../components/auth/AuthShell'
import { AuthCodeField } from '../components/auth/AuthCodeField'
import { AuthField } from '../components/auth/AuthField'
import { AuthLegalNotice } from '../components/auth/AuthLegalNotice'
import { AuthSubmitButton } from '../components/auth/AuthSubmitButton'
import { AppSpinner } from '@/components/loading/AppSpinner'
import { appToast } from '@/stores/appToastStore'
import { MKT_CTA_AUTH_OUTLINE } from '@/lib/marketingCta'
import { useFormDraft } from '../hooks/useJourneyTracker'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

type RegisterField = 'username' | 'email' | 'password' | 'confirmPassword' | 'emailCode'
type RegisterErrors = Partial<Record<RegisterField, string>>

function mapRegisterServerError(message: string): RegisterErrors {
  const text = message.trim()
  if (!text) return {}
  const lower = text.toLowerCase()
  if (text.includes('验证码') || lower.includes('code') || lower.includes('captcha')) {
    return { emailCode: text }
  }
  if (text.includes('邮箱') || lower.includes('email')) {
    return { email: text }
  }
  if (text.includes('用户名') || lower.includes('username')) {
    return { username: text }
  }
  if (text.includes('密码') || lower.includes('password')) {
    return { password: text }
  }
  return {}
}

const RegisterPage: React.FC = () => {
  const { t } = useTranslation(['common', 'auth'])
  const navigate = useNavigate()
  const [formData, setFormData, clearDraft] = useFormDraft('register_form', {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    emailCode: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [captchaOpen, setCaptchaOpen] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [registrationClosed, setRegistrationClosed] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<RegisterErrors>({})

  useEffect(() => {
    let cancelled = false
    void fetchPublicSiteSettings().then((settings) => {
      if (!cancelled && !settings.registrationEnabled) {
        setRegistrationClosed(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleChange = (name: RegisterField, value: string) => {
    setFormData({ ...formData, [name]: value })
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) return t('auth:register.emailReq')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return t('auth:register.emailInvalid')
    return undefined
  }

  const collectRegisterErrors = (): RegisterErrors => {
    const { username, email, password, confirmPassword, emailCode } = formData
    const next: RegisterErrors = {}
    if (!username.trim()) next.username = t('auth:register.usernameReq')
    const emailErr = validateEmail(email)
    if (emailErr) next.email = emailErr
    if (!emailCode.trim()) next.emailCode = t('auth:register.emailCodeReq')
    else if (!/^\d{6}$/.test(emailCode.trim())) next.emailCode = t('auth:register.emailCodeInvalid')
    if (!password.trim()) next.password = t('auth:register.passwordReq')
    else if (password.length < 6) next.password = t('auth:register.passwordShort')
    if (!confirmPassword.trim()) next.confirmPassword = t('auth:register.confirmPasswordReq')
    else if (password !== confirmPassword) next.confirmPassword = t('auth:register.passwordMismatch')
    return next
  }

  const startCooldown = () => {
    setCooldown(60)
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleSendCodeClick = () => {
    const email = formData.email.trim()
    const emailErr = validateEmail(email)
    if (emailErr) {
      setFieldErrors((prev) => ({ ...prev, email: emailErr }))
      return
    }
    if (cooldown > 0 || sendingCode || captchaOpen) return
    setCaptchaOpen(true)
  }

  const handleCaptchaVerified = async (captchaToken: string) => {
    setSendingCode(true)
    try {
      const fingerprint = await getFingerprint()
      await sendEmailCode(formData.email.trim(), captchaToken, fingerprint)
      setCodeSent(true)
      startCooldown()
      appToast.success(t('auth:register.codeSentSuccess'))
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('auth:register.codeSentFail'))
      throw err
    } finally {
      setSendingCode(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors = collectRegisterErrors()
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }
    const { username, email, password, emailCode } = formData
    setSubmitting(true)
    try {
      await register(username.trim(), password, email.trim(), emailCode.trim())
      clearDraft()
      appToast.success(t('auth:register.success'))
      navigate('/login')
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth:register.fail')
      const mapped = mapRegisterServerError(message)
      if (Object.keys(mapped).length > 0) {
        setFieldErrors(mapped)
      } else {
        appToast.error(message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const sendCodeLabel = () => {
    if (sendingCode) return t('auth:register.sending')
    if (cooldown > 0) return `${cooldown}s`
    return codeSent ? t('auth:register.resend') : t('auth:register.getCode')
  }

  return (
    <AuthShell
      title={t('auth:register.title')}
      subtitle={t('auth:register.subtitle')}
      marketing={{
        headline: t('auth:register.marketingHeadline'),
        description: t('auth:register.marketingDesc'),
        footer: (
          <div className="flex flex-wrap gap-2 pt-1">
            {[t('auth:register.featureAgent'), t('auth:register.featureCloud'), t('auth:register.featureTransparent')].map((text) => (
              <span
                key={text}
                className="rounded-xl border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/90"
              >
                {text}
              </span>
            ))}
          </div>
        ),
      }}
      legal={<AuthLegalNotice variant="register" />}
      footer={
        registrationClosed ? (
          <>
            {t('auth:register.regClosed')}{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              {t('auth:register.hasAccountGoLogin')}
            </Link>
          </>
        ) : (
          <>
            {t('auth:register.hasAccount')}{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              {t('auth:register.login')}
            </Link>
          </>
        )
      }
    >
      {registrationClosed ? (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-5 text-center dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">{t('auth:register.regClosedTitle')}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-amber-800/80 dark:text-amber-200/70">
            {t('auth:register.regClosedDesc')}
          </p>
          <Link to="/login" className="mt-3 inline-block text-xs font-medium text-primary hover:underline">
            {t('auth:register.hasAccountGoLogin')}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid gap-3 min-[480px]:grid-cols-2">
            <AuthField
              id="reg-username"
              name="username"
              label={t('auth:register.usernameLabel')}
              autoComplete="username"
              placeholder={t('auth:register.usernamePlaceholder')}
              value={formData.username}
              error={fieldErrors.username}
              onChange={(e) => handleChange('username', e.target.value)}
            />
            <AuthField
              id="reg-email"
              name="email"
              type="email"
              label={t('auth:register.emailLabel')}
              autoComplete="email"
              placeholder={t('auth:register.emailPlaceholder')}
              value={formData.email}
              error={fieldErrors.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
          </div>

          <AuthCodeField
            id="reg-email-code"
            name="emailCode"
            label={t('auth:register.emailCodeLabel')}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder={t('auth:register.emailCodePlaceholder')}
            value={formData.emailCode}
            error={fieldErrors.emailCode}
            hint={codeSent && !fieldErrors.emailCode ? t('auth:register.emailCodeHint') : undefined}
            onChange={(e) => handleChange('emailCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
            action={
              <button
                type="button"
                disabled={sendingCode || cooldown > 0 || captchaOpen}
                onClick={handleSendCodeClick}
                className={cn(
                  MKT_CTA_AUTH_OUTLINE,
                  'h-11 w-auto shrink-0 px-3 text-xs',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                {sendingCode ? (
                  <span className="flex items-center gap-1">
                    <AppSpinner size="sm" />
                    {t('auth:register.sending')}
                  </span>
                ) : (
                  sendCodeLabel()
                )}
              </button>
            }
          />

          <div className="grid gap-3 min-[480px]:grid-cols-2">
            <AuthField
              id="reg-password"
              name="password"
              type="password"
              label={t('auth:register.passwordLabel')}
              autoComplete="new-password"
              placeholder={t('auth:register.passwordPlaceholder')}
              value={formData.password}
              error={fieldErrors.password}
              onChange={(e) => handleChange('password', e.target.value)}
            />
            <AuthField
              id="reg-confirm"
              name="confirmPassword"
              type="password"
              label={t('auth:register.confirmPasswordLabel')}
              autoComplete="new-password"
              placeholder={t('auth:register.confirmPasswordPlaceholder')}
              value={formData.confirmPassword}
              error={fieldErrors.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
            />
          </div>

          <AuthSubmitButton loading={submitting} loadingText={t('auth:register.submitting')} className="!mt-1">
            {t('auth:register.submit')}
          </AuthSubmitButton>
        </form>
      )}

      <SliderCaptchaModal
        open={captchaOpen}
        onClose={() => {
          if (!sendingCode) setCaptchaOpen(false)
        }}
        onVerified={handleCaptchaVerified}
      />
    </AuthShell>
  )
}

export default RegisterPage
