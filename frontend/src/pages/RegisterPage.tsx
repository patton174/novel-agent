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
import { PixelText } from '@/components/marketing/pixel/PixelText'
import { useFormDraft } from '../hooks/useJourneyTracker'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

type RegisterField = 'username' | 'email' | 'password' | 'confirmPassword' | 'emailCode'
type RegisterErrors = Partial<Record<RegisterField, string>>
type Step = 1 | 2 | 3

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
  const [step, setStep] = useState<Step>(1)
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

  // 步骤 1 校验：用户名 + 邮箱
  const validateStep1 = (): boolean => {
    const next: RegisterErrors = {}
    if (!formData.username.trim()) next.username = t('auth:register.usernameReq')
    const emailErr = validateEmail(formData.email)
    if (emailErr) next.email = emailErr
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  // 步骤 2 校验：验证码格式
  const validateStep2 = (): boolean => {
    const next: RegisterErrors = {}
    if (!formData.emailCode.trim()) next.emailCode = t('auth:register.emailCodeReq')
    else if (!/^\d{6}$/.test(formData.emailCode.trim())) next.emailCode = t('auth:register.emailCodeInvalid')
    setFieldErrors((prev) => ({ ...next, username: prev.username, email: prev.email, password: prev.password, confirmPassword: prev.confirmPassword }))
    return Object.keys(next).length === 0
  }

  // 步骤 3 校验：密码 + 确认
  const validateStep3 = (): boolean => {
    const next: RegisterErrors = {}
    if (!formData.password.trim()) next.password = t('auth:register.passwordReq')
    else if (formData.password.length < 6) next.password = t('auth:register.passwordShort')
    if (!formData.confirmPassword.trim()) next.confirmPassword = t('auth:register.confirmPasswordReq')
    else if (formData.password !== formData.confirmPassword) next.confirmPassword = t('auth:register.passwordMismatch')
    setFieldErrors(next)
    return Object.keys(next).length === 0
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

  // 步骤切换：进入下一步前做对应校验；步骤 2 要求验证码已发送
  const goNext = () => {
    if (step === 1) {
      if (!validateStep1()) return
      if (!codeSent) {
        setFieldErrors((prev) => ({ ...prev, email: t('auth:register.emailCodeReq') }))
        appToast.info(t('auth:register.getCode'))
        return
      }
      setStep(2)
    } else if (step === 2) {
      if (!validateStep2()) return
      setStep(3)
    }
  }

  const goBack = () => {
    if (step > 1) setStep((s) => (s - 1) as Step)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep3()) return
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
        // 若服务端报错指向验证码/账号，回退到对应步骤
        if (mapped.emailCode) setStep(2)
        else if (mapped.username || mapped.email) setStep(1)
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

  const stepMeta = [
    { title: t('auth:register.stepAccountTitle'), desc: t('auth:register.stepAccountDesc') },
    { title: t('auth:register.stepVerifyTitle'), desc: t('auth:register.stepVerifyDesc') },
    { title: t('auth:register.stepSecurityTitle'), desc: t('auth:register.stepSecurityDesc') },
  ]

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
                className="border-2 border-white/40 bg-white/10 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wide text-white"
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
            <Link to="/login" className="font-bold text-primary hover:underline">
              {t('auth:register.hasAccountGoLogin')}
            </Link>
          </>
        ) : (
          <>
            {t('auth:register.hasAccount')}{' '}
            <Link to="/login" className="font-bold text-primary hover:underline">
              {t('auth:register.login')}
            </Link>
          </>
        )
      }
    >
      {registrationClosed ? (
        <div className="border-2 border-foreground bg-neon p-5 text-center">
          <p className="font-mono text-sm font-bold text-ink">{t('auth:register.regClosedTitle')}</p>
          <p className="mt-2 font-mono text-xs leading-relaxed text-ink/80">{t('auth:register.regClosedDesc')}</p>
          <Link to="/login" className="mt-3 inline-block font-mono text-xs font-bold text-primary hover:underline">
            {t('auth:register.hasAccountGoLogin')}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 步骤指示器：3 格 mono 标号，当前格荧光绿 + 黑框 */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div
                  className={cn(
                    'flex h-9 flex-1 items-center justify-center border-2 border-foreground transition-colors',
                    s === step ? 'bg-neon text-ink' : s < step ? 'bg-ink text-white' : 'bg-surface text-muted-foreground',
                  )}
                >
                  <PixelText text={`0${s}`} size="sm" fontWeight={800} presentational />
                </div>
                {s < 3 ? <div className="h-0.5 w-3 shrink-0 bg-black/30" aria-hidden /> : null}
              </React.Fragment>
            ))}
          </div>
          <div className="border-b-2 border-foreground/20 pb-1">
            <p className="text-lg font-black uppercase tracking-tight text-ink">{stepMeta[step - 1].title}</p>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">{stepMeta[step - 1].desc}</p>
          </div>

          {/* 步骤 1：账号 */}
          {step === 1 ? (
            <div className="space-y-4">
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
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleSendCodeClick}
                  disabled={sendingCode || cooldown > 0 || captchaOpen}
                  className={cn(
                    MKT_CTA_AUTH_OUTLINE,
                    'h-11 w-auto shrink-0 px-4 text-xs',
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
                <span className="font-mono text-[11px] text-muted-foreground">
                  {t('auth:register.stepIndicator', { current: step, total: 3 })}
                </span>
              </div>
              <AuthSubmitButton type="button" onClick={goNext}>
                {t('auth:register.stepNext')}
              </AuthSubmitButton>
            </div>
          ) : null}

          {/* 步骤 2：验证码 */}
          {step === 2 ? (
            <div className="space-y-4">
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
                    onClick={handleSendCodeClick}
                    disabled={sendingCode || cooldown > 0 || captchaOpen}
                    className={cn(
                      MKT_CTA_AUTH_OUTLINE,
                      'h-12 w-auto shrink-0 px-3 text-xs',
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
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={goBack}
                  className="h-12 flex-1 border-2 border-foreground bg-surface font-mono text-sm font-bold uppercase tracking-wider text-ink shadow-soft transition-all hover:bg-muted active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  {t('auth:register.stepBack')}
                </button>
                <AuthSubmitButton type="button" onClick={goNext} className="flex-1">
                  {t('auth:register.stepNext')}
                </AuthSubmitButton>
              </div>
            </div>
          ) : null}

          {/* 步骤 3：密码 */}
          {step === 3 ? (
            <div className="space-y-4">
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
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={goBack}
                  className="h-12 flex-1 border-2 border-foreground bg-surface font-mono text-sm font-bold uppercase tracking-wider text-ink shadow-soft transition-all hover:bg-muted active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  {t('auth:register.stepBack')}
                </button>
                <AuthSubmitButton loading={submitting} loadingText={t('auth:register.submitting')} className="flex-1">
                  {t('auth:register.submit')}
                </AuthSubmitButton>
              </div>
            </div>
          ) : null}
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
