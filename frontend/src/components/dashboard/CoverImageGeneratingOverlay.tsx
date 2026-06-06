import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CoverImageGeneratingOverlayProps {
  active: boolean
  className?: string
}

/** OpenAI Image 风格：模糊色块 + 扫光 + 渐进清晰 */
export function CoverImageGeneratingOverlay({ active, className }: CoverImageGeneratingOverlayProps) {
  if (!active) {
    return null
  }

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 z-10 overflow-hidden bg-muted/40',
        className,
      )}
      aria-hidden
      data-testid="cover-generating-overlay"
    >
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0.6, filter: 'blur(28px) saturate(1.2)' }}
        animate={{
          opacity: [0.55, 0.85, 0.65, 0.9],
          filter: ['blur(28px) saturate(1.2)', 'blur(18px) saturate(1.35)', 'blur(24px) saturate(1.15)', 'blur(16px) saturate(1.4)'],
        }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background:
            'radial-gradient(circle at 30% 35%, rgba(99,102,241,0.55), transparent 55%), radial-gradient(circle at 70% 65%, rgba(139,92,246,0.5), transparent 50%), radial-gradient(circle at 50% 50%, rgba(59,130,246,0.35), transparent 60%)',
        }}
      />

      <motion.div
        className="absolute inset-0 opacity-70"
        animate={{ backgroundPosition: ['200% 0%', '-200% 0%'] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
        style={{
          background:
            'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.45) 50%, transparent 65%)',
          backgroundSize: '200% 100%',
        }}
      />

      <motion.div
        className="absolute inset-0 mix-blend-overlay"
        animate={{ opacity: [0.15, 0.35, 0.2] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.04) 3px, rgba(255,255,255,0.04) 6px)',
        }}
      />

      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent" />

      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-2"
          animate={{ opacity: [0.65, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.span
            className="size-2 rounded-full bg-white/90 shadow-sm"
            animate={{ scale: [1, 1.35, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="text-[11px] font-medium tracking-wide text-white/90 drop-shadow-sm">
            正在生成封面…
          </span>
        </motion.div>
      </div>
    </div>
  )
}
