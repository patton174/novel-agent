import { cn } from '@/lib/utils'
import {
  GHOST_FOOT_AREAS,
  GHOST_TOE_AREAS,
  GHOST_TOE_FLICKER_A,
  GHOST_TOP_AREAS,
} from '@/lib/pixelAvatar/ghostShared'

/** Ghost 共享躯体：14×14 网格 + 脚趾闪烁（面部由 overlay 插槽提供） */
export function GhostGridBody() {
  return (
    <div className="pixel-ghost-grid">
      {GHOST_TOP_AREAS.map((area) => (
        <div key={area} className={cn('pixel-ghost-grid__solid', `pixel-ghost-grid__solid--${area}`)} />
      ))}
      {GHOST_FOOT_AREAS.map((area) => (
        <div key={area} className={cn('pixel-ghost-grid__solid', `pixel-ghost-grid__solid--${area}`)} />
      ))}
      {GHOST_TOE_AREAS.map((area, i) => {
        const n = i + 1
        const phase = GHOST_TOE_FLICKER_A.has(n) ? 'a' : 'b'
        return (
          <div
            key={area}
            className={cn('pixel-ghost-grid__toe', `pixel-ghost-grid__toe--${area}`, `pixel-ghost-grid__toe--${phase}`)}
          />
        )
      })}
    </div>
  )
}

export function GhostShadow() {
  return <div className="pixel-ghost-shadow" />
}

/** Classic：十字白眼 + 游动瞳孔 */
export function GhostClassicFace() {
  return (
    <div className="pixel-ghost-face pixel-ghost-face--classic">
      <div className="pixel-ghost-face__eye pixel-ghost-face__eye--l" />
      <div className="pixel-ghost-face__eye pixel-ghost-face__eye--r" />
      <div className="pixel-ghost-face__pupil pixel-ghost-face__pupil--l pixel-ghost-face__pupil--track" />
      <div className="pixel-ghost-face__pupil pixel-ghost-face__pupil--r pixel-ghost-face__pupil--track" />
    </div>
  )
}

/** Hungry：方块眼 + 波浪嘴（同 140px 画布） */
export function GhostHungryFace() {
  return (
    <div className="pixel-ghost-face pixel-ghost-face--hungry">
      <div className="pixel-ghost-face__block-eye pixel-ghost-face__block-eye--l" />
      <div className="pixel-ghost-face__block-eye pixel-ghost-face__block-eye--r" />
      <div className="pixel-ghost-face__pupil pixel-ghost-face__pupil--hl pixel-ghost-face__pupil--hl-l" />
      <div className="pixel-ghost-face__pupil pixel-ghost-face__pupil--hl pixel-ghost-face__pupil--hl-r" />
      <div className="pixel-ghost-face__mouth">
        <span className="pixel-ghost-face__mouth-cap pixel-ghost-face__mouth-cap--l" />
        <span className="pixel-ghost-face__mouth-seg pixel-ghost-face__mouth-seg--1" />
        <span className="pixel-ghost-face__mouth-seg pixel-ghost-face__mouth-seg--2" />
        <span className="pixel-ghost-face__mouth-seg pixel-ghost-face__mouth-seg--3" />
        <span className="pixel-ghost-face__mouth-seg pixel-ghost-face__mouth-seg--4" />
        <span className="pixel-ghost-face__mouth-seg pixel-ghost-face__mouth-seg--5" />
        <span className="pixel-ghost-face__mouth-cap pixel-ghost-face__mouth-cap--r" />
      </div>
    </div>
  )
}

export function GhostCanvas({ face }: { face: 'classic' | 'hungry' }) {
  return (
    <>
      <div className="pixel-ghost-canvas">
        <GhostGridBody />
        {face === 'classic' ? <GhostClassicFace /> : <GhostHungryFace />}
      </div>
      <GhostShadow />
    </>
  )
}
