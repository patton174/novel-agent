import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AgentContextUsage } from '../../types/agent'
import type { ComposerSpinnerMode } from '../../utils/deriveComposerSpinnerMode'
import { ModelSelector } from '@/components/model/ModelSelector'
import { EditorButton, EditorSendIconLayer } from '../ui/EditorButton'
import { ComposerStatusBar } from './ComposerStatusBar'
import { ReferenceBookPicker } from '../editor/ReferenceBookPicker'
import { SkillPicker } from '../agent/SkillPicker'
import { CrewPicker } from '../agent/CrewPicker'
import type { SelectableBook } from '@/api/libraryApi'
import { ensureAgentSkillRef } from '@/api/agentSkillApi'
import type { AgentSkillSummary } from '@/types/agentSkill'
import type { CrewTemplateSummary } from '@/types/crew'
import { FEATURE_AGENT_CREW, FEATURE_AGENT_SKILLS, FEATURE_LIBRARY_REF } from '@/config/features'
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

export interface ReferencedBookChip {
  catalogNovelId: string
  title: string
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
  referencedBooks?: ReferencedBookChip[]
  onReferencedBooksChange?: (books: ReferencedBookChip[]) => void
  selectedSkills?: AgentSkillSummary[]
  onSelectedSkillsChange?: (skills: AgentSkillSummary[]) => void
  selectedCrew?: CrewTemplateSummary | null
  onSelectedCrewChange?: (crew: CrewTemplateSummary | null) => void
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
  referencedBooks = [],
  onReferencedBooksChange,
  selectedSkills = [],
  onSelectedSkillsChange,
  selectedCrew = null,
  onSelectedCrewChange,
}: ChatComposerProps) {
  const { t } = useTranslation(['editor'])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [skillPickerOpen, setSkillPickerOpen] = useState(false)
  const [skillPickerQuery, setSkillPickerQuery] = useState('')
  const [crewPickerOpen, setCrewPickerOpen] = useState(false)
  const [crewPickerQuery, setCrewPickerQuery] = useState('')
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

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    onChange(v)
    if (FEATURE_LIBRARY_REF) {
      const lastAt = v.lastIndexOf('@')
      if (lastAt >= 0 && v.slice(lastAt + 1).indexOf(' ') < 0) {
        setPickerQuery(v.slice(lastAt + 1))
        setPickerOpen(true)
      } else {
        setPickerOpen(false)
      }
    } else {
      setPickerOpen(false)
    }
    if (FEATURE_AGENT_SKILLS && !selectedCrew) {
      const lastSlash = v.lastIndexOf('/')
      if (lastSlash >= 0 && v.slice(lastSlash + 1).indexOf(' ') < 0) {
        setSkillPickerQuery(v.slice(lastSlash + 1))
        setSkillPickerOpen(true)
      } else {
        setSkillPickerOpen(false)
      }
    } else {
      setSkillPickerOpen(false)
    }
    if (FEATURE_AGENT_CREW) {
      const lastHash = v.lastIndexOf('#')
      if (lastHash >= 0 && v.slice(lastHash + 1).indexOf(' ') < 0) {
        setCrewPickerQuery(v.slice(lastHash + 1))
        setCrewPickerOpen(true)
      } else {
        setCrewPickerOpen(false)
      }
    } else {
      setCrewPickerOpen(false)
    }
  }

  const handlePick = (book: SelectableBook) => {
    const lastAt = value.lastIndexOf('@')
    if (lastAt < 0) return
    const newVal =
      value.slice(0, lastAt) + `【${book.title}】` + value.slice(lastAt + 1 + pickerQuery.length)
    onChange(newVal)
    onReferencedBooksChange?.([
      ...referencedBooks.filter((b) => b.catalogNovelId !== book.catalogNovelId),
      { catalogNovelId: book.catalogNovelId, title: book.title },
    ])
    setPickerOpen(false)
  }

  const handleSkillPick = (skill: AgentSkillSummary) => {
    if (selectedSkills.some((s) => s.id === skill.id)) {
      setSkillPickerOpen(false)
      return
    }
    if (selectedSkills.length >= 3) {
      appToast.info(t('editor:skill.maxReached'))
      setSkillPickerOpen(false)
      return
    }
    const lastSlash = value.lastIndexOf('/')
    if (lastSlash >= 0) {
      const newVal =
        value.slice(0, lastSlash) + value.slice(lastSlash + 1 + skillPickerQuery.length)
      onChange(newVal)
    }
    void (async () => {
      let picked: AgentSkillSummary = skill
      if (skill.isSystem) {
        try {
          picked = await ensureAgentSkillRef(skill.id)
        } catch {
          appToast.error(t('editor:skill.pinFail'))
          return
        }
      }
      onSelectedSkillsChange?.([...selectedSkills, picked])
      setSkillPickerOpen(false)
    })()
  }

  const handleCrewPick = (crew: CrewTemplateSummary) => {
    onSelectedCrewChange?.(crew)
    onSelectedSkillsChange?.([])
    const lastHash = value.lastIndexOf('#')
    if (lastHash >= 0) {
      onChange(value.slice(0, lastHash) + value.slice(lastHash + 1 + crewPickerQuery.length))
    }
    setCrewPickerOpen(false)
  }

  const handleCrewToolbarClick = () => {
    if (streaming) return
    setCrewPickerQuery('')
    setCrewPickerOpen((open) => !open)
    setPickerOpen(false)
    setSkillPickerOpen(false)
  }

  const handleSkillToolbarClick = () => {
    if (streaming) return
    setSkillPickerQuery('')
    setSkillPickerOpen((open) => !open)
    setPickerOpen(false)
  }

  return (
    <footer data-testid="chat-composer" className="w-full min-w-0">
      <div className={cn(EDITOR_PIXEL_COMPOSER_WRAP, 'flex w-full min-w-0 flex-col gap-1.5')}>
        {FEATURE_LIBRARY_REF && referencedBooks.length > 0 ? (
          <div className="flex flex-wrap gap-1 px-2 py-1">
            {referencedBooks.map((b, i) => (
              <span
                key={b.catalogNovelId}
                className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs"
              >
                📖{b.title}
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={t('editor:reference.remove', { title: b.title })}
                  onClick={() =>
                    onReferencedBooksChange?.(referencedBooks.filter((_, j) => j !== i))
                  }
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}
        {FEATURE_AGENT_CREW && selectedCrew ? (
          <div className="flex flex-wrap gap-1 px-2 py-1">
            <span className="inline-flex items-center gap-1 rounded bg-indigo-500/10 px-1.5 py-0.5 text-xs text-indigo-700 dark:text-indigo-300">
              ⚡{selectedCrew.displayName}
              <button
                type="button"
                className="opacity-70 hover:opacity-100"
                aria-label={t('editor:crew.remove', { name: selectedCrew.displayName })}
                onClick={() => onSelectedCrewChange?.(null)}
              >
                ×
              </button>
            </span>
          </div>
        ) : null}
        {FEATURE_AGENT_SKILLS && selectedSkills.length > 0 && !selectedCrew ? (
          <div className="flex flex-wrap gap-1 px-2 py-1">
            {selectedSkills.map((skill, i) => (
              <span
                key={skill.id}
                className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary"
              >
                ✦{skill.name}
                <button
                  type="button"
                  className="text-primary/70 hover:text-primary"
                  aria-label={t('editor:skill.remove', { name: skill.name })}
                  onClick={() =>
                    onSelectedSkillsChange?.(selectedSkills.filter((_, j) => j !== i))
                  }
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
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
          {FEATURE_LIBRARY_REF ? (
            <ReferenceBookPicker
              open={pickerOpen}
              query={pickerQuery}
              onPick={handlePick}
              onClose={() => setPickerOpen(false)}
            />
          ) : null}
          {FEATURE_AGENT_SKILLS && !selectedCrew ? (
            <SkillPicker
              open={skillPickerOpen}
              query={skillPickerQuery}
              selected={selectedSkills}
              onPick={handleSkillPick}
              onClose={() => setSkillPickerOpen(false)}
            />
          ) : null}
          {FEATURE_AGENT_CREW ? (
            <CrewPicker
              open={crewPickerOpen}
              query={crewPickerQuery}
              selected={selectedCrew}
              onPick={handleCrewPick}
              onClose={() => setCrewPickerOpen(false)}
            />
          ) : null}
        </div>

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
            {FEATURE_AGENT_SKILLS && !selectedCrew ? (
              <button
                type="button"
                data-testid="composer-skill-btn"
                onClick={handleSkillToolbarClick}
                disabled={streaming}
                aria-label={t('editor:skill.toolbar')}
                title={t('editor:skill.toolbar')}
                className={cn(
                  editorPixelIconButtonClass(),
                  'text-foreground disabled:opacity-45',
                  skillPickerOpen && 'bg-muted/50',
                )}
              >
                ✦
              </button>
            ) : null}
            {FEATURE_AGENT_CREW ? (
              <button
                type="button"
                data-testid="composer-crew-btn"
                onClick={handleCrewToolbarClick}
                disabled={streaming}
                aria-label={t('editor:crew.toolbar')}
                title={t('editor:crew.toolbar')}
                className={cn(
                  editorPixelIconButtonClass(),
                  'text-foreground disabled:opacity-45',
                  crewPickerOpen && 'bg-muted/50',
                )}
              >
                ⚡
              </button>
            ) : null}
            {onModelOverrideChange ? (
              <ModelSelector
                compact
                showSessionBadge
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
