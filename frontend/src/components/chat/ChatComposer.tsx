import { useEffect, useRef } from 'react'
import styled from 'styled-components'
import { ContextUsageMeter } from '../agent/ContextUsageMeter'
import type { AgentContextUsage } from '../../types/agent'
import { NeumorphicSwitch } from '../ui/NeumorphicSwitch'
import { EditorButton, EditorSendIconLayer } from '../ui/EditorButton'
import { editorTheme } from '../../styles/editorTheme'
import { editorModalSurface } from '../../styles/editorModal'
import { palette } from '../../styles/theme'

/** 约 4 行正文高度，避免悬浮区过高 */
const COMPOSER_TEXT_MIN_PX = 40
const COMPOSER_TEXT_MAX_PX = 100

const Icons = {
  ArrowUp: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  ),
  Stop: () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  ),
}

export interface ChatComposerProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  isLoading?: boolean
  hostModeEnabled: boolean
  onHostModeChange: (enabled: boolean) => void
  streamActive?: boolean
  onStreamAbort?: () => void
  contextUsage?: AgentContextUsage | null
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  isLoading = false,
  hostModeEnabled,
  onHostModeChange,
  streamActive = false,
  onStreamAbort,
  contextUsage,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const streaming = streamActive || isLoading

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!streaming && value.trim()) {
        onSend()
      }
    }
  }

  const handleActionClick = () => {
    if (streaming) {
      onStreamAbort?.()
      return
    }
    if (value.trim() && !isLoading) {
      onSend()
    }
  }

  return (
    <ComposerRoot data-testid="chat-composer">
      <ComposerCard>
        <TextArea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="给 AI 发送消息..."
          rows={1}
          disabled={isLoading && !streamActive}
          aria-label="聊天输入"
        />

        <ActionRow>
          <LeftTools>
            <HostModeControl
              data-testid="host-mode-control"
              title={hostModeEnabled ? 'AI 持续盯防，可后台长时运行' : '关闭时为单次对话'}
            >
              <HostModeTitle>托管</HostModeTitle>
              <NeumorphicSwitch
                size="composer"
                checked={hostModeEnabled}
                onChange={onHostModeChange}
                aria-label="托管模式"
              />
            </HostModeControl>

          </LeftTools>

          <ContextUsageMeter
            usage={contextUsage}
            pending={streamActive && !contextUsage}
          />

          <EditorButton
            variant="send"
            streaming={streaming}
            onClick={handleActionClick}
            disabled={!streaming && (!value.trim() || isLoading)}
            aria-label={streaming ? '停止' : '发送'}
            data-testid={streaming ? 'stream-stop-btn' : 'send-btn'}
          >
            <EditorSendIconLayer $visible={!streaming} aria-hidden={streaming}>
              <Icons.ArrowUp />
            </EditorSendIconLayer>
            <EditorSendIconLayer $visible={streaming} aria-hidden={!streaming}>
              <Icons.Stop />
            </EditorSendIconLayer>
          </EditorButton>
        </ActionRow>
      </ComposerCard>
      <ComposerDisclaimer>内容由 AI 生成，请谨慎参考</ComposerDisclaimer>
    </ComposerRoot>
  )
}

const composerScrollbar = `
  scrollbar-width: thin;
  scrollbar-color: ${palette.scrollbarThumb} transparent;
  &::-webkit-scrollbar { width: 6px; height: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: ${palette.scrollbarThumb}; border-radius: 4px; }
  &::-webkit-scrollbar-thumb:hover { background: ${palette.scrollbarThumbHover}; }
`

const ComposerRoot = styled.footer`
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  ${composerScrollbar}
`

const ComposerCard = styled.div`
  width: 100%;
  min-width: 0;
  background: ${editorModalSurface.floatBg};
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: ${editorTheme.radiusMd};
  box-shadow: ${editorModalSurface.floatShadow};
  box-sizing: border-box;
  padding: 0.45rem 0.65rem 0.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`

const ComposerDisclaimer = styled.p`
  margin: 0.32rem 0 0;
  font-size: 0.68rem;
  color: ${editorTheme.textMuted};
  text-align: center;
`

const HostModeControl = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  height: ${editorTheme.composerControlHeight}px;
  padding: 0;
  box-sizing: border-box;
`

const HostModeTitle = styled.span`
  font-size: 0.72rem;
  font-weight: 600;
  color: ${editorTheme.textSecondary};
  white-space: nowrap;
  line-height: 1;
`

const TextArea = styled.textarea`
  width: 100%;
  min-height: ${COMPOSER_TEXT_MIN_PX}px;
  max-height: ${COMPOSER_TEXT_MAX_PX}px;
  border: none;
  background: transparent;
  padding: 0.12rem 0.1rem;
  font-size: 0.88rem;
  line-height: 1.45;
  color: ${editorTheme.text};
  resize: none;
  outline: none;
  font-family: inherit;

  &::placeholder { color: ${editorTheme.textMuted}; }
  &:disabled { opacity: 0.65; cursor: not-allowed; }
`

const ActionRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  min-width: 0;
  gap: 10px;
`

const LeftTools = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
  min-height: ${editorTheme.composerControlHeight}px;
  overflow: visible;
`

