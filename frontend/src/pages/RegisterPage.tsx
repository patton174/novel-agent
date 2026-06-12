import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchPublicSiteSettings } from '@/api/billingApi'
import { register, sendEmailCode } from '../utils/authApi'
import { getFingerprint } from '../security/fingerprint'
import SliderCaptchaModal from '../components/auth/SliderCaptchaModal'
import { AuthShell } from '../components/auth/AuthShell'
import { AuthField } from '../components/auth/AuthField'
import { AuthLegalNotice } from '../components/auth/AuthLegalNotice'
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
    const email = formData.email.trim()
    if (!email) {
      appToast.error('请先填写邮箱')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      appToast.error('请输入有效邮箱地址')
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
    const { username, email, password, confirmPassword, emailCode } = formData
    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim() || !emailCode.trim()) {
      appToast.error('请填写所有字段')
      return
    }
    if (password !== confirmPassword) {
      appToast.error('两次密码不一致')
      return
    }
    if (password.length < 6) {
      appToast.error('密码至少 6 位')
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
          <ul className="space-y-2 pt-1 text-sm text-white/85">
            {['完整 Agent 流程可试用', '章节与记忆云端保存', '用量在创作台透明可见'].map((text) => (
              <li key={text} className="flex items-center gap-2">
                <span className="text-indigo-200">✓</span>
                {text}
              </li>
            ))}
          </ul>
        ),
      }}
      legal={!registrationClosed ? <AuthLegalNotice variant="register" /> : undefined}
      footer={
        !registrationClosed ? (
          <>
            已有账号？{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              登录
            </Link>
          </>
        ) : undefined
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
          <div className="grid gap-3 sm:grid-cols-2">
            <AuthField
              id="reg-username"
              name="username"
              label="用户名"
              autoComplete="username"
              placeholder="yourname"
              value={formData.username}
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
              onChange={(e) => handleChange('email', e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="reg-email-code" className="text-xs font-medium text-foreground">
              邮箱验证码
            </label>
            <div className="flex gap-2">
              <input
                id="reg-email-code"
                name="emailCode"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6 位数字"
                value={formData.emailCode}
                onChange={(e) => handleChange('emailCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                className={cn(authFieldClass, 'h-10 min-w-0 flex-1')}
              />
              <button
                type="button"
                disabled={sendingCode || cooldown > 0 || captchaOpen}
                onClick={handleSendCodeClick}
                className={cn(
                  'inline-flex h-10 shrink-0 items-center justify-center rounded-xl border px-3 text-xs font-medium transition-colors',
                  'border-border bg-background text-foreground hover:bg-muted/50',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                {sendingCode ? (
                  <span className="flex items-center gap-1">
                    <AuthSpinner size="sm" />
                    发送中
                  </span>
                ) : (
                  sendCodeLabel()
                )}
              </button>
            </div>
            {codeSent ? (
              <p className="text-[10px] text-emerald-600">验证码已发送，请查收邮件（含垃圾箱）</p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <AuthField
              id="reg-password"
              name="password"
              type="password"
              label="密码"
              autoComplete="new-password"
              placeholder="至少 6 位"
              value={formData.password}
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
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
            />
          </div>

          <AuthSubmitButton loading={submitting} loadingText="注册中…" className="!mt-1">
            注册并登录
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
