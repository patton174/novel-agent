import styled from 'styled-components'
import { editorTheme } from '../../../styles/editorTheme'
import { palette } from '../../../styles/theme'
import { textStyle } from '../../../styles/typography'

export const DragHint = styled.div`
  ${textStyle('micro')}
  color: ${palette.textFaint};
  margin-bottom: 0.45rem;
`

export const Hint = styled.div`
  ${textStyle('uiSm')}
  color: ${palette.textFaint};
  padding: 0.5rem 0.15rem;
`

export const OutlineList = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  overflow-y: auto;
`

export const ChapterListCollapsible = styled.div<{ $open: boolean }>`
  display: grid;
  grid-template-rows: ${({ $open }) => ($open ? '1fr' : '0fr')};
  transition: grid-template-rows 0.28s cubic-bezier(0.4, 0, 0.2, 1);
`

export const ChapterListInner = styled.div`
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`

export const VolumeBlock = styled.div<{ $dragOver?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.45rem;
  border-radius: 10px;
  background: ${({ $dragOver }) =>
    $dragOver ? editorTheme.accentMuted : palette.surfaceVolume};
  border: 1px solid ${({ $dragOver }) =>
    $dragOver ? palette.accentLineSoft : palette.border};
  transition: background 0.15s ease, border-color 0.15s ease;
`

export const VolumeHeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`

export const DragHandle = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.1rem;
  color: ${palette.textFaint};
  cursor: grab;
  user-select: none;
  ${textStyle('micro')}
  letter-spacing: -0.08em;

  &:active {
    cursor: grabbing;
  }
`

export const ChevronWrap = styled.span<{ $open: boolean }>`
  display: inline-flex;
  transform: rotate(${({ $open }) => ($open ? '180deg' : '0')});
  transition: transform 0.2s ease;
  color: ${palette.textFaint};

  svg {
    width: 14px;
    height: 14px;
  }
`

export const ChapterDropZone = styled.div<{ $dragOver?: boolean }>`
  padding: 0.65rem;
  border-radius: 8px;
  border: 1px dashed ${({ $dragOver }) => ($dragOver ? palette.accent : palette.borderStrong)};
  background: ${({ $dragOver }) => ($dragOver ? palette.accentSoft : 'transparent')};
  ${textStyle('uiSm')}
  color: ${palette.textFaint};
  text-align: center;
`

export const OutlineItem = styled.div<{ $active?: boolean; $inProgress?: boolean; $dragOver?: boolean }>`
  border-radius: 10px;
  background: ${({ $dragOver, $active, $inProgress }) => {
    if ($dragOver) return palette.activeBg
    if ($active) return palette.accent
    if ($inProgress) return palette.bgSidebar
    return 'transparent'
  }};
  box-shadow: ${({ $active, $inProgress }) => {
    if ($active) {
      return 'inset 1px 1px 3px rgba(0,0,0,0.15), inset -1px -1px 3px rgba(255,255,255,0.3)'
    }
    if ($inProgress) {
      return '2px 2px 5px rgba(0,0,0,0.08), -1px -1px 3px rgba(255,255,255,0.5)'
    }
    return 'none'
  }};
  transition: background 0.15s ease;
`

export const ChapterRow = styled.div`
  display: flex;
  align-items: stretch;
  gap: 0.2rem;
`
