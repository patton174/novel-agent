import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, X } from 'lucide-react'
import { verifyTurnstile } from '../../utils/authApi'
import { AppSpinner } from '@/components/loading/AppSpinner'
import { TurnstileWidget } from '@/components/auth/TurnstileWidget'
import { resolveTurnstileConfig, resetTurnstileConfigCache, type TurnstilePublicConfig } from '@/utils/turnstile'
import { useTranslation } from 'react-i18next'

type Phase = 'ready' | 'verifying' | 'error'

interface Props {
  open: boolean
  email: string
  onClose: () => void
  onVerified: (captchaToken: string) => void | Promise<void>
}

export const TurnstileModal: React.FC<Props> = ({ open, email, onClose, onVerified }) => {
  const { t } = useTranslation(['auth'])
  const [phase, setPhase] = useState<Phase>('ready')
  const [verifyingStep, setVerifyingStep] = useState<'captcha' | 'action'>('captcha')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileConfig, setTurnstileConfig] = useState<TurnstilePublicConfig | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [widgetLoadFailed, setWidgetLoadFailed] = useState(false)
  const submittingRef = useRef(false)

  const turnstileRequired = Boolean(turnstileConfig?.turnstileEnabled && turnstileConfig.turnstileSiteKey)

  const resetLocal = useCallback(() => {
    setTurnstileToken(null)
    setErrorMessage(null)
    setWidgetLoadFailed(false)
    setVerifyingStep('captcha')
    setPhase('ready')
    submittingRef.current = false
  }, [])

  const retry = useCallback(() => {
    resetTurnstileConfigCache()
    setResetKey((k) => k + 1)
    resetLocal()
  }, [resetLocal])

  useEffect(() => {
    if (!open) {
      resetLocal()
      setTurnstileConfig(null)
      return
    }
    let cancelled = false
    resetLocal()
    void resolveTurnstileConfig(true).then((config) => {
      if (!cancelled) setTurnstileConfig(config)
    })
    return () => {
      cancelled = true
    }
  }, [open, resetLocal])

  const submitVerification = useCallback(
    async (token: string) => {
      if (submittingRef.current) return
      submittingRef.current = true
      setPhase('verifying')
      setErrorMessage(null)
      setVerifyingStep('captcha')
      try {
        const captchaToken = await verifyTurnstile(email.trim(), token)
        setVerifyingStep('action')
        await onVerified(captchaToken)
        onClose()
      } catch (err) {
        const msg = err instanceof Error ? err.message : t('auth:captcha.verifyFail')
        resetTurnstileConfigCache()
        setResetKey((k) => k + 1)
        setTurnstileToken(null)
        setErrorMessage(msg)
        setPhase('error')
      } finally {
        submittingRef.current = false
      }
    },
    [email, onClose, onVerified, t],
  )

  useEffect(() => {
    if (!open || phase !== 'ready' || !turnstileConfig || submittingRef.current) return
    if (!turnstileRequired) {
      void submitVerification('dev-bypass')
      return
    }
    if (turnstileToken) {
      void submitVerification(turnstileToken)
    }
  }, [open, phase, turnstileConfig, turnstileRequired, turnstileToken, submitVerification])

  const statusLabel =
    phase === 'verifying'
      ? verifyingStep === 'action'
        ? t('auth:captcha.statusSending')
        : t('auth:captcha.statusVerifying')
      : phase === 'error'
        ? t('auth:captcha.statusError')
        : widgetLoadFailed
          ? t('auth:captcha.widgetLoadFail')
          : t('auth:captcha.turnstileHint')

  const displayError = errorMessage ?? (widgetLoadFailed ? t('auth:captcha.widgetLoadFail') : null)

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[1200] flex items-end justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:pb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            aria-label={t('auth:captcha.close')}
            className="absolute inset-0 bg-ink/50 backdrop-blur-[2px] disabled:cursor-default"
            onClick={() => {
              if (phase !== 'verifying') onClose()
            }}
            disabled={phase === 'verifying'}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="turnstile-title"
            aria-busy={phase === 'verifying'}
            className="relative w-full max-w-[360px] overflow-hidden border-2 border-foreground bg-background shadow-[6px_6px_0_0_hsl(var(--foreground))]"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b-2 border-foreground bg-neon px-4 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 id="turnstile-title" className="font-mono text-sm font-bold uppercase tracking-wide text-ink">
                    {t('auth:captcha.title')}
                  </h3>
                  <p className="mt-0.5 font-mono text-[11px] text-ink/70">{statusLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={phase === 'verifying'}
                  className="flex size-8 shrink-0 items-center justify-center border-2 border-foreground bg-surface text-foreground shadow-soft disabled:opacity-40"
                  aria-label={t('auth:captcha.close')}
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="p-4">
              {phase === 'verifying' ? (
                <div className="mb-4 flex items-center justify-center gap-2 py-6 font-mono text-xs text-muted-foreground">
                  <AppSpinner size="sm" />
                  {verifyingStep === 'action'
                    ? t('auth:captcha.overlaySending')
                    : t('auth:captcha.overlayVerifying')}
                </div>
              ) : (
                <TurnstileWidget
                  className="mb-4 flex justify-center"
                  config={turnstileConfig}
                  resetKey={resetKey}
                  onTokenChange={setTurnstileToken}
                  onLoadError={() => setWidgetLoadFailed(true)}
                />
              )}

              {displayError && (phase === 'error' || widgetLoadFailed) ? (
                <div
                  role="alert"
                  className="mb-3 border-2 border-destructive/60 bg-destructive/5 px-3 py-2.5"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs leading-relaxed text-destructive">{displayError}</p>
                      <button
                        type="button"
                        onClick={retry}
                        className="mt-2 font-mono text-[11px] font-bold uppercase tracking-wide text-destructive underline underline-offset-2 hover:no-underline"
                      >
                        {t('auth:captcha.retry')}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default TurnstileModal
