import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { CheckCircle2, LogIn, XCircle } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthLegalNotice } from '@/components/auth/AuthLegalNotice'
import { AppSpinner } from '@/components/loading/AppSpinner'
import { confirmEmailVerify, fetchUserInfo } from '@/api/userApi'
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
  const { t } = useTranslation(['common', 'auth'])
  const [searchParams] = useSearchParams()
  const setProfile = useUserStore((s) => s.setProfile)
  const isLoggedIn = useUserStore((s) => s.profile != null)
  const [state, setState] = useState<VerifyState>('loading')
  const [message, setMessage] = useState(t('auth:verify.msgLoading'))

  useEffect(() => {
    const token = searchParams.get('token')?.trim()
    const sig = searchParams.get('sig')?.trim()
    const expRaw = searchParams.get('exp')?.trim()
    const exp = expRaw ? Number(expRaw) : NaN

    if (!token || !sig || !Number.isFinite(exp)) {
      setState('error')
      setMessage(t('auth:verify.msgInvalid'))
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
          /* optional */
        }
        setState('success')
        setMessage(t('auth:verify.msgSuccess'))
      })
      .catch((err) => {
        if (cancelled) return
        setState('error')
        setMessage(err instanceof Error ? err.message : t('auth:verify.msgFail'))
      })

    return () => {
      cancelled = true
    }
  }, [searchParams, setProfile, t])

  const Icon = state !== 'loading' ? STATE_ICON[state] : null

  return (
    <AuthShell
      title={state === 'loading' ? t('auth:verify.titleLoading') : state === 'success' ? t('auth:verify.titleSuccess') : t('auth:verify.titleFail')}
      subtitle={
        state === 'loading'
          ? t('auth:verify.subtitleLoading')
          : state === 'success'
            ? t('auth:verify.subtitleSuccess')
            : t('auth:verify.subtitleFail')
      }
      marketing={{
        headline: t('auth:verify.marketingHeadline'),
        description: t('auth:verify.marketingDesc'),
      }}
      legal={state !== 'loading' ? <AuthLegalNotice variant="neutral" /> : undefined}
    >
      {state === 'loading' ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <AppSpinner size="lg" />
          <p className="text-sm text-muted-foreground">{t('auth:verify.msgLoading')}</p>
        </div>
      ) : Icon ? (
        <>
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
          <p className="mt-4 text-center text-sm leading-relaxed text-muted-foreground">{message}</p>
          <div className="mt-6 flex flex-col gap-2">
            {state === 'success' ? (
              <Link to="/dashboard" className={MKT_CTA_AUTH}>
                {t('common:cta.dashboard')}
              </Link>
            ) : (
              <>
                <Link to="/login" className={MKT_CTA_AUTH}>
                  <LogIn className="size-4" />
                  {t('auth:verify.backToLogin')}
                </Link>
                {isLoggedIn ? (
                  <Link to="/dashboard/settings" className={MKT_CTA_AUTH_OUTLINE}>
                    {t('auth:verify.resend')}
                  </Link>
                ) : (
                  <Link to="/register" className={MKT_CTA_AUTH_OUTLINE}>
                    {t('auth:verify.registerAgain')}
                  </Link>
                )}
              </>
            )}
          </div>
        </>
      ) : null}
    </AuthShell>
  )
}
