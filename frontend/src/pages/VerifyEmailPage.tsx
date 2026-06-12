import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, LogIn, XCircle } from 'lucide-react'
import { AuthResultCard } from '@/components/auth/AuthResultCard'
import { InlineBrandLoader } from '@/components/loading/BrandLoader'
import { confirmEmailVerify, fetchUserInfo } from '@/api/userApi'
import { Button } from '@/components/ui/button'
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
      {state === 'loading' ? (
        <InlineBrandLoader label="正在验证邮箱" className="mx-auto py-4" size="md" />
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

      <h1 className="mt-5 text-xl font-bold tracking-tight text-foreground">
        {state === 'loading' ? '验证中' : state === 'success' ? '验证成功' : '验证失败'}
      </h1>

      {state !== 'loading' ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{message}</p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">请稍候，正在确认您的邮箱…</p>
      )}

      {state !== 'loading' ? (
        <div className="mt-6 flex flex-col gap-2">
          {state === 'success' ? (
            <Button asChild className="h-10 w-full rounded-xl">
              <Link to="/dashboard">进入创作台</Link>
            </Button>
          ) : (
            <>
              <Button asChild className="h-10 w-full rounded-xl">
                <Link to="/login">
                  <LogIn className="mr-2 size-4" />
                  返回登录
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-10 w-full rounded-xl">
                <Link to="/dashboard">打开账户设置</Link>
              </Button>
            </>
          )}
        </div>
      ) : null}
    </AuthResultCard>
  )
}
