import React, { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { fetchUserInfo } from '../api/userApi'
import { useUserStore } from '../stores/userStore'
import { login } from '../utils/authApi'
import { setSessionCrypto } from '../security/sessionStore'
import { NovelAiWordmark } from '../components/marketing/NovelAiWordmark'
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
      localStorage.removeItem('draft_login_username')
      navigate('/dashboard')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '登录失败')
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
            专为小说创作打造的<br />智能 Agent
          </h1>
          <p className="text-lg text-white/80 leading-relaxed">
            从世界观构建到章节续写，思维链、编排、子代理、流式成稿，为您提供一站式 AI 辅助创作体验。
          </p>
          <div className="flex items-center gap-4 pt-4">
            <div className="flex -space-x-3">
              <div className="w-10 h-10 rounded-full border-2 border-white/20 bg-white/10 backdrop-blur-sm flex items-center justify-center text-xs font-bold">玄</div>
              <div className="w-10 h-10 rounded-full border-2 border-white/20 bg-white/10 backdrop-blur-sm flex items-center justify-center text-xs font-bold">科</div>
              <div className="w-10 h-10 rounded-full border-2 border-white/20 bg-white/10 backdrop-blur-sm flex items-center justify-center text-xs font-bold">言</div>
            </div>
            <p className="text-sm text-white/90 font-medium">已有超过 10,000 名创作者加入</p>
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
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">欢迎回来</h2>
            <p className="text-sm text-muted-foreground">继续你的 AI 辅助创作之旅</p>
          </div>

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
                className="w-full h-10 px-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
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
                className="w-full h-10 px-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              />
            </div>

            {sessionHint && <p className="text-sm text-danger pt-1">{sessionHint}</p>}
            {errorMessage && <p className="text-sm text-danger pt-1">{errorMessage}</p>}

            <button 
              type="submit" 
              disabled={submitting}
              className="w-full h-10 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {submitting ? '登录中…' : '登录'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            还没有账号？{' '}
            <Link to="/register" className="text-primary font-medium hover:underline">
              免费注册
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
