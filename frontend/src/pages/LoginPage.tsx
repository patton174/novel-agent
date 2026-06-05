import React, { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { fetchUserInfo } from '../api/userApi'
import { useUserStore } from '../stores/userStore'
import { login } from '../utils/authApi'
import { setSessionCrypto } from '../security/sessionStore'
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
} from '../styles/surfaces'
import { palette } from '../styles/theme'

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionHint = useMemo(() => {
    if (searchParams.get('reason') === 'session_expired') {
      return '登录已过期，请重新登录'
    }
    return ''
  }, [searchParams])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setErrorMessage('请填写用户名和密码')
      return
    }
    setSubmitting(true)
    setErrorMessage('')
    setSessionCrypto(null)
    try {
      await login(username.trim(), password)
      try {
        const profile = await fetchUserInfo()
        useUserStore.getState().setProfile(profile)
      } catch (profileErr) {
        setErrorMessage(
          profileErr instanceof Error
            ? `登录成功，但加载用户信息失败：${profileErr.message}`
            : '登录成功，但加载用户信息失败',
        )
        return
      }
      navigate('/dashboard')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '登录失败')
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
            <h2 className="title">登录 Novel AI</h2>
            <p className="subtitle">继续你的创作之旅</p>
          </AuthTitleSection>

          <AuthFormSection>
            <AuthForm onSubmit={handleSubmit}>
              <AuthFieldGroup>
                <AuthLabel htmlFor="login-username">用户名</AuthLabel>
                <AuthField
                  id="login-username"
                  name="username"
                  autoComplete="username"
                  placeholder="输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </AuthFieldGroup>
              <AuthFieldGroup>
                <AuthLabel htmlFor="login-password">密码</AuthLabel>
                <AuthField
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </AuthFieldGroup>
              {sessionHint ? <AuthErrorText>{sessionHint}</AuthErrorText> : null}
              {errorMessage ? <AuthErrorText>{errorMessage}</AuthErrorText> : null}
              <AuthSubmitButton type="submit" disabled={submitting}>
                {submitting ? '登录中…' : '登录'}
              </AuthSubmitButton>
            </AuthForm>
          </AuthFormSection>

          <AuthFooterSection>
            <span className="footer-text">还没有账号？</span>
            <Link to="/register" className="footer-link">
              注册
            </Link>
          </AuthFooterSection>
        </AuthCardInner>
      </AuthCard>
    </AuthPageWrapper>
  )
}

export default LoginPage
