import { useEffect, useRef } from 'react'
import { ContextUsageMeter } from '../agent/ContextUsageMeter'
import type { AgentContextUsage } from '../../types/agent'
import { Switch } from '../ui/switch'
import { EditorButton, EditorSendIconLayer } from '../ui/EditorButton'
import { cn } from '@/lib/utils'

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
    <footer data-testid="chat-composer" className="w-full min-w-0">
      <div
        className={cn(
          'flex w-full min-w-0 flex-col gap-1.5 rounded-xl border border-border/80 bg-background',
          'px-2.5 py-2 shadow-sm',
          'max-md:gap-1 max-md:px-2 max-md:py-1.5',
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="给 AI 发送消息..."
          rows={1}
          disabled={isLoading && !streamActive}
          aria-label="聊天输入"
          style={{ minHeight: COMPOSER_TEXT_MIN_PX, maxHeight: COMPOSER_TEXT_MAX_PX }}
          className={cn(
            'w-full resize-none border-none bg-transparent px-0.5 py-0.5',
            'text-sm leading-snug text-foreground outline-none',
            'placeholder:text-muted-foreground',
            'disabled:cursor-not-allowed disabled:opacity-65',
          )}
        />

        <div className="flex w-full min-w-0 items-center justify-between gap-2.5 max-md:gap-1.5">
          <div className="flex min-h-8 min-w-0 items-center gap-1.5 overflow-visible max-md:flex-nowrap max-md:gap-1">
            <div
              data-testid="host-mode-control"
              title={hostModeEnabled ? 'AI 持续盯防，可后台长时运行' : '关闭时为单次对话'}
              className="inline-flex h-8 shrink-0 items-center gap-1.5"
            >
              <span className="hidden text-xs font-semibold text-muted-foreground md:inline">托管</span>
              <Switch
                checked={hostModeEnabled}
                onCheckedChange={onHostModeChange}
                aria-label="托管模式"
              />
            </div>
          </div>

          <ContextUsageMeter usage={contextUsage} pending={streamActive && !contextUsage} />

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
        </div>
      </div>
      <p className="mt-1.5 hidden text-center text-[11px] text-muted-foreground md:block">
        内容由 AI 生成，请谨慎参考
      </p>
    </footer>
  )
}
