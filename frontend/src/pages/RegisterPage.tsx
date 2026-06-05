import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register, sendEmailCode } from '../utils/authApi'
import { getFingerprint } from '../security/fingerprint'
import SliderCaptchaModal from '../components/auth/SliderCaptchaModal'
import {
  AuthPageWrapper,
  AuthBackgroundPattern,
  AuthCard,
  AuthCardInner,
  AuthTitleSection,
  AuthLogoIcon,
  AuthFormSection,
  AuthForm,
  AuthFieldGroup,
  AuthLabel,
  AuthField,
  AuthSubmitButton,
  AuthFooterSection,
  AuthErrorText,
  AuthRegisterTerms,
} from '../styles/surfaces'
import { palette } from '../styles/theme'
import styled from 'styled-components'

const CodeRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: stretch;
`

const SendCodeButton = styled.button`
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: ${palette.text};
  border-radius: 8px;
  padding: 0 12px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
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
      navigate('/login')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '注册失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthPageWrapper>
      <AuthBackgroundPattern />
      <AuthCard>
        <AuthCardInner>
          <AuthTitleSection>
            <AuthLogoIcon>
              <svg viewBox="0 0 24 24" fill={palette.accent} width="28" height="28">
                <path d="M0 0h24v24H0z" fill="none" />
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </AuthLogoIcon>
            <h2 className="title">创建账号</h2>
            <p className="subtitle">开始 AI 辅助小说创作</p>
          </AuthTitleSection>

          <AuthFormSection>
            <AuthForm onSubmit={handleSubmit}>
              <AuthFieldGroup>
                <AuthLabel htmlFor="reg-username">用户名</AuthLabel>
                <AuthField
                  id="reg-username"
                  name="username"
                  autoComplete="username"
                  placeholder="yourname"
                  value={formData.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                />
              </AuthFieldGroup>
              <AuthFieldGroup>
                <AuthLabel htmlFor="reg-email">邮箱</AuthLabel>
                <AuthField
                  id="reg-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </AuthFieldGroup>
              <AuthFieldGroup>
                <AuthLabel htmlFor="reg-email-code">邮箱验证码</AuthLabel>
                <CodeRow>
                  <AuthField
                    id="reg-email-code"
                    name="emailCode"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="6 位验证码"
                    value={formData.emailCode}
                    onChange={(e) => handleChange('emailCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                  <SendCodeButton
                    type="button"
                    disabled={sendingCode || cooldown > 0}
                    onClick={handleSendCodeClick}
                  >
                    {cooldown > 0 ? `${cooldown}s` : codeSent ? '重新发送' : '获取验证码'}
                  </SendCodeButton>
                </CodeRow>
              </AuthFieldGroup>
              <AuthFieldGroup>
                <AuthLabel htmlFor="reg-password">密码</AuthLabel>
                <AuthField
                  id="reg-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="至少 6 位"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                />
              </AuthFieldGroup>
              <AuthFieldGroup>
                <AuthLabel htmlFor="reg-confirm">确认密码</AuthLabel>
                <AuthField
                  id="reg-confirm"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="再次输入密码"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                />
              </AuthFieldGroup>
              {errorMessage ? <AuthErrorText>{errorMessage}</AuthErrorText> : null}
              <AuthSubmitButton type="submit" disabled={submitting}>
                {submitting ? '注册中…' : '注册'}
              </AuthSubmitButton>
              <AuthRegisterTerms>
                注册即表示同意《用户协议》和《隐私政策》
              </AuthRegisterTerms>
            </AuthForm>
          </AuthFormSection>

          <AuthFooterSection>
            <span className="footer-text">已有账号？</span>
            <Link to="/login" className="footer-link">
              登录
            </Link>
          </AuthFooterSection>
        </AuthCardInner>
      </AuthCard>

      <SliderCaptchaModal
        open={captchaOpen}
        onClose={() => setCaptchaOpen(false)}
        onVerified={handleCaptchaVerified}
      />
    </AuthPageWrapper>
  )
}

export default RegisterPage
