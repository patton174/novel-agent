import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { fetchUserInfo } from '../api/userApi'
import { useUserStore } from '../stores/userStore'
import { login } from '../utils/authApi'
import { setSessionCrypto } from '../security/sessionStore'
import { appToast } from '@/stores/appToastStore'
import { AuthShell } from '../components/auth/AuthShell'
import { AuthSubmitButton } from '../components/auth/AuthSubmitButton'
import { authFieldClass } from '../components/auth/authFieldClass'
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

  useEffect(() => {
    if (sessionHint) appToast.info(sessionHint)
  }, [sessionHint])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      appToast.error('请填写用户名和密码')
      return
    }
    setSubmitting(true)
    setSessionCrypto(null)
    try {
      await login(username.trim(), password)
      try {
        const profile = await fetchUserInfo()
        useUserStore.getState().setProfile(profile)
      } catch (profileErr) {
        appToast.error(
          profileErr instanceof Error
            ? `登录成功，但加载用户信息失败：${profileErr.message}`
            : '登录成功，但加载用户信息失败',
        )
        return
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
      subtitle="继续你的 AI 辅助创作之旅"
      marketing={{
        headline: (
          <>
            专为小说创作打造的
            <br />
            智能 Agent
          </>
        ),
        description:
          '从世界观构建到章节续写，思维链、编排、子代理、流式成稿，为您提供一站式 AI 辅助创作体验。',
        footer: (
          <div className="flex items-center gap-4 pt-2">
            <div className="flex -space-x-3">
              {['玄', '科', '言'].map((c) => (
                <div
                  key={c}
                  className="w-10 h-10 rounded-full border-2 border-white/20 bg-white/10 backdrop-blur-sm flex items-center justify-center text-xs font-bold"
                >
                  {c}
                </div>
              ))}
            </div>
            <p className="text-sm text-white/90 font-medium">已有超过 10,000 名创作者加入</p>
          </div>
        ),
      }}
      footer={
        <>
          还没有账号？{' '}
          <Link to="/register" className="text-primary font-medium hover:underline">
            免费注册
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="login-username" className="text-sm font-medium text-foreground">
            用户名
          </label>
          <input
            id="login-username"
            name="username"
            autoComplete="username"
            placeholder="输入用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={authFieldClass}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="text-sm font-medium text-foreground">
              密码
            </label>
            <Link to="#" className="text-xs text-primary hover:underline">
              忘记密码？
            </Link>
          </div>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="输入密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authFieldClass}
          />
        </div>

        <AuthSubmitButton loading={submitting} loadingText="登录中…" className="mt-2">
          登录
        </AuthSubmitButton>
      </form>
    </AuthShell>
  )
}

export default LoginPage
