import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchPublicSiteSettings } from '@/api/billingApi'
import { register, sendEmailCode } from '../utils/authApi'
import { getFingerprint } from '../security/fingerprint'
import SliderCaptchaModal from '../components/auth/SliderCaptchaModal'
import { AuthShell } from '../components/auth/AuthShell'
import { AuthSubmitButton } from '../components/auth/AuthSubmitButton'
import { AuthSpinner } from '../components/auth/AuthSpinner'
import { authFieldClass } from '../components/auth/authFieldClass'
import { appToast } from '@/stores/appToastStore'
import { useFormDraft } from '../hooks/useJourneyTracker'
import { cn } from '@/lib/utils'

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

  const handleChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value })
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
    if (!formData.email.trim()) {
      appToast.error('请先填写邮箱')
      return
    }
    if (cooldown > 0 || sendingCode) return
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
    } finally {
      setSendingCode(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { username, email, password, confirmPassword, emailCode } = formData
    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim() || !emailCode.trim()) {
      appToast.error('请填写所有字段')
      return
    }
    if (password !== confirmPassword) {
      appToast.error('两次密码不一致')
      return
    }
    if (!/^\d{6}$/.test(emailCode.trim())) {
      appToast.error('请输入 6 位邮箱验证码')
      return
    }
    setSubmitting(true)
    try {
      await register(username.trim(), password, email.trim(), emailCode.trim())
      clearDraft()
      appToast.success('注册成功，请登录')
      navigate('/login')
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '注册失败')
    } finally {
      setSubmitting(false)
    }
  }

  const sendCodeLabel = () => {
    if (sendingCode) return null
    if (cooldown > 0) return `${cooldown}s`
    return codeSent ? '重新发送' : '获取验证码'
  }

  return (
    <AuthShell
      title="创建账号"
      subtitle="只需几步，即可开始体验"
      marketing={{
        headline: (
          <>
            开启您的
            <br />
            智能创作之旅
          </>
        ),
        description:
          '加入我们，体验前所未有的小说创作方式。AI 助手将成为您最得力的合伙人，助您突破创作瓶颈。',
        footer: (
          <div className="space-y-3.5 pt-2">
            {['每月免费赠送 10,000 Tokens', '完整的世界观记忆与大纲推演', '多端同步，随时随地创作'].map((text) => (
              <div key={text} className="flex items-center gap-3 text-white/90 text-sm">
                <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-xs shrink-0">
                  ✓
                </div>
                <span>{text}</span>
              </div>
            ))}
          </div>
        ),
      }}
      footer={
        !registrationClosed ? (
          <>
            已有账号？{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              登录
            </Link>
          </>
        ) : undefined
      }
    >
      {registrationClosed ? (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-5 py-6 text-center dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">注册功能暂时关闭</p>
          <p className="mt-2 text-xs text-amber-800/80 dark:text-amber-200/70 leading-relaxed">
            平台正在维护中，暂不接受新用户注册。如有疑问请联系管理员。
          </p>
          <Link to="/login" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            已有账号？去登录
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <label htmlFor="reg-username" className="text-sm font-medium text-foreground">
              用户名
            </label>
            <input
              id="reg-username"
              name="username"
              autoComplete="username"
              placeholder="yourname"
              value={formData.username}
              onChange={(e) => handleChange('username', e.target.value)}
              className={authFieldClass}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-email" className="text-sm font-medium text-foreground">
              邮箱
            </label>
            <input
              id="reg-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={authFieldClass}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-email-code" className="text-sm font-medium text-foreground">
              邮箱验证码
            </label>
            <div className="flex gap-2">
              <input
                id="reg-email-code"
                name="emailCode"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6 位验证码"
                value={formData.emailCode}
                onChange={(e) => handleChange('emailCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                className={cn(authFieldClass, 'flex-1')}
              />
              <button
                type="button"
                disabled={sendingCode || cooldown > 0}
                onClick={handleSendCodeClick}
                className={cn(
                  'h-11 min-w-[108px] px-4 rounded-xl border text-sm font-medium transition-all duration-200',
                  'border-border bg-surface hover:bg-surface-hover text-foreground',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  sendingCode && 'border-primary/30 bg-primary/5',
                )}
              >
                {sendingCode ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <AuthSpinner size="sm" />
                    发送中
                  </span>
                ) : (
                  sendCodeLabel()
                )}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-password" className="text-sm font-medium text-foreground">
              密码
            </label>
            <input
              id="reg-password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="至少 6 位"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              className={authFieldClass}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-confirm" className="text-sm font-medium text-foreground">
              确认密码
            </label>
            <input
              id="reg-confirm"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="再次输入密码"
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              className={authFieldClass}
            />
          </div>

          <AuthSubmitButton loading={submitting} loadingText="注册中…" className="mt-3">
            注册
          </AuthSubmitButton>

          <p className="text-xs text-center text-muted-foreground pt-1">
            注册即表示同意
            <Link to="/terms" className="hover:underline text-foreground/80">
              《用户协议》
            </Link>
            和
            <Link to="/privacy" className="hover:underline text-foreground/80">
              《隐私政策》
            </Link>
          </p>
        </form>
      )}

      <SliderCaptchaModal
        open={captchaOpen}
        onClose={() => setCaptchaOpen(false)}
        onVerified={handleCaptchaVerified}
      />
    </AuthShell>
  )
}

export default RegisterPage
