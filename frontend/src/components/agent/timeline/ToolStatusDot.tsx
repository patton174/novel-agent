import { useEffect, useState } from 'react'
import {
  toolStatusDotCellClass,
  toolStatusDotGlyphClass,
} from '@/lib/timelineClasses'

const CC_DOT = '●'

export function ToolStatusDot({
  loading,
  error,
  animate = true,
  inline = false,
}: {
  loading?: boolean
  error?: boolean
  animate?: boolean
  /** 嵌入 ToolLeadCell 时占满列宽并垂直居中 */
  inline?: boolean
}) {
  const [blinkOn, setBlinkOn] = useState(true)
  const unresolved = Boolean(loading)
  const shouldBlink = animate && unresolved && !error

  useEffect(() => {
    if (!shouldBlink) {
      return
    }
    const id = window.setInterval(() => {
      setBlinkOn((v) => !v)
    }, 450)
    return () => window.clearInterval(id)
  }, [shouldBlink])

  const showGlyph = !shouldBlink || blinkOn || error || !unresolved

  return (
    <span
      data-testid="tool-status-dot"
      className={toolStatusDotCellClass({ loading: shouldBlink, inline })}
      aria-hidden
    >
      <span
        className={toolStatusDotGlyphClass({
          loading: unresolved,
          error,
          success: !unresolved && !error,
        })}
      >
        {showGlyph ? CC_DOT : '\u00a0'}
      </span>
    </span>
  )
}
