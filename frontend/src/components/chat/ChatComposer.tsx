import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { AgentContextUsage } from '../../types/agent'
import type { ComposerSpinnerMode } from '../../utils/deriveComposerSpinnerMode'
import { Switch } from '../ui/switch'
import { EditorButton, EditorSendIconLayer } from '../ui/EditorButton'
import { ComposerStatusBar } from './ComposerStatusBar'
import { cn } from '@/lib/utils'

/** 约 4 行正文高度，避免悬浮区过高 */
const COMPOSER_TEXT_MIN_PX = 40
const COMPOSER_TEXT_MAX_PX = 100

const Icons = {
  ArrowUp: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  ),
  Stop: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5">
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
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
  spinnerMode?: ComposerSpinnerMode
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
  spinnerMode = 'idle',
  onStreamAbort,
  contextUsage,
}: ChatComposerProps) {
  const { t } = useTranslation(['editor', 'common'])
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
    <footer data-testid="chat-composer" className="w-full min-w-0">
      <div
        className={cn(
          'flex w-full min-w-0 flex-col gap-1.5 rounded-lg border border-border bg-background',
          'px-2.5 py-2 shadow-sm',
          'max-md:gap-1 max-md:px-2 max-md:py-1.5',
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('editor:chat.placeholder')}
          rows={1}
          disabled={isLoading && !streamActive}
          aria-label={t('editor:chat.placeholder')}
          style={{ minHeight: COMPOSER_TEXT_MIN_PX, maxHeight: COMPOSER_TEXT_MAX_PX }}
          className={cn(
            'w-full resize-none border-none bg-transparent px-0.5 py-0.5',
            'text-sm leading-snug text-foreground outline-none',
            'placeholder:text-muted-foreground',
            'disabled:cursor-not-allowed disabled:opacity-65',
          )}
        />

        <div className="flex w-full min-w-0 items-center justify-between gap-2 max-md:gap-1.5">
          <div
            data-testid="host-mode-control"
            title={hostModeEnabled ? t('editor:chat.hostModeHint') : t('editor:chat.hostModeOffHint')}
            className="inline-flex h-7 shrink-0 items-center gap-1.5"
          >
            <span className="hidden text-[11px] font-medium text-muted-foreground md:inline">
              {t('common:glossary.hostMode')}
            </span>
            <Switch
              checked={hostModeEnabled}
              onCheckedChange={onHostModeChange}
              aria-label={t('common:glossary.hostMode')}
            />
          </div>

          <EditorButton
            variant="send"
            streaming={streaming}
            onClick={handleActionClick}
            disabled={!streaming && (!value.trim() || isLoading)}
            aria-label={streaming ? t('editor:chat.stop') : t('editor:chat.send')}
            data-testid={streaming ? 'stream-stop-btn' : 'send-btn'}
          >
            <EditorSendIconLayer visible={!streaming} aria-hidden={streaming}>
              <Icons.ArrowUp />
            </EditorSendIconLayer>
            <EditorSendIconLayer visible={streaming} aria-hidden={!streaming}>
              <Icons.Stop />
            </EditorSendIconLayer>
          </EditorButton>
        </div>

        <div className="hidden border-t border-border/50 pt-1.5 md:block">
          <ComposerStatusBar
            contextUsage={contextUsage}
            pending={streamActive && !contextUsage}
            streamActive={streamActive}
            spinnerMode={spinnerMode}
          />
        </div>
      </div>
    </footer>
  )
}
