import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { confirmEmailVerify, fetchUserInfo } from '@/api/userApi'
import { Button } from '@/components/ui/button'
import { useUserStore } from '@/stores/userStore'

type VerifyState = 'loading' | 'success' | 'error'

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
      setMessage('验证链接无效，缺少签名参数')
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
        setMessage(err instanceof Error ? err.message : '邮箱验证失败')
      })

    return () => {
      cancelled = true
    }
  }, [searchParams, setProfile])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-soft">
        {state === 'loading' ? (
          <Loader2 className="mx-auto size-10 animate-spin text-primary" />
        ) : state === 'success' ? (
          <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
        ) : (
          <XCircle className="mx-auto size-10 text-destructive" />
        )}

        <h1 className="mt-4 text-lg font-semibold text-foreground">
          {state === 'loading' ? '验证中' : state === 'success' ? '验证成功' : '验证失败'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{message}</p>

        {state !== 'loading' ? (
          <Button asChild className="mt-6 rounded-xl">
            <Link to="/dashboard">进入仪表盘</Link>
          </Button>
        ) : null}
      </div>
    </div>
  )
}
