import { useEffect, useState } from 'react'
import styled, { css, keyframes } from 'styled-components'
import { palette } from '../../../styles/theme'

const CC_DOT = '●'

const blink = keyframes`
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0.2; }
`

const DotCell = styled.span<{ $loading?: boolean; $inline?: boolean }>`
  display: inline-flex;
  justify-content: center;
  font-size: 0.72rem;
  line-height: 1.35;
  user-select: none;
  animation: ${({ $loading }) => ($loading ? blink : 'none')} 0.9s ease-in-out infinite;

  ${({ $inline }) =>
    $inline
      ? css`
          width: 100%;
          height: 100%;
          align-items: center;
        `
      : css`
          flex: 0 0 1.35rem;
          width: 1.35rem;
          align-items: flex-start;
          padding-top: 0.05rem;
        `}
`

const DotGlyph = styled.span<{
  $loading?: boolean
  $error?: boolean
  $success?: boolean
}>`
  color: ${({ $error, $success, $loading }) => {
    if ($error) return palette.errorBright
    if ($success) return palette.traceOk
    if ($loading) return palette.textMuted
    return palette.ink
  }};
  font-weight: 600;
`

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

  const showGlyph =
    !shouldBlink || blinkOn || error || !unresolved

  return (
    <DotCell
      data-testid="tool-status-dot"
      $loading={shouldBlink}
      $inline={inline}
      aria-hidden
    >
      <DotGlyph $loading={unresolved} $error={error} $success={!unresolved && !error}>
        {showGlyph ? CC_DOT : '\u00a0'}
      </DotGlyph>
    </DotCell>
  )
}
