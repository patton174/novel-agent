import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface CoverImageGeneratingOverlayProps {
  active: boolean
  className?: string
}

const ORBIT_GRADIENT =
  'conic-gradient(from 0deg at 50% 50%, rgba(99,102,241,0.7), rgba(236,72,153,0.55), rgba(139,92,246,0.65), rgba(59,130,246,0.5), rgba(99,102,241,0.7))'

/** 封面生成中 — 多层光晕、轨道扫光与粒子，连贯电影感过渡。 */
export function CoverImageGeneratingOverlay({ active, className }: CoverImageGeneratingOverlayProps) {
  const { t } = useTranslation(['dashboard'])

  if (!active) {
    return null
  }

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 z-10 overflow-hidden bg-black/20',
        className,
      )}
      aria-hidden
      data-testid="cover-generating-overlay"
    >
      <motion.div
        className="absolute -inset-[40%] opacity-80"
        style={{ background: ORBIT_GRADIENT }}
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />

      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0.5, filter: 'blur(32px) saturate(1.25)' }}
        animate={{
          opacity: [0.45, 0.75, 0.5, 0.8],
          filter: [
            'blur(32px) saturate(1.25)',
            'blur(20px) saturate(1.45)',
            'blur(28px) saturate(1.2)',
            'blur(14px) saturate(1.5)',
          ],
        }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background:
            'radial-gradient(circle at 35% 30%, rgba(99,102,241,0.65), transparent 52%), radial-gradient(circle at 68% 72%, rgba(236,72,153,0.5), transparent 48%), radial-gradient(circle at 50% 50%, rgba(139,92,246,0.35), transparent 58%)',
        }}
      />

      <motion.div
        className="absolute inset-0"
        animate={{ backgroundPosition: ['220% 0%', '-220% 0%'] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
        style={{
          background:
            'linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.55) 48%, rgba(255,255,255,0.15) 52%, transparent 68%)',
          backgroundSize: '220% 100%',
        }}
      />

      <motion.div
        className="absolute inset-0 mix-blend-overlay"
        animate={{ opacity: [0.12, 0.28, 0.15] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)',
        }}
      />

      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          className="absolute size-1 rounded-full bg-white/70 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
          style={{
            left: `${18 + i * 16}%`,
            top: `${22 + (i % 3) * 18}%`,
          }}
          animate={{
            opacity: [0.2, 0.9, 0.2],
            scale: [0.6, 1.2, 0.6],
            y: [0, -12, 0],
          }}
          transition={{
            duration: 2.4 + i * 0.3,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.25,
          }}
        />
      ))}

      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />

      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="relative flex flex-col items-center gap-3"
          animate={{ opacity: [0.7, 1, 0.75] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.span
            className="absolute size-14 rounded-full border border-white/30"
            animate={{ scale: [0.85, 1.15, 0.85], opacity: [0.35, 0.7, 0.35] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.span
            className="relative size-2.5 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]"
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="text-ui-sm font-semibold tracking-widest text-white drop-shadow-md">
            {t('dashboard:novels.coverGenerating')}
          </span>
        </motion.div>
      </div>
    </div>
  )
}
