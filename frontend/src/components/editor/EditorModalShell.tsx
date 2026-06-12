import { useEffect } from 'react'
import styled, { css, keyframes } from 'styled-components'
import { editorModalSurface } from '../../styles/editorModal'

export const editorModalFadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

export const editorModalSlideUp = keyframes`
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`

export type EditorModalSize = 'confirm' | 'form' | 'settings' | 'todo' | 'detail' | 'memory'

const SIZE_MAP: Record<
  EditorModalSize,
  { width: string; maxHeight: string; height?: string; minWidth?: string; minHeight?: string }
> = {
  confirm: { width: '420px', maxHeight: '90vh' },
  form: { width: '480px', maxHeight: '640px' },
  settings: { width: '440px', maxHeight: '520px' },
  todo: { width: '520px', maxHeight: '640px' },
  detail: { width: '720px', maxHeight: '760px' },
  memory: {
    width: '920px',
    maxHeight: '760px',
    height: 'min(78vh, 700px)',
    minWidth: 'min(680px, 100%)',
    minHeight: '520px',
  },
}

export function useEditorModalEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
}

export const EditorModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: ${editorModalSurface.overlay};
  backdrop-filter: ${editorModalSurface.overlayBlur};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  animation: ${editorModalFadeIn} 0.18s ease both;

  @media (max-width: 767px) {
    padding: 0;
    align-items: stretch;
  }
`

export const EditorModalPanel = styled.div<{ $size?: EditorModalSize }>`
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  background: ${editorModalSurface.dialogBg};
  box-shadow: ${editorModalSurface.dialogShadow};
  overflow: hidden;
  animation: ${editorModalSlideUp} 0.22s ease both;

  ${({ $size = 'settings' }) => {
    const spec = SIZE_MAP[$size]
    return css`
      width: min(${spec.width}, 100%);
      max-height: min(${spec.maxHeight}, 90vh);
      ${spec.height ? `height: ${spec.height};` : ''}
      ${spec.minWidth ? `min-width: ${spec.minWidth};` : ''}
      ${spec.minHeight ? `min-height: ${spec.minHeight};` : ''}
    `
  }}

  @media (max-width: 767px) {
    width: 100%;
    max-height: none;
    height: 100%;
    min-width: 0;
    min-height: 0;
    border-radius: 0;
    animation: ${editorModalFadeIn} 0.18s ease both;
  }
`

export const EditorModalHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.15rem 0.85rem;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);

  @media (max-width: 767px) {
    padding: 0.85rem 0.9rem 0.75rem;
    gap: 0.65rem;
  }
`

export const EditorModalBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.15);
    border-radius: 4px;
  }
`

/** Simple confirm / form modals — padding on panel instead of header/body split */
export const EditorModalPanelInset = styled.div`
  padding: 1.5rem 1.75rem;
  overflow-y: auto;

  @media (max-width: 767px) {
    padding: 1.25rem 1rem max(1.5rem, env(safe-area-inset-bottom));
  }
`
