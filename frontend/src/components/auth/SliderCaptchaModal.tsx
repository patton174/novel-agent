import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { fetchSliderCaptcha, verifySliderCaptcha } from '../../utils/authApi'
import type { SliderCaptchaChallenge } from '../../utils/authApi'
import { appToast } from '@/stores/appToastStore'
import { AuthSpinner } from './AuthSpinner'
import { cn } from '@/lib/utils'

const SLIDER_HEIGHT = 150
const PUZZLE_SIZE = 44

type Phase = 'loading' | 'ready' | 'verifying' | 'success'

interface Props {
  open: boolean
  onClose: () => void
  onVerified: (captchaToken: string) => void | Promise<void>
}

export const SliderCaptchaModal: React.FC<Props> = ({ open, onClose, onVerified }) => {
  const [challenge, setChallenge] = useState<SliderCaptchaChallenge | null>(null)
  const [offsetX, setOffsetX] = useState(0)
  const [phase, setPhase] = useState<Phase>('loading')
  const [imagesReady, setImagesReady] = useState(false)
  const dragging = useRef(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const loadedCount = useRef(0)

  const maxOffset = challenge ? Math.max(0, challenge.sliderWidth - PUZZLE_SIZE - 4) : 0
  const busy = phase === 'loading' || phase === 'verifying' || phase === 'success'

  const resetLocal = () => {
    setChallenge(null)
    setOffsetX(0)
    setImagesReady(false)
    loadedCount.current = 0
    dragging.current = false
  }

  const loadChallenge = useCallback(async () => {
    setPhase('loading')
    resetLocal()
    try {
      const data = await fetchSliderCaptcha()
      setChallenge(data)
      setPhase('ready')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '验证码加载失败'
      appToast.error(msg)
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    if (open) void loadChallenge()
    else resetLocal()
  }, [open, loadChallenge])

  const onImageLoaded = () => {
    loadedCount.current += 1
    if (loadedCount.current >= 2) {
      setImagesReady(true)
    }
  }

  const updateOffset = (clientX: number) => {
    if (busy) return
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const x = clientX - rect.left - 18
    setOffsetX(Math.min(maxOffset, Math.max(0, x)))
  }

  const finishDrag = async () => {
    if (!dragging.current || !challenge || busy) return
    dragging.current = false
    setPhase('verifying')
    try {
      const token = await verifySliderCaptcha(challenge.captchaId, Math.round(offsetX))
      setPhase('success')
      await new Promise((r) => setTimeout(r, 420))
      await onVerified(token)
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '验证失败，请重试'
      appToast.error(msg)
      void loadChallenge()
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[1200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <motion.button
            type="button"
            aria-label="关闭验证"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[6px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="captcha-title"
            className="relative w-full max-w-[400px] rounded-2xl border border-border/80 bg-background shadow-2xl shadow-primary/10 overflow-hidden"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1 bg-gradient-to-r from-primary/80 via-indigo-400/70 to-primary/40" />

            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 id="captcha-title" className="text-base font-semibold text-foreground tracking-tight">
                    安全验证
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">拖动滑块完成拼图，保护您的账号安全</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  aria-label="关闭"
                >
                  ×
                </button>
              </div>

              <div
                className="relative mx-auto mb-4 rounded-xl overflow-hidden border border-border bg-muted/30"
                style={{
                  width: challenge?.sliderWidth ?? '100%',
                  maxWidth: '100%',
                  height: SLIDER_HEIGHT,
                }}
              >
                <AnimatePresence mode="wait">
                  {phase === 'loading' || !challenge ? (
                    <motion.div
                      key="skeleton"
                      className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="absolute inset-0 bg-muted/60 animate-pulse" />
                      <AuthSpinner />
                      <p className="relative z-10 text-xs font-medium text-muted-foreground">
                        AI 正在生成验证图…
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="images"
                      className="absolute inset-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: imagesReady ? 1 : 0 }}
                      transition={{ duration: 0.35 }}
                    >
                      <img
                        src={`data:image/png;base64,${challenge.backgroundImage}`}
                        alt=""
                        draggable={false}
                        className="w-full h-full object-cover select-none"
                        onLoad={onImageLoaded}
                      />
                      <img
                        src={`data:image/png;base64,${challenge.puzzleImage}`}
                        alt=""
                        draggable={false}
                        className="absolute w-11 h-11 pointer-events-none drop-shadow-md select-none"
                        style={{ left: offsetX, top: challenge.puzzleY }}
                        onLoad={onImageLoaded}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {(phase === 'verifying' || phase === 'success') && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center bg-background/55 backdrop-blur-[2px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {phase === 'success' ? (
                      <motion.span
                        className="flex size-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 text-xl font-bold"
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                      >
                        ✓
                      </motion.span>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <AuthSpinner />
                        验证中…
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              <div
                ref={trackRef}
                className={cn(
                  'relative h-11 rounded-full border border-border bg-muted/40 transition-opacity',
                  busy && 'opacity-60 pointer-events-none',
                )}
                onPointerDown={(e) => {
                  if (busy || !challenge) return
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
                <div className="absolute inset-y-0 left-3 right-3 flex items-center pointer-events-none">
                  <span className="text-xs text-muted-foreground pl-10">拖动滑块对齐缺口</span>
                </div>
                <div
                  className="absolute top-1 size-9 rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/25 cursor-grab active:cursor-grabbing flex items-center justify-center transition-[left] duration-75 ease-out"
                  style={{ left: offsetX }}
                >
                  <span className="text-sm">››</span>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 px-4 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => void loadChallenge()}
                  disabled={phase === 'loading' || phase === 'verifying'}
                  className="h-9 px-4 rounded-lg text-sm font-medium text-primary hover:bg-primary/8 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {phase === 'loading' ? <AuthSpinner size="sm" /> : null}
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
