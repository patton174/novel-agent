import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { AgentContextUsage } from '../../types/agent'
import type { ComposerSpinnerMode } from '../../utils/deriveComposerSpinnerMode'
import { ModelSelector } from '@/components/model/ModelSelector'
import { EditorButton, EditorSendIconLayer } from '../ui/EditorButton'
import { ComposerStatusBar } from './ComposerStatusBar'
import { cn } from '@/lib/utils'
import { editorPixelIconButtonClass } from '@/lib/editorPixelClasses'
import { appToast } from '@/stores/appToastStore'
import {
  EDITOR_PIXEL_COMPOSER_TEXT,
  EDITOR_PIXEL_COMPOSER_WRAP,
} from '@/lib/editorPixelClasses'

/** 约 4 行正文高度，避免悬浮区过高 */
const COMPOSER_TEXT_MIN_PX = 40
const COMPOSER_TEXT_MAX_PX = 100

const Icons = {
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  ),
  ArrowUp: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  ),
  Stop: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
      <rect x="7" y="7" width="10" height="10" rx="1" />
    </svg>
  ),
}

export interface ChatComposerProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  isLoading?: boolean
  modelOverride?: string | null
  onModelOverrideChange?: (value: string | null) => void
  streamActive?: boolean
  spinnerMode?: ComposerSpinnerMode
  onStreamPause?: () => void
  onStreamAbort?: () => void
  contextUsage?: AgentContextUsage | null
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  isLoading = false,
  modelOverride = null,
  onModelOverrideChange,
  streamActive = false,
  spinnerMode = 'idle',
  onStreamPause,
  onStreamAbort,
  contextUsage,
}: ChatComposerProps) {
  const { t } = useTranslation(['editor'])
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
      if (onStreamPause) {
        onStreamPause()
      } else {
        onStreamAbort?.()
      }
      return
    }
    if (value.trim() && !isLoading) {
      onSend()
    }
  }

  const handleAttachClick = () => {
    appToast.info(t('editor:chat.attachSoon'))
  }

  return (
    <footer data-testid="chat-composer" className="w-full min-w-0">
      <div className={cn(EDITOR_PIXEL_COMPOSER_WRAP, 'flex w-full min-w-0 flex-col gap-1.5')}>
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
            EDITOR_PIXEL_COMPOSER_TEXT,
            'w-full resize-none border-none bg-transparent outline-none',
            'placeholder:text-muted-foreground',
            'disabled:cursor-not-allowed disabled:opacity-65',
          )}
        />

        <div className="flex w-full min-w-0 items-center justify-between gap-2 max-md:gap-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <button
              type="button"
              data-testid="composer-attach-btn"
              onClick={handleAttachClick}
              disabled={streaming}
              aria-label={t('editor:chat.attachSoon')}
              title={t('editor:chat.attachSoon')}
              className={cn(editorPixelIconButtonClass(), 'text-foreground disabled:opacity-45')}
            >
              <Icons.Plus />
            </button>
            {onModelOverrideChange ? (
              <ModelSelector
                compact
                value={modelOverride}
                onChange={onModelOverrideChange}
                disabled={streaming}
                className="min-w-0 flex-1"
              />
            ) : null}
          </div>

          <EditorButton
            variant="send"
            streaming={streaming}
            onClick={handleActionClick}
            disabled={!streaming && (!value.trim() || isLoading)}
            aria-label={streaming ? t('editor:chat.pause') : t('editor:chat.send')}
            data-testid={streaming ? 'stream-pause-btn' : 'send-btn'}
          >
            <EditorSendIconLayer visible={!streaming} aria-hidden={streaming}>
              <Icons.ArrowUp />
            </EditorSendIconLayer>
            <EditorSendIconLayer visible={streaming} aria-hidden={!streaming}>
              <Icons.Stop />
            </EditorSendIconLayer>
          </EditorButton>
        </div>

        <div className="hidden border-t-2 border-foreground/20 pt-1.5 md:block">
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
