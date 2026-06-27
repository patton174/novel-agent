import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { TurnstileWidget } from '@/components/auth/TurnstileWidget'
import { AppSpinner } from '@/components/loading/AppSpinner'
import {
  isSecurityChallengeOpen,
  submitSessionChallenge,
  subscribeSecurityChallenge,
} from '@/security/challengeGate'
import { resolveTurnstileConfig, type TurnstilePublicConfig } from '@/utils/turnstile'

export function TurnstileChallengeGate() {
  const { t } = useTranslation(['auth'])
  const [open, setOpen] = useState(isSecurityChallengeOpen())
  const [config, setConfig] = useState<TurnstilePublicConfig | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)

  useEffect(() => subscribeSecurityChallenge(() => setOpen(isSecurityChallengeOpen())), [])

  useEffect(() => {
    if (!open) {
      setToken(null)
      setError(null)
      setSubmitting(false)
      return
    }
    let cancelled = false
    void resolveTurnstileConfig(true).then((c) => {
      if (!cancelled) setConfig(c)
    })
    return () => {
      cancelled = true
    }
  }, [open])

  const submit = useCallback(async (turnstileToken: string) => {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    const ok = await submitSessionChallenge(turnstileToken)
    if (!ok) {
      setError(t('auth:captcha.verifyFail'))
      setToken(null)
      setResetKey((k) => k + 1)
      setSubmitting(false)
    }
  }, [submitting, t])

  useEffect(() => {
    if (open && token && !submitting) {
      void submit(token)
    }
  }, [open, token, submitting, submit])

  const enabled = Boolean(config?.turnstileEnabled && config.turnstileSiteKey)

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="security-challenge-title"
        >
          <motion.div
            className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
          >
            <h3 id="security-challenge-title" className="font-mono text-sm font-bold uppercase tracking-wide text-ink">
              {t('auth:captcha.title')}
            </h3>
            <p className="mt-2 text-sm text-muted">{t('auth:captcha.turnstileHint')}</p>
            <div className="mt-4">
              {!config ? (
                <div className="flex justify-center py-6">
                  <AppSpinner />
                </div>
              ) : enabled ? (
                <TurnstileWidget
                  config={config}
                  resetKey={resetKey}
                  onTokenChange={setToken}
                  onLoadError={() => setError(t('auth:captcha.widgetLoadFail'))}
                />
              ) : (
                <p className="text-sm text-muted">{t('auth:captcha.turnstileHint')}</p>
              )}
            </div>
            {submitting ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted">
                <AppSpinner size="sm" />
                {t('auth:captcha.statusVerifying')}
              </div>
            ) : null}
            {error ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </p>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
