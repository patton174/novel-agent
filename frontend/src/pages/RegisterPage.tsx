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
    if (!email.trim()) return '请输入邮箱'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '请输入有效邮箱地址'
    return undefined
  }

  const collectRegisterErrors = (): RegisterErrors => {
    const { username, email, password, confirmPassword, emailCode } = formData
    const next: RegisterErrors = {}
    if (!username.trim()) next.username = '请输入用户名'
    const emailErr = validateEmail(email)
    if (emailErr) next.email = emailErr
    if (!emailCode.trim()) next.emailCode = '请输入邮箱验证码'
    else if (!/^\d{6}$/.test(emailCode.trim())) next.emailCode = '请输入 6 位数字验证码'
    if (!password.trim()) next.password = '请输入密码'
    else if (password.length < 6) next.password = '密码至少 6 位'
    if (!confirmPassword.trim()) next.confirmPassword = '请再次输入密码'
    else if (password !== confirmPassword) next.confirmPassword = '两次密码不一致'
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
      appToast.success('验证码已发送至您的邮箱')
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '验证码发送失败')
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
      appToast.success('注册成功，请登录')
      navigate('/login')
    } catch (err) {
      const message = err instanceof Error ? err.message : '注册失败'
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
    if (sendingCode) return '发送中'
    if (cooldown > 0) return `${cooldown}s`
    return codeSent ? '重发' : '获取验证码'
  }

  return (
    <AuthShell
      title="创建账号"
      subtitle="填写基本信息并完成邮箱验证"
      marketing={{
        headline: '免费开始你的连载项目',
        description: '注册即可体验透明编排、世界观记忆与流式成稿。免费套餐含月度 AI 额度。',
        footer: (
          <div className="flex flex-wrap gap-2 pt-1">
            {['Agent 可试用', '云端保存', '用量透明'].map((text) => (
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
            注册暂不可用。{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              已有账号？去登录
            </Link>
          </>
        ) : (
          <>
            已有账号？{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              登录
            </Link>
          </>
        )
      }
    >
      {registrationClosed ? (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-5 text-center dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">注册功能暂时关闭</p>
          <p className="mt-1.5 text-xs leading-relaxed text-amber-800/80 dark:text-amber-200/70">
            平台维护中，暂不接受新用户。如有疑问请联系管理员。
          </p>
          <Link to="/login" className="mt-3 inline-block text-xs font-medium text-primary hover:underline">
            已有账号？去登录
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid gap-3 min-[480px]:grid-cols-2">
            <AuthField
              id="reg-username"
              name="username"
              label="用户名"
              autoComplete="username"
              placeholder="yourname"
              value={formData.username}
              error={fieldErrors.username}
              onChange={(e) => handleChange('username', e.target.value)}
            />
            <AuthField
              id="reg-email"
              name="email"
              type="email"
              label="邮箱"
              autoComplete="email"
              placeholder="you@email.com"
              value={formData.email}
              error={fieldErrors.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
          </div>

          <AuthCodeField
            id="reg-email-code"
            name="emailCode"
            label="邮箱验证码"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6 位数字"
            value={formData.emailCode}
            error={fieldErrors.emailCode}
            hint={codeSent && !fieldErrors.emailCode ? '验证码已发送，请查收邮件（含垃圾箱）' : undefined}
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
                    发送中
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
              label="密码"
              autoComplete="new-password"
              placeholder="至少 6 位"
              value={formData.password}
              error={fieldErrors.password}
              onChange={(e) => handleChange('password', e.target.value)}
            />
            <AuthField
              id="reg-confirm"
              name="confirmPassword"
              type="password"
              label="确认密码"
              autoComplete="new-password"
              placeholder="再次输入"
              value={formData.confirmPassword}
              error={fieldErrors.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
            />
          </div>

          <AuthSubmitButton loading={submitting} loadingText="注册中…" className="!mt-1">
            完成注册
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
