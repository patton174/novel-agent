import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCw, X } from 'lucide-react'
import { fetchSliderCaptcha, verifySliderCaptcha } from '../../utils/authApi'
import type { SliderCaptchaChallenge } from '../../utils/authApi'
import { appToast } from '@/stores/appToastStore'
import { AuthLegalNotice } from './AuthLegalNotice'
import { AuthSpinner } from './AuthSpinner'
import { cn } from '@/lib/utils'

const SLIDER_HEIGHT = 140
const PUZZLE_SIZE = 44
const THUMB_SIZE = 36

type Phase = 'loading' | 'ready' | 'verifying' | 'success' | 'sending' | 'error'

interface Props {
  open: boolean
  onClose: () => void
  onVerified: (captchaToken: string) => void | Promise<void>
}

function preloadImage(base64: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('验证图加载失败'))
    img.src = `data:image/png;base64,${base64}`
  })
}

export const SliderCaptchaModal: React.FC<Props> = ({ open, onClose, onVerified }) => {
  const [challenge, setChallenge] = useState<SliderCaptchaChallenge | null>(null)
  const [offsetX, setOffsetX] = useState(0)
  const [phase, setPhase] = useState<Phase>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const dragging = useRef(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const loadSeq = useRef(0)

  const maxOffset = challenge ? Math.max(0, challenge.sliderWidth - PUZZLE_SIZE - 4) : 0
  const interactable = phase === 'ready'
  const showOverlay = phase === 'verifying' || phase === 'success' || phase === 'sending'

  const resetLocal = () => {
    setChallenge(null)
    setOffsetX(0)
    dragging.current = false
    setErrorMessage(null)
  }

  const loadChallenge = useCallback(async () => {
    const seq = ++loadSeq.current
    setPhase('loading')
    resetLocal()
    try {
      const data = await fetchSliderCaptcha()
      if (seq !== loadSeq.current) return
      await Promise.all([preloadImage(data.backgroundImage), preloadImage(data.puzzleImage)])
      if (seq !== loadSeq.current) return
      setChallenge(data)
      setPhase('ready')
    } catch (err) {
      if (seq !== loadSeq.current) return
      const msg = err instanceof Error ? err.message : '验证码加载失败'
      setErrorMessage(msg)
      setPhase('error')
    }
  }, [])

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
    const x = clientX - rect.left - THUMB_SIZE / 2
    setOffsetX(Math.min(maxOffset, Math.max(0, x)))
  }

  const finishDrag = async () => {
    if (!dragging.current || !challenge || !interactable) return
    dragging.current = false
    setPhase('verifying')
    try {
      const token = await verifySliderCaptcha(challenge.captchaId, Math.round(offsetX))
      setPhase('success')
      await new Promise((r) => setTimeout(r, 320))
      setPhase('sending')
      await onVerified(token)
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '验证失败，请重试'
      appToast.error(msg)
      setOffsetX(0)
      void loadChallenge()
    }
  }

  const statusLabel = () => {
    switch (phase) {
      case 'loading':
        return '正在准备验证图…'
      case 'error':
        return errorMessage ?? '加载失败'
      case 'verifying':
        return '校验拼图位置…'
      case 'success':
        return '验证通过'
      case 'sending':
        return '正在发送验证码…'
      default:
        return '拖动滑块，将拼图对齐缺口'
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[1200] flex items-end justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            type="button"
            aria-label="关闭验证"
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-[4px]"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="captcha-title"
            aria-busy={phase === 'loading' || phase === 'verifying' || phase === 'sending'}
            className="relative w-full max-w-[380px] overflow-hidden rounded-2xl border border-border/80 bg-background shadow-2xl shadow-primary/10"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-0.5 bg-gradient-to-r from-primary via-indigo-400 to-violet-400" />

            <div className="p-4 sm:p-5">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 id="captcha-title" className="text-sm font-semibold text-foreground">
                    安全验证
                  </h3>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{statusLabel()}</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  aria-label="关闭"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div
                className="relative mx-auto mb-3 overflow-hidden rounded-xl border border-border bg-muted/25"
                style={{
                  width: challenge?.sliderWidth ?? '100%',
                  maxWidth: '100%',
                  height: SLIDER_HEIGHT,
                }}
              >
                {phase === 'loading' ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/40">
                    <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted/80 via-muted/40 to-muted/70" />
                    <AuthSpinner size="sm" />
                    <p className="relative z-10 text-[11px] font-medium text-muted-foreground">
                      生成验证图中…
                    </p>
                  </div>
                ) : null}

                {phase === 'error' ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
                    <p className="text-xs text-muted-foreground">{errorMessage}</p>
                    <button
                      type="button"
                      onClick={() => void loadChallenge()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                    >
                      <RefreshCw className="size-3.5" />
                      重新加载
                    </button>
                  </div>
                ) : null}

                {challenge && phase !== 'loading' && phase !== 'error' ? (
                  <>
                    <img
                      src={`data:image/png;base64,${challenge.backgroundImage}`}
                      alt=""
                      draggable={false}
                      className="h-full w-full select-none object-cover"
                    />
                    <img
                      src={`data:image/png;base64,${challenge.puzzleImage}`}
                      alt=""
                      draggable={false}
                      className="pointer-events-none absolute size-11 select-none drop-shadow-md"
                      style={{ left: offsetX, top: challenge.puzzleY }}
                    />
                  </>
                ) : null}

                {showOverlay ? (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[2px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {phase === 'success' ? (
                      <motion.span
                        className="flex size-10 items-center justify-center rounded-full bg-emerald-500/15 text-lg font-bold text-emerald-600"
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                      >
                        ✓
                      </motion.span>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <AuthSpinner size="sm" />
                        {phase === 'sending' ? '发送验证码中…' : '验证中…'}
                      </div>
                    )}
                  </motion.div>
                ) : null}
              </div>

              <AuthLegalNotice variant="captcha" className="mb-3" />

              <div
                ref={trackRef}
                className={cn(
                  'relative h-10 rounded-full border border-border bg-muted/35',
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
                  <span className="truncate text-[11px] text-muted-foreground">向右拖动滑块</span>
                </div>
                <div
                  className="absolute top-0.5 flex size-9 cursor-grab items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md active:cursor-grabbing"
                  style={{ left: offsetX }}
                >
                  <span className="text-xs font-bold">››</span>
                </div>
              </div>

              <div className="mt-3 flex justify-end gap-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-8 rounded-lg px-3 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => void loadChallenge()}
                  disabled={phase === 'loading' || phase === 'verifying' || phase === 'sending'}
                  className="inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/8 disabled:opacity-50"
                >
                  <RefreshCw className={cn('size-3.5', phase === 'loading' && 'animate-spin')} />
                  换一张
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
