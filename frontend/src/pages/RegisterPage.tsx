import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register, sendEmailCode } from '../utils/authApi'
import { getFingerprint } from '../security/fingerprint'
import SliderCaptchaModal from '../components/auth/SliderCaptchaModal'
import { NovelAiWordmark } from '../components/marketing/NovelAiWordmark'
import { useFormDraft } from '../hooks/useJourneyTracker'

const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const [formData, setFormData, clearDraft] = useFormDraft('register_form', {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    emailCode: '',
  })
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [captchaOpen, setCaptchaOpen] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errorMessage) setErrorMessage('')
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
      setErrorMessage('请先填写邮箱')
      return
    }
    if (cooldown > 0) return
    setCaptchaOpen(true)
  }

  const handleCaptchaVerified = async (captchaToken: string) => {
    setSendingCode(true)
    setErrorMessage('')
    try {
      const fingerprint = await getFingerprint()
      await sendEmailCode(formData.email.trim(), captchaToken, fingerprint)
      setCodeSent(true)
      startCooldown()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '验证码发送失败')
    } finally {
      setSendingCode(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { username, email, password, confirmPassword, emailCode } = formData
    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim() || !emailCode.trim()) {
      setErrorMessage('请填写所有字段')
      return
    }
    if (password !== confirmPassword) {
      setErrorMessage('两次密码不一致')
      return
    }
    if (!/^\d{6}$/.test(emailCode.trim())) {
      setErrorMessage('请输入6位邮箱验证码')
      return
    }
    setSubmitting(true)
    setErrorMessage('')
    try {
      await register(username.trim(), password, email.trim(), emailCode.trim())
      clearDraft()
      navigate('/login')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '注册失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Marketing Info */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-primary text-white p-12 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-gradient-to-br from-white/10 to-transparent rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-full h-[50%] bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

        <div className="relative z-10">
          <Link to="/" className="inline-block hover:opacity-80 transition-opacity">
            <NovelAiWordmark size="md" animate={false} className="text-white" />
          </Link>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <h1 className="text-4xl font-bold leading-tight">
            开启您的<br />智能创作之旅
          </h1>
          <p className="text-lg text-white/80 leading-relaxed">
            加入我们，体验前所未有的小说创作方式。AI 助手将成为您最得力的合伙人，助您突破创作瓶颈。
          </p>
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-3 text-white/90">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm">✓</div>
              <span>每月免费赠送 10,000 Tokens</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm">✓</div>
              <span>完整的世界观记忆与大纲推演</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm">✓</div>
              <span>多端同步，随时随地创作</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-white/60">
          © {new Date().getFullYear()} Novel Agent. All rights reserved.
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12 relative">
        <Link to="/" className="lg:hidden mb-8 hover:opacity-80 transition-opacity">
          <NovelAiWordmark size="md" animate={false} />
        </Link>

        <div className="w-full max-w-[360px]">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">创建账号</h2>
            <p className="text-sm text-muted-foreground">只需几步，即可开始体验</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
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
                className="w-full h-10 px-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              />
            </div>
            
            <div className="space-y-1">
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
                className="w-full h-10 px-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              />
            </div>

            <div className="space-y-1">
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
                  className="flex-1 h-10 px-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                />
                <button
                  type="button"
                  disabled={sendingCode || cooldown > 0}
                  onClick={handleSendCodeClick}
                  className="h-10 px-4 rounded-lg border border-border bg-surface hover:bg-surface-hover text-sm font-medium text-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {cooldown > 0 ? `${cooldown}s` : codeSent ? '重新发送' : '获取验证码'}
                </button>
              </div>
            </div>

            <div className="space-y-1">
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
                className="w-full h-10 px-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              />
            </div>

            <div className="space-y-1">
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
                className="w-full h-10 px-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              />
            </div>

            {errorMessage && <p className="text-sm text-danger pt-1">{errorMessage}</p>}

            <button 
              type="submit" 
              disabled={submitting}
              className="w-full h-10 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {submitting ? '注册中…' : '注册'}
            </button>
            
            <p className="text-xs text-center text-muted-foreground mt-3">
              注册即表示同意<Link to="/terms" className="hover:underline">《用户协议》</Link>和<Link to="/privacy" className="hover:underline">《隐私政策》</Link>
            </p>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            已有账号？{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              登录
            </Link>
          </div>
        </div>
      </div>

      <SliderCaptchaModal
        open={captchaOpen}
        onClose={() => setCaptchaOpen(false)}
        onVerified={handleCaptchaVerified}
      />
    </div>
  )
}

export default RegisterPage
