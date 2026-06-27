import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import {
  CURSOR_AGENT_COL,
  CURSOR_AGENT_LIST,
  CURSOR_AGENT_NARRATIVE,
  CURSOR_AGENT_SCROLL,
  CURSOR_COMPOSER,
  CURSOR_DOC_PANE,
  CURSOR_FILE_CHIP,
  CURSOR_STATUS_LINE,
  CURSOR_SUMMARY_CARD,
  CURSOR_TABS,
  CURSOR_TASK_COL,
  CURSOR_THINKING,
  CURSOR_USER_PROMPT,
  CURSOR_WIN,
  CURSOR_WIN_BAR,
  CURSOR_WIN_BODY,
  cursorTabClass,
  cursorTaskBtnClass,
} from '@/lib/cursorLandingClasses'

import { BRAND_NAME } from '@/lib/brand'

export type NovelCursorMockVariant = 'hero' | 'prd' | 'parallel' | 'stream'

function useCursorDemoCopy() {
  const { t } = useTranslation('marketing')

  return useMemo(() => {
    const tasks = t('demo.cursor.tasks', { returnObjects: true }) as Record<
      string,
      { name: string; time?: string; timeActive?: string }
    >
    const prompts = t('demo.cursor.prompts', { returnObjects: true }) as Record<string, string>
    const steps = t('demo.cursor.steps', { returnObjects: true }) as Record<string, string>
    const preview = t('demo.cursor.preview', { returnObjects: true }) as {
      title: string
      p1: string
      p2Before: string
      highlight: string
      streamLine: string
    }
    const tabs = t('demo.cursor.tabs', { returnObjects: true }) as Record<string, string>
    const outlineLines = t('demo.cursor.outlineLines', { returnObjects: true }) as string[]

    return {
      composerInput: t('demo.cursor.composerInput'),
      windowEditor: t('demo.cursor.windowEditor'),
      previewUrl: t('demo.cursor.previewUrl'),
      thinking: (seconds: number) => t('demo.cursor.thinking', { seconds }),
      summaryLabel: t('demo.cursor.summaryLabel'),
      tasks,
      prompts,
      steps,
      narrative: t('demo.cursor.narrative'),
      fileChapter: t('demo.cursor.fileChapter'),
      fileChapterShort: t('demo.cursor.fileChapterShort'),
      subagentDone: t('demo.cursor.subagentDone'),
      summaryText: t('demo.cursor.summaryText'),
      floatPrompt: t('demo.cursor.floatPrompt'),
      outlineTitle: t('demo.cursor.outlineTitle'),
      outlineLines,
      prdPrompt: t('demo.cursor.prdPrompt'),
      preview,
      tabs,
      fileChipChapter: t('demo.cursor.fileChipChapter'),
    }
  }, [t])
}

function WinDots() {
  return (
    <div className="dots" aria-hidden>
      <span className="dot r" />
      <span className="dot y" />
      <span className="dot g" />
    </div>
  )
}

function AgentComposer({ placeholder }: { placeholder: string }) {
  return (
    <div className={CURSOR_COMPOSER}>
      <span className="input">{placeholder}</span>
      <span className="pill">Agent</span>
      <span className="pill">Composer</span>
      <span className="send" aria-hidden />
    </div>
  )
}

