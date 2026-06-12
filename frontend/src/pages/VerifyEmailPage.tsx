import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, LogIn, XCircle } from 'lucide-react'
import { AuthResultCard } from '@/components/auth/AuthResultCard'
import { AuthSpinner } from '@/components/auth/AuthSpinner'
import { confirmEmailVerify, fetchUserInfo } from '@/api/userApi'
import { NovelAiWordmark } from '@/components/marketing/NovelAiWordmark'
import { MKT_CTA_AUTH, MKT_CTA_AUTH_OUTLINE } from '@/lib/marketingCta'
import { useUserStore } from '@/stores/userStore'
import { cn } from '@/lib/utils'

type VerifyState = 'loading' | 'success' | 'error'

const STATE_ICON: Record<Exclude<VerifyState, 'loading'>, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
}

const STATE_RING: Record<Exclude<VerifyState, 'loading'>, string> = {
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  error: 'bg-destructive/10 text-destructive',
}

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const setProfile = useUserStore((s) => s.setProfile)
  const isLoggedIn = useUserStore((s) => s.profile != null)
  const [state, setState] = useState<VerifyState>('loading')
  const [message, setMessage] = useState('正在验证邮箱…')

  useEffect(() => {
    const token = searchParams.get('token')?.trim()
    const sig = searchParams.get('sig')?.trim()
    const expRaw = searchParams.get('exp')?.trim()
    const exp = expRaw ? Number(expRaw) : NaN

    if (!token || !sig || !Number.isFinite(exp)) {
      setState('error')
      setMessage('验证链接无效或已过期，请重新申请验证邮件。')
      return
    }

    let cancelled = false
    void confirmEmailVerify(token, sig, exp)
      .then(async () => {
        if (cancelled) return
        try {
          const profile = await fetchUserInfo()
          if (!cancelled) setProfile(profile)
        } catch {
          /* profile refresh optional */
        }
        setState('success')
        setMessage('邮箱验证成功，您现在可以使用完整功能。')
      })
      .catch((err) => {
        if (cancelled) return
        setState('error')
        setMessage(err instanceof Error ? err.message : '邮箱验证失败，请稍后重试。')
      })

    return () => {
      cancelled = true
    }
  }, [searchParams, setProfile])

  const Icon = state !== 'loading' ? STATE_ICON[state] : null

  return (
    <AuthResultCard>
      <Link to="/" className="mx-auto mb-4 inline-block transition-opacity hover:opacity-85">
        <NovelAiWordmark size="sm" animate={false} />
      </Link>

      {state === 'loading' ? (
        <div className="flex flex-col items-center gap-2 py-4">
          <AuthSpinner size="md" />
          <p className="text-sm text-muted-foreground">正在验证邮箱…</p>
        </div>
      ) : Icon ? (
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          className={cn(
            'mx-auto flex size-14 items-center justify-center rounded-2xl',
            STATE_RING[state],
          )}
        >
          <Icon className="size-7" strokeWidth={2} />
        </motion.div>
      ) : null}

      {state !== 'loading' ? (
        <>
          <h1 className="mt-5 text-xl font-bold tracking-tight text-foreground">
            {state === 'success' ? '验证成功' : '验证失败'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{message}</p>
        </>
      ) : null}

      {state !== 'loading' ? (
        <div className="mt-6 flex flex-col gap-2">
          {state === 'success' ? (
            <Link to="/dashboard" className={MKT_CTA_AUTH}>
              进入创作台
            </Link>
          ) : (
            <>
              <Link to="/login" className={MKT_CTA_AUTH}>
                <LogIn className="size-4" />
                返回登录
              </Link>
              {isLoggedIn ? (
                <Link to="/dashboard/settings" className={MKT_CTA_AUTH_OUTLINE}>
                  账户设置 · 重发验证邮件
                </Link>
              ) : (
                <Link to="/register" className={MKT_CTA_AUTH_OUTLINE}>
                  重新注册
                </Link>
              )}
            </>
          )}
        </div>
      ) : null}
    </AuthResultCard>
  )
}
