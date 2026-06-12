import React, { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { fetchUserInfo } from '../api/userApi'
import { useUserStore, type UserRole } from '../stores/userStore'
import { login } from '../utils/authApi'
import { clearAuthSession } from '../security/sessionStore'
import { appToast } from '@/stores/appToastStore'
import { AuthShell } from '../components/auth/AuthShell'
import { AuthField } from '../components/auth/AuthField'
import { AuthLegalNotice } from '../components/auth/AuthLegalNotice'
import { AuthSubmitButton } from '../components/auth/AuthSubmitButton'
import { useFormDraft } from '../hooks/useJourneyTracker'

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionHint = useMemo(() => {
    if (searchParams.get('reason') === 'session_expired') {
      return '登录已过期，请重新登录'
    }
    return ''
  }, [searchParams])
  const [username, setUsername] = useFormDraft('login_username', '')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      appToast.error('请填写用户名和密码')
      return
    }
    setSubmitting(true)
    clearAuthSession()
    try {
      const loginResult = await login(username.trim(), password)
      try {
        const profile = await fetchUserInfo()
        useUserStore.getState().setProfile(profile)
      } catch (profileErr) {
        if (loginResult.userId != null && loginResult.username) {
          useUserStore.getState().setProfile({
            userId: String(loginResult.userId),
            username: loginResult.username,
            email: '',
            role: (loginResult.role as UserRole) ?? 'user',
          })
          appToast.info('已使用登录信息进入，个人资料将稍后同步')
        } else {
          appToast.error(
            profileErr instanceof Error
              ? `登录成功，但加载用户信息失败：${profileErr.message}`
              : '登录成功，但加载用户信息失败',
          )
          return
        }
      }
      localStorage.removeItem('draft_login_username')
      appToast.success('欢迎回来')
      navigate('/dashboard')
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '登录失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="欢迎回来"
      subtitle="登录以继续创作与同步项目"
      marketing={{
        headline: '可编排、可记忆的连载助手',
        description: '登录后恢复章节、会话与世界观记忆，从上次停笔处继续。',
        footer: (
          <div className="flex flex-wrap gap-2 pt-1">
            {['流式成稿', '记忆持久化', '用量透明'].map((text) => (
              <span
                key={text}
                className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/90"
              >
                {text}
              </span>
            ))}
          </div>
        ),
      }}
      legal={<AuthLegalNotice variant="login" />}
      footer={
        <>
          还没有账号？{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            免费注册
          </Link>
        </>
      }
    >
      {sessionHint ? (
        <p className="mb-3 rounded-lg border border-sky-200/80 bg-sky-50/90 px-3 py-2 text-xs text-sky-900 dark:border-sky-800/50 dark:bg-sky-950/40 dark:text-sky-100">
          {sessionHint}
        </p>
      ) : null}
      <form onSubmit={handleSubmit} className="space-y-3">
        <AuthField
          id="login-username"
          name="username"
          label="用户名"
          autoComplete="username"
          placeholder="输入用户名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <AuthField
          id="login-password"
          name="password"
          type="password"
          label="密码"
          autoComplete="current-password"
          placeholder="输入密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={
            <Link
              to="/contact"
              className="inline-flex min-h-9 items-center py-1 text-xs text-primary hover:underline"
            >
              忘记密码？联系客服
            </Link>
          }
        />

        <AuthSubmitButton loading={submitting} loadingText="登录中…" className="!mt-1">
          登录
        </AuthSubmitButton>
      </form>
    </AuthShell>
  )
}

export default LoginPage
