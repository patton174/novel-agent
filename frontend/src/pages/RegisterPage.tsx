import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../utils/authApi'
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

const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errorMessage) setErrorMessage('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { username, email, password, confirmPassword } = formData
    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setErrorMessage('请填写所有字段')
      return
    }
    if (password !== confirmPassword) {
      setErrorMessage('两次密码不一致')
      return
    }
    setSubmitting(true)
    setErrorMessage('')
    try {
      await register(username.trim(), password, email.trim())
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
    </AuthPageWrapper>
  )
}

export default RegisterPage