/** 主窗：左侧任务列表 + 右侧 Agent（对齐 Cursor Desktop） */
export function CursorDesktopMock({
  className,
  variant = 'hero',
}: {
  className?: string
  variant?: NovelCursorMockVariant
}) {
  const copy = useCursorDemoCopy()
  const isParallel = variant === 'parallel'
  const promptKey = variant === 'prd' ? 'prd' : variant === 'parallel' ? 'parallel' : 'hero'
  const thinkingSeconds = variant === 'prd' ? 5 : variant === 'parallel' ? 6 : 6

  return (
    <div className={cn(CURSOR_WIN, className)} data-cursor-mock="desktop">
      <div className={CURSOR_WIN_BAR}>
        <WinDots />
        <span className="title">
          {BRAND_NAME} · {copy.windowEditor}
        </span>
      </div>
      <div className={CURSOR_WIN_BODY}>
        <div className={CURSOR_TASK_COL}>
          <div className={cn(cursorTaskBtnClass('done'), 'cursor-task')} data-step="task-0">
            <div className="row">
              <span className="name">{copy.tasks.continueCh2.name}</span>
              <span className="time">{copy.tasks.continueCh2.time}</span>
            </div>
            <span className="diff">
              <span className="add">+1840</span> <span className="del">-12</span>
            </span>
          </div>
          <div className={cn(cursorTaskBtnClass('active'), 'cursor-task')} data-step="task-1">
            <div className="row">
              <span className="name">{copy.tasks.characterCheck.name}</span>
              <span className="time">{copy.tasks.characterCheck.timeActive}</span>
            </div>
          </div>
          <div className={cn(cursorTaskBtnClass('idle'), 'cursor-task')} data-step="task-2">
            <div className="row">
              <span className="name">{copy.tasks.planCh3.name}</span>
              <span className="time">{copy.tasks.planCh3.time}</span>
            </div>
          </div>
          {isParallel ? (
            <div className={cn(cursorTaskBtnClass('idle'), 'cursor-task')} data-step="task-3">
              <div className="row">
                <span className="name">{copy.tasks.subagentWorld.name}</span>
                <span className="time">{copy.tasks.subagentWorld.time}</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className={CURSOR_AGENT_COL} data-demo-agent-pane>
          <div className={CURSOR_AGENT_SCROLL}>
            <div className={cn(CURSOR_USER_PROMPT, 'cursor-user-prompt')} data-step="prompt">
              {copy.prompts[promptKey]}
            </div>

            <div className={cn(CURSOR_THINKING, 'cursor-thinking')} data-step="thinking">
              <span className="dot" />
              {copy.thinking(thinkingSeconds)}
            </div>

            <ul className={cn(CURSOR_AGENT_LIST, 'cursor-agent-list')}>
              <li className="cursor-step" data-step="step-0">
                {copy.steps.readChapter}
              </li>
              <li className="cursor-step" data-step="step-1">
                {copy.steps.searchCharacters}
              </li>
              <li className="cursor-step" data-step="step-2">
                {copy.steps.generatePlan}
              </li>
              {isParallel ? (
                <li className="cursor-step" data-step="step-3">
                  {copy.steps.spawnSubagent}
                </li>
              ) : null}
            </ul>

            <p className={cn(CURSOR_AGENT_NARRATIVE, 'cursor-narrative')} data-step="narrative">
              {copy.narrative}
            </p>

            <div className={cn(CURSOR_FILE_CHIP, 'cursor-chip')} data-step="chip-0">
              <span className="badge">MD</span>
              <span>{copy.fileChapter}</span>
              <span className="add">+520</span>
              <span className="del">-0</span>
            </div>

            {variant !== 'hero' ? (
              <div className={cn(CURSOR_FILE_CHIP, 'cursor-chip')} data-step="chip-1">
                <span className="badge">MEM</span>
                <span>memory/characters/Tang_Yun</span>
                <span className="add">+48</span>
                <span className="del">-3</span>
              </div>
            ) : null}

            {variant === 'parallel' ? (
              <div className={cn(CURSOR_STATUS_LINE, 'cursor-status')} data-step="status">
                <span className="ok">✓</span>
                {copy.subagentDone}
              </div>
            ) : null}

            {variant === 'stream' ? (
              <div className={cn(CURSOR_SUMMARY_CARD, 'cursor-summary')} data-step="summary">
                <div className="label">{copy.summaryLabel}</div>
                <div className="text">{copy.summaryText}</div>
              </div>
            ) : null}
          </div>
          <AgentComposer placeholder={copy.composerInput} />
        </div>
      </div>
    </div>
  )
}

/** 预览窗：章节阅读 + 高亮（对齐 Cursor localhost 预览） */
export function CursorPreviewMock({ className }: { className?: string }) {
  const copy = useCursorDemoCopy()

  return (
    <div className={cn(CURSOR_WIN, className)} data-cursor-mock="preview">
      <div className={CURSOR_WIN_BAR}>
        <WinDots />
        <span className="url">{copy.previewUrl}</span>
      </div>
      <div className={CURSOR_DOC_PANE}>
        <h4>{copy.preview.title}</h4>
        <p>{copy.preview.p1}</p>
        <p>
          {copy.preview.p2Before}
          <span className="hl cursor-preview-hl" data-step="preview-hl">
            {copy.preview.highlight}
          </span>
        </p>
        <p className="cursor-stream-line" data-step="stream-line-0" style={{ opacity: 0.4 }}>
          {copy.preview.streamLine}
        </p>
      </div>
    </div>
  )
}

/** 小浮窗：精简 Agent 状态（对齐 Cursor CLI 卡片） */
export function CursorFloatCardMock({ className }: { className?: string }) {
  const copy = useCursorDemoCopy()

  return (
    <div className={cn(CURSOR_WIN, className)} data-cursor-mock="float">
      <div className={CURSOR_WIN_BAR}>
        <WinDots />
        <span className="title">{BRAND_NAME}</span>
      </div>
      <div className={CURSOR_AGENT_SCROLL} style={{ padding: '0.55rem 0.65rem' }}>
        <div className={cn(CURSOR_USER_PROMPT, 'cursor-user-prompt')} data-step="float-prompt">
          {copy.floatPrompt}
        </div>
        <div className={cn(CURSOR_THINKING, 'cursor-thinking')} data-step="float-think">
          <span className="dot" />
          {copy.thinking(4)}
        </div>
        <ul className={cn(CURSOR_AGENT_LIST, 'cursor-agent-list')}>
          <li className="cursor-step" data-step="float-step-0">
            {copy.steps.readMemoryFloat}
          </li>
          <li className="cursor-step" data-step="float-step-1">
            {copy.steps.writeChapterFloat}
          </li>
        </ul>
        <div className={cn(CURSOR_FILE_CHIP, 'cursor-chip')} data-step="float-chip">
          <span className="badge">MD</span>
          <span>{copy.fileChapterShort}</span>
          <span className="add">+1840</span>
        </div>
      </div>
    </div>
  )
}

/** Feature 卡内：带 Tab 的 PRD + Agent（对齐 Cursor feature-prd） */
export function CursorPrdFeatureMock() {
  const copy = useCursorDemoCopy()

  return (
    <div className="demo-app-mock demo-agent-console" data-variant="prd" style={{ height: '100%' }}>
      <div
        className={cn(CURSOR_WIN, '!relative h-full w-full shadow-none')}
        data-cursor-mock="prd"
      >
        <div className={CURSOR_TABS}>
          <div className={cursorTabClass(true)}>{copy.tabs.outline}</div>
          <div className={cursorTabClass()}>{copy.tabs.chapter}</div>
          <div className={cursorTabClass()}>{copy.tabs.memory}</div>
        </div>
        <div className={CURSOR_WIN_BODY} style={{ minHeight: 360 }}>
          <div className={cn(CURSOR_DOC_PANE, 'w-[42%] border-r border-black/[0.08]')}>
            <h4>{copy.outlineTitle}</h4>
            {copy.outlineLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <div className={cn(CURSOR_AGENT_COL, 'flex-1')} data-demo-agent-pane>
            <div className={CURSOR_AGENT_SCROLL}>
              <div className={cn(CURSOR_USER_PROMPT, 'cursor-user-prompt')} data-step="prompt">
                {copy.prdPrompt}
              </div>
              <div className={cn(CURSOR_THINKING, 'cursor-thinking')} data-step="thinking">
                <span className="dot" />
                {copy.thinking(5)}
              </div>
              <ul className={cn(CURSOR_AGENT_LIST, 'cursor-agent-list')}>
                <li className="cursor-step" data-step="step-0">
                  {copy.steps.readOutline}
                </li>
                <li className="cursor-step" data-step="step-1">
                  {copy.steps.callPlan}
                </li>
                <li className="cursor-step" data-step="step-2">
                  {copy.steps.writeChapter}
                </li>
              </ul>
              <div className={cn(CURSOR_FILE_CHIP, 'cursor-chip')} data-step="chip-0">
                <span className="badge">MD</span>
                <span>{copy.fileChipChapter}</span>
                <span className="add">+520</span>
              </div>
            </div>
            <AgentComposer placeholder={copy.composerInput} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function NovelCursorMock({ variant }: { variant: NovelCursorMockVariant }) {
  if (variant === 'prd') {
    return <CursorPrdFeatureMock />
  }
  if (variant === 'parallel') {
    return (
      <div className="demo-app-mock demo-agent-console" data-variant={variant} style={{ padding: '1.25rem' }}>
        <div style={{ position: 'relative', width: '100%', boxShadow: 'none' }}>
          <CursorDesktopMock variant="parallel" />
        </div>
      </div>
    )
  }
  if (variant === 'stream') {
    return (
      <div
        className="demo-app-mock demo-agent-console"
        data-variant={variant}
        style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}
      >
        <div style={{ position: 'relative', width: '100%', boxShadow: 'none' }}>
          <CursorDesktopMock variant="stream" />
        </div>
        <div style={{ position: 'relative', width: '100%', boxShadow: 'none' }}>
          <CursorPreviewMock />
        </div>
      </div>
    )
  }
  return <CursorDesktopMock variant="hero" />
}
