import { cn } from '@/lib/utils'
import {
  BOT_BOLT,
  BOT_CELLS,
  BOT_EYES,
  BOT_MOUTH,
  HEART_CELLS,
  KITTY_CELLS,
  KITTY_EARS,
  KITTY_EYES,
  KITTY_NOSE,
  KITTY_WHISKER,
  SLIME_CELLS,
  SLIME_EYES,
  STAR_CELLS,
  STAR_SPARKLE,
} from '@/lib/pixelAvatar/grids'
import type { PixelAvatarColors, PixelAvatarStyle } from '@/lib/pixelAvatar/types'
import { usePixelAvatarStore } from '@/stores/pixelAvatarStore'
import { PixelAvatarShell } from './PixelAvatarShell'
import { GhostCanvas } from './variants/ghost/GhostParts'

const GRID7 = 49

export interface PixelAvatarProps {
  style: PixelAvatarStyle
  colors: PixelAvatarColors
  size?: number
  animated?: boolean
  className?: string
}

function Grid7({
  filled,
  highlight,
  accent,
  ear,
  sparkle,
  whisker,
  className,
}: {
  filled: Set<number>
  highlight?: Set<number>
  accent?: Set<number>
  ear?: Set<number>
  sparkle?: Set<number>
  whisker?: Set<number>
  className?: string
}) {
  return (
    <div className={cn('pixel-grid-7', className)}>
      {Array.from({ length: GRID7 }, (_, i) => {
        const n = i + 1
        if (!filled.has(n)) return <div key={n} className="pixel-grid-7__cell" />
        return (
          <div
            key={n}
            className={cn(
              'pixel-grid-7__cell pixel-grid-7__cell--on',
              highlight?.has(n) && 'pixel-grid-7__cell--highlight',
              accent?.has(n) && 'pixel-grid-7__cell--accent',
              ear?.has(n) && 'pixel-grid-7__cell--ear',
              sparkle?.has(n) && 'pixel-grid-7__cell--sparkle',
              whisker?.has(n) && 'pixel-grid-7__cell--whisker',
            )}
          />
        )
      })}
    </div>
  )
}

function BotBody() {
  return (
    <>
      <div className="pixel-bot__wrap">
        <div className="pixel-bot__antenna" />
        <Grid7
          filled={BOT_CELLS}
          highlight={BOT_EYES}
          accent={BOT_MOUTH}
          sparkle={BOT_BOLT}
          className="pixel-bot__grid"
        />
      </div>
      <div className="pixel-bot__shadow" />
    </>
  )
}

function SlimeBody() {
  return (
    <>
      <div className="pixel-slime__wrap">
        <Grid7 filled={SLIME_CELLS} highlight={SLIME_EYES} className="pixel-slime__grid" />
        <div className="pixel-slime__shine" />
      </div>
      <div className="pixel-slime__shadow" />
    </>
  )
}

function StarBody() {
  return (
    <div className="pixel-star__wrap">
      <Grid7 filled={STAR_CELLS} sparkle={STAR_SPARKLE} className="pixel-star__grid" />
      <div className="pixel-star__glow" />
    </div>
  )
}

function HeartBody() {
  return (
    <>
      <Grid7 filled={HEART_CELLS} className="pixel-heart__grid" />
      <div className="pixel-heart__shadow" />
    </>
  )
}

function KittyBody() {
  return (
    <>
      <div className="pixel-kitty__wrap">
        <Grid7
          filled={KITTY_CELLS}
          highlight={KITTY_EYES}
          accent={KITTY_NOSE}
          ear={KITTY_EARS}
          whisker={KITTY_WHISKER}
          className="pixel-kitty__grid"
        />
      </div>
      <div className="pixel-kitty__shadow" />
    </>
  )
}

/** 140px 同宽 Ghost 系列 vs 独立网格风格 */
function renderBody(style: PixelAvatarStyle) {
  switch (style) {
    case 'ghost':
      return <GhostCanvas face="classic" />
    case 'ghost-hungry':
      return <GhostCanvas face="hungry" />
    case 'bot':
      return <BotBody />
    case 'slime':
      return <SlimeBody />
    case 'star':
      return <StarBody />
    case 'heart':
      return <HeartBody />
    case 'kitty':
      return <KittyBody />
    default:
      return <GhostCanvas face="classic" />
  }
}

export function PixelAvatar({ style, colors, size = 36, animated = true, className }: PixelAvatarProps) {
  return (
    <PixelAvatarShell styleId={style} colors={colors} size={size} animated={animated} className={className}>
      {renderBody(style)}
    </PixelAvatarShell>
  )
}

export function UserPixelAvatar({
  size = 36,
  animated = true,
  className,
}: {
  size?: number
  animated?: boolean
  className?: string
}) {
  const style = usePixelAvatarStore((s) => s.style)
  const colors = usePixelAvatarStore((s) => s.resolvedColors())
  return <PixelAvatar style={style} colors={colors} size={size} animated={animated} className={className} />
}
