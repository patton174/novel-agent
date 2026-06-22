import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCw, X } from 'lucide-react'
import { fetchSliderCaptcha, verifySliderCaptcha } from '../../utils/authApi'
import type { SliderCaptchaChallenge } from '../../utils/authApi'
import { appToast } from '@/stores/appToastStore'
import { AppSpinner } from '@/components/loading/AppSpinner'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

/** 与后端 VerificationProperties 保持一致 */
const SLIDER_HEIGHT = 150
const PUZZLE_SIZE = 44
const THUMB_SIZE = 36

type Phase = 'loading' | 'ready' | 'verifying' | 'success' | 'sending' | 'error'

interface Props {
  open: boolean
  onClose: () => void
  onVerified: (captchaToken: string) => void | Promise<void>
}

function preloadImage(base64: string, errorMsg: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => reject(new Error(errorMsg))
    img.src = `data:image/png;base64,${base64}`
  })
}

export const SliderCaptchaModal: React.FC<Props> = ({ open, onClose, onVerified }) => {
  const { t } = useTranslation(['auth'])
  const [challenge, setChallenge] = useState<SliderCaptchaChallenge | null>(null)
  const [trackOffset, setTrackOffset] = useState(0)
  const [serverOffset, setServerOffset] = useState(0)
  const [phase, setPhase] = useState<Phase>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const dragging = useRef(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const loadSeq = useRef(0)

  const maxServerX = challenge ? Math.max(0, challenge.sliderWidth - PUZZLE_SIZE) : 0
  const interactable = phase === 'ready'
  const showOverlay = phase === 'verifying' || phase === 'success' || phase === 'sending'

  const resetLocal = () => {
    setChallenge(null)
    setTrackOffset(0)
    setServerOffset(0)
    dragging.current = false
    setErrorMessage(null)
  }

  const mapTrackToServer = useCallback(
    (thumbX: number, trackWidth: number) => {
      const trackMax = Math.max(0, trackWidth - THUMB_SIZE)
      const clamped = Math.min(trackMax, Math.max(0, thumbX))
      const serverX = trackMax > 0 ? (clamped / trackMax) * maxServerX : 0
      return { trackOffset: clamped, serverOffset: serverX }
    },
    [maxServerX],
  )

  const loadChallenge = useCallback(async () => {
    const seq = ++loadSeq.current
    setPhase('loading')
    resetLocal()
    try {
      const data = await fetchSliderCaptcha()
      if (seq !== loadSeq.current) return
      await Promise.all([
        preloadImage(data.backgroundImage, t('auth:captcha.imgLoadFail')),
        preloadImage(data.puzzleImage, t('auth:captcha.imgLoadFail')),
      ])
      if (seq !== loadSeq.current) return
      setChallenge(data)
      setPhase('ready')
    } catch (err) {
      if (seq !== loadSeq.current) return
      const msg = err instanceof Error ? err.message : t('auth:captcha.loadFail')
      setErrorMessage(msg)
      setPhase('error')
    }
  }, [t])

  useEffect(() => {
    if (open) void loadChallenge()
    else {
      loadSeq.current += 1
      resetLocal()
      setPhase('loading')
    }
  }, [open, loadChallenge])

  const updateOffset = (clientX: number) => {
    if (!interactable) return
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const thumbX = clientX - rect.left - THUMB_SIZE / 2
    const mapped = mapTrackToServer(thumbX, rect.width)
    setTrackOffset(mapped.trackOffset)
    setServerOffset(mapped.serverOffset)
  }

  const finishDrag = async () => {
    if (!dragging.current || !challenge || !interactable) return
    dragging.current = false
    setPhase('verifying')
    try {
      const token = await verifySliderCaptcha(challenge.captchaId, Math.round(serverOffset))
      setPhase('success')
      await new Promise((r) => setTimeout(r, 320))
      setPhase('sending')
      await onVerified(token)
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('auth:captcha.verifyFail')
      appToast.error(msg)
      setTrackOffset(0)
      setServerOffset(0)
      void loadChallenge()
    }
  }

  const statusLabel = () => {
    switch (phase) {
      case 'loading':
        return t('auth:captcha.statusLoading')
      case 'error':
        return errorMessage ?? t('auth:captcha.statusError')
      case 'verifying':
        return t('auth:captcha.statusVerifying')
      case 'success':
        return t('auth:captcha.statusSuccess')
      case 'sending':
        return t('auth:captcha.statusSending')
      default:
        return t('auth:captcha.statusDefault')
    }
  }

  const puzzleStyle =
    challenge && maxServerX >= 0
      ? {
          left: `${(serverOffset / challenge.sliderWidth) * 100}%`,
          top: `${(challenge.puzzleY / SLIDER_HEIGHT) * 100}%`,
          width: `${(PUZZLE_SIZE / challenge.sliderWidth) * 100}%`,
          height: `${(PUZZLE_SIZE / SLIDER_HEIGHT) * 100}%`,
        }
      : undefined

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[1200] flex items-end justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:pb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            type="button"
            aria-label="关闭验证"
            className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="captcha-title"
            aria-busy={phase === 'loading' || phase === 'verifying' || phase === 'sending'}
            className="relative w-full max-w-[360px] overflow-hidden border-2 border-foreground bg-background shadow-[6px_6px_0_0_hsl(var(--foreground))]"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b-2 border-foreground bg-neon px-4 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 id="captcha-title" className="font-mono text-sm font-bold uppercase tracking-wide text-ink">
                    {t('auth:captcha.title')}
                  </h3>
                  <p className="mt-0.5 font-mono text-[11px] text-ink/70">{statusLabel()}</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex size-8 shrink-0 items-center justify-center border-2 border-foreground bg-surface text-foreground shadow-soft transition-colors hover:bg-muted"
                  aria-label="关闭"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="p-4">
              <div
                className="relative mx-auto mb-3 w-full overflow-hidden border-2 border-foreground bg-muted"
                style={{
                  maxWidth: challenge?.sliderWidth ?? 300,
                  aspectRatio: challenge ? `${challenge.sliderWidth}/${SLIDER_HEIGHT}` : '2/1',
                }}
              >
                {phase === 'loading' ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted">
                    <AppSpinner size="sm" />
                    <p className="font-mono text-[11px] font-medium text-muted-foreground">
                      {t('auth:captcha.generating')}
                    </p>
                  </div>
                ) : null}

                {phase === 'error' ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
                    <p className="font-mono text-xs text-muted-foreground">{errorMessage}</p>
                    <button
                      type="button"
                      onClick={() => void loadChallenge()}
                      className="inline-flex items-center gap-1.5 border-2 border-foreground bg-primary px-3 py-1.5 font-mono text-xs font-bold uppercase text-white shadow-soft"
                    >
                      <RefreshCw className="size-3.5" />
                      {t('auth:captcha.reload')}
                    </button>
                  </div>
                ) : null}

                {challenge && phase !== 'loading' && phase !== 'error' ? (
                  <>
                    <img
                      src={`data:image/png;base64,${challenge.backgroundImage}`}
                      alt=""
                      draggable={false}
                      className="absolute inset-0 h-full w-full select-none"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <img
                      src={`data:image/png;base64,${challenge.puzzleImage}`}
                      alt=""
                      draggable={false}
                      className="pointer-events-none absolute select-none drop-shadow-[2px_2px_0_rgba(0,0,0,0.45)]"
                      style={{ ...puzzleStyle, imageRendering: 'pixelated' }}
                    />
                  </>
                ) : null}

                {showOverlay ? (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center bg-background/55 backdrop-blur-[1px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {phase === 'success' ? (
                      <motion.span
                        className="flex size-10 items-center justify-center border-2 border-foreground bg-neon font-mono text-lg font-bold text-ink shadow-soft"
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                      >
                        ✓
                      </motion.span>
                    ) : (
                      <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                        <AppSpinner size="sm" />
                        {phase === 'sending' ? t('auth:captcha.overlaySending') : t('auth:captcha.overlayVerifying')}
                      </div>
                    )}
                  </motion.div>
                ) : null}
              </div>

              <div
                ref={trackRef}
                className={cn(
                  'relative h-10 border-2 border-foreground bg-muted shadow-soft',
                  !interactable && 'pointer-events-none opacity-55',
                )}
                onPointerDown={(e) => {
                  if (!interactable) return
                  dragging.current = true
                  updateOffset(e.clientX)
                  e.currentTarget.setPointerCapture(e.pointerId)
                }}
                onPointerMove={(e) => {
                  if (dragging.current) updateOffset(e.clientX)
                }}
                onPointerUp={() => void finishDrag()}
                onPointerCancel={() => {
                  dragging.current = false
                }}
              >
                <div className="pointer-events-none absolute inset-y-0 left-10 right-3 flex items-center">
                  <span className="truncate font-mono text-[11px] text-muted-foreground">
                    {t('auth:captcha.dragHint')}
                  </span>
                </div>
                <div
                  className="absolute top-0.5 flex size-9 cursor-grab items-center justify-center border-2 border-foreground bg-primary font-mono text-xs font-bold text-white shadow-soft active:cursor-grabbing"
                  style={{ left: trackOffset }}
                >
                  ››
                </div>
              </div>

              <div className="mt-3 flex justify-end gap-2 pb-[max(0px,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 border-2 border-foreground bg-surface px-3 font-mono text-xs font-bold uppercase text-muted-foreground shadow-soft transition-colors hover:bg-muted"
                >
                  {t('auth:captcha.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => void loadChallenge()}
                  disabled={phase === 'loading' || phase === 'verifying' || phase === 'sending'}
                  className="inline-flex h-9 items-center gap-1 border-2 border-foreground bg-surface px-3 font-mono text-xs font-bold uppercase text-primary shadow-soft transition-colors hover:bg-primary/10 disabled:opacity-50"
                >
                  <RefreshCw className={cn('size-3.5', phase === 'loading' && 'animate-spin')} />
                  {t('auth:captcha.change')}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default SliderCaptchaModal
