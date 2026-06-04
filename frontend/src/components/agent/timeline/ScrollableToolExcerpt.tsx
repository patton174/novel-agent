import styled from 'styled-components'
import { editorTheme } from '../../../styles/editorTheme'
import { textStyle } from '../../../styles/typography'

export const TOOL_EXCERPT_MAX_LINES = 20

const ExcerptBox = styled.div<{ $lineCount: number; $mono?: boolean }>`
  ${textStyle('uiSm')}
  color: ${editorTheme.textMuted};
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ${({ $mono }) => ($mono ? 'ui-monospace, monospace' : 'inherit')};
  max-height: ${({ $lineCount }) =>
    $lineCount >= TOOL_EXCERPT_MAX_LINES
      ? `calc(${TOOL_EXCERPT_MAX_LINES} * 1.45em)`
      : 'none'};
  overflow-y: ${({ $lineCount }) =>
    $lineCount >= TOOL_EXCERPT_MAX_LINES ? 'auto' : 'visible'};
  padding-right: 0.15rem;
`

export function ScrollableToolExcerpt({ text }: { text: string }) {
  const trimmed = text.trim()
  if (!trimmed) {
    return null
  }
  const lineCount = trimmed.split('\n').length
  const mono = /[├└│]/.test(trimmed)
  return (
    <ExcerptBox $lineCount={lineCount} $mono={mono}>
      {trimmed}
    </ExcerptBox>
  )
}
