import { useMemo } from 'react'
import styled from 'styled-components'
import { editorTheme } from '../../styles/editorTheme'
import { palette } from '../../styles/theme'
import { EditorButton } from '../ui/EditorButton'
import { diffLines, isSameText, summarizeDiff } from '../../utils/textDiff'

export interface ChapterInlineDiffProps {
  baseline: string
  current: string
  title?: string
  acceptLabel?: string
  onAccept: () => void
  onDismiss: () => void
}

export function ChapterInlineDiff({
  baseline,
  current,
  title = '修改预览',
  acceptLabel = '保留修改',
  onAccept,
  onDismiss,
}: ChapterInlineDiffProps) {
  const same = isSameText(baseline, current)
  const diff = useMemo(() => diffLines(baseline, current), [baseline, current])
  const stats = useMemo(() => summarizeDiff(diff), [diff])

  return (
    <Wrap>
      <Toolbar>
        <ToolbarTitle>{title}</ToolbarTitle>
        <ToolbarActions>
          <EditorButton variant="secondary" size="sm" type="button" onClick={onDismiss}>
            关闭预览
          </EditorButton>
          <EditorButton variant="primary" size="sm" type="button" onClick={onAccept}>
            {acceptLabel}
          </EditorButton>
        </ToolbarActions>
      </Toolbar>
      {same ? (
        <SameNote>与修改前正文一致</SameNote>
      ) : (
        <>
          <Stats>
            +{stats.insert} 行 / −{stats.delete} 行 / {stats.equal} 行未变
          </Stats>
          <Prose>
            {diff.map((line, index) => (
              <LineRow key={`${line.type}-${index}`} $type={line.type}>
                <Mark>{line.type === 'insert' ? '+' : line.type === 'delete' ? '−' : ' '}</Mark>
                <Text>{line.text || ' '}</Text>
              </LineRow>
            ))}
          </Prose>
        </>
      )}
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100%;
  gap: 0.75rem;
`

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
`

const ToolbarTitle = styled.span`
  font-size: 0.82rem;
  font-weight: 600;
  color: ${palette.textSecondary};
`

const ToolbarActions = styled.div`
  display: flex;
  gap: 0.45rem;
`

const Stats = styled.div`
  font-size: 0.78rem;
  color: ${palette.textFaint};
`

const SameNote = styled.div`
  font-size: 0.9rem;
  color: ${palette.textMuted};
  padding: 2rem 0;
  text-align: center;
`

const Prose = styled.div`
  flex: 1;
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', Georgia, serif;
  font-size: 1.05rem;
  line-height: 2;
  letter-spacing: 0.04em;
  white-space: pre-wrap;
  word-break: break-word;
`

const LineRow = styled.div<{ $type: 'equal' | 'insert' | 'delete' }>`
  display: flex;
  gap: 0.5rem;
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
  background: ${({ $type }) =>
    $type === 'insert'
      ? 'rgba(34, 139, 87, 0.1)'
      : $type === 'delete'
        ? 'rgba(200, 60, 60, 0.1)'
        : 'transparent'};
  color: ${({ $type }) =>
    $type === 'delete' ? palette.textFaint : editorTheme.text};
  text-decoration: ${({ $type }) => ($type === 'delete' ? 'line-through' : 'none')};
`

const Mark = styled.span`
  flex-shrink: 0;
  width: 1rem;
  font-family: ui-monospace, monospace;
  font-size: 0.85rem;
  opacity: 0.55;
  user-select: none;
`

const Text = styled.span`
  flex: 1;
`
