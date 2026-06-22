import { useReducedMotion } from 'framer-motion'
import { PixelArrowRight } from '../icons/PixelArrowRight'
import { cn } from '@/lib/utils'

/** 手机 Hero：圆形像素主按钮 + 阶梯动画箭头 */
export function HomeHeroOrbCta({
  onClick,
  ariaLabel,
  className,
}: {
  onClick: () => void
  ariaLabel: string
  className?: string
}) {
  const reduced = useReducedMotion()

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn('hero-orb-cta group relative touch-manipulation', className)}
    >
      <span
        aria-hidden
        className={cn('hero-orb-cta__orbit', reduced && 'hero-orb-cta__orbit--static')}
      />
      <span
        aria-hidden
        className={cn('hero-orb-cta__halo', reduced && 'hero-orb-cta__halo--static')}
      />
      <span className="hero-orb-cta__core">
        <span className={cn('hero-orb-cta__arrow', reduced && 'hero-orb-cta__arrow--static')}>
          <PixelArrowRight />
        </span>
      </span>
    </button>
  )
}
