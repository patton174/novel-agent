import styled, { keyframes } from 'styled-components'
import { useAppToastStore, type AppToastKind } from '../../stores/appToastStore'
import { editorTheme } from '../../styles/editorTheme'
import { palette } from '../../styles/theme'

const KIND_LABEL: Record<AppToastKind, string> = {
  success: '成功',
  error: '失败',
  info: '提示',
}

export function AppToastHost() {
  const items = useAppToastStore((s) => s.items)
  const dismiss = useAppToastStore((s) => s.dismiss)

  if (items.length === 0) return null

  return (
    <Host aria-live="polite" aria-relevant="additions">
      {items.map((item) => (
        <ToastCard key={item.id} $kind={item.kind} role="status">
          <KindTag $kind={item.kind}>{KIND_LABEL[item.kind]}</KindTag>
          <Message>{item.message}</Message>
          <Dismiss type="button" aria-label="关闭" onClick={() => dismiss(item.id)}>
            ×
          </Dismiss>
        </ToastCard>
      ))}
    </Host>
  )
}

const slideIn = keyframes`
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`

const Host = styled.div`
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  max-width: min(360px, calc(100vw - 2rem));
  pointer-events: none;
`

const ToastCard = styled.div<{ $kind: AppToastKind }>`
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.65rem 0.75rem;
  border-radius: 12px;
  background: ${palette.white};
  border: 1px solid
    ${({ $kind }) =>
      $kind === 'error'
        ? 'rgba(196, 92, 92, 0.35)'
        : $kind === 'success'
          ? 'rgba(34, 139, 87, 0.35)'
          : editorTheme.border};
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  animation: ${slideIn} 0.2s ease both;
`

const KindTag = styled.span<{ $kind: AppToastKind }>`
  flex-shrink: 0;
  font-size: 0.62rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border-radius: 6px;
  color: ${({ $kind }) =>
    $kind === 'error'
      ? editorTheme.error
      : $kind === 'success'
        ? palette.diffInsert
        : palette.textSecondary};
  background: ${({ $kind }) =>
    $kind === 'error'
      ? editorTheme.errorBg
      : $kind === 'success'
        ? palette.diffInsertBg
        : editorTheme.accentMuted};
`

const Message = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 0.8rem;
  line-height: 1.45;
  color: ${editorTheme.text};
`

const Dismiss = styled.button`
  flex-shrink: 0;
  margin: 0;
  padding: 0;
  width: 1.25rem;
  height: 1.25rem;
  border: none;
  background: transparent;
  color: ${palette.textMuted};
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  &:hover {
    color: ${editorTheme.text};
  }
`
