import { useEffect } from 'react'
import styled from 'styled-components'
import { NeumorphicSwitch } from '../ui/NeumorphicSwitch'
import { EditorButton } from '../ui/EditorButton'
import { editorTheme } from '../../styles/editorTheme'
import { editorModalSurface } from '../../styles/editorModal'
import { DIRECT_PYTHON } from '../../config/runtime'
import { isLoggedIn } from '../../utils/auth'

export interface EditorSettingsModalProps {
  open: boolean
  onClose: () => void
  hostModeEnabled: boolean
  onHostModeChange: (enabled: boolean) => void
  onLogout: () => void
}

export function EditorSettingsModal({
  open,
  onClose,
  hostModeEnabled,
  onHostModeChange,
  onLogout,
}: EditorSettingsModalProps) {
  const showAccount = !DIRECT_PYTHON && isLoggedIn()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <Overlay onClick={onClose} role="presentation">
      <Dialog
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <Title id="editor-settings-title">设置</Title>
          <EditorButton variant="close" type="button" onClick={onClose} aria-label="关闭">
            ×
          </EditorButton>
        </DialogHeader>

        <DialogBody>
          <Section>
            <SectionTitle>创作偏好</SectionTitle>
            <ToggleRow>
              <ToggleText>
                <ToggleLabel>AI 盯防模式</ToggleLabel>
                <ToggleHint>开启后任务可在后台长时运行；关闭则为单次对话</ToggleHint>
              </ToggleText>
              <NeumorphicSwitch
                size="xs"
                checked={hostModeEnabled}
                onChange={onHostModeChange}
                aria-label="AI 盯防模式"
              />
            </ToggleRow>
          </Section>

          {showAccount ? (
            <Section>
              <SectionTitle>账户</SectionTitle>
              <EditorButton type="button" variant="ghost" fullWidth onClick={onLogout}>
                退出登录
              </EditorButton>
            </Section>
          ) : null}
        </DialogBody>
      </Dialog>
    </Overlay>
  )
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: ${editorModalSurface.overlay};
  backdrop-filter: ${editorModalSurface.overlayBlur};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  animation: fadeIn 0.18s ease;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @media (max-width: 767px) {
    padding: 0;
    align-items: stretch;
  }
`

const Dialog = styled.div`
  width: min(440px, 100%);
  max-height: min(85vh, 520px);
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  background: ${editorModalSurface.dialogBg};
  box-shadow: ${editorModalSurface.dialogShadow};
  overflow: hidden;
  animation: slideUp 0.22s ease;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (max-width: 767px) {
    width: 100%;
    max-height: none;
    height: 100%;
    border-radius: 0;
    animation: fadeIn 0.18s ease;
  }
`

const DialogHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1rem 1.25rem 0.85rem;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);

  @media (max-width: 767px) {
    padding: 0.9rem 1rem 0.75rem;
  }
`

const Title = styled.h2`
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: ${editorTheme.text};
`

const DialogBody = styled.div`
  padding: 0.5rem 1.5rem 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;

  @media (max-width: 767px) {
    padding: 0.5rem 1rem 1.25rem;
  }
`

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`

const SectionTitle = styled.h3`
  margin: 0;
  padding-bottom: 0.35rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: ${editorTheme.textSecondary};
  letter-spacing: 0.02em;
  border-bottom: 1px solid rgba(79, 70, 229, 0.22);
`

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.6rem 0.7rem;
  border-radius: 12px;
  background: ${editorTheme.bgElevated};
  border: 1px solid ${editorTheme.border};
  box-shadow: none;

  @media (max-width: 767px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.65rem;
  }
`

const ToggleText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
`

const ToggleLabel = styled.span`
  font-size: 0.88rem;
  font-weight: 600;
  color: ${editorTheme.text};
`

const ToggleHint = styled.span`
  font-size: 0.74rem;
  line-height: 1.45;
  color: ${editorTheme.textMuted};
`
