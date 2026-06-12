import { useCallback, useEffect, useState } from 'react'
import { EditorButton } from '../ui/EditorButton'
import { editorFieldClass } from '@/lib/editorFieldClasses'
import {
  AGENT_CHOICE_DESC,
  AGENT_CHOICE_TITLE,
  agentChoiceButtonClass,
} from '@/lib/agentFormClasses'
import type {
  AgentChoiceOption,
  AgentInteractionPayload,
  AskUserAnswers,
  AskUserQuestion,
} from '../../types/agent'

export interface AskUserFormProps {
  interaction: AgentInteractionPayload
  onSubmit?: (answers: AskUserAnswers) => void
}

function isQuestionAnswered(q: AskUserQuestion, answers: AskUserAnswers): boolean {
  const row = answers[q.id]
  if (!row) return false
  if (q.type === 'user_input') return Boolean(row.input?.trim())
  if (q.type === 'single_select') return Boolean(row.choice)
  if (q.type === 'multi_select') return Boolean(row.selected?.length)
  return false
}

export function AskUserForm({ interaction, onSubmit }: AskUserFormProps) {
  const questions = interaction.questions ?? []
  const [answers, setAnswers] = useState<AskUserAnswers>({})
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    setAnswers({})
    setStepIndex(0)
  }, [interaction])

  const current = questions[stepIndex] ?? null
  const total = questions.length
  const isLast = stepIndex >= total - 1

  const advanceOrSubmit = useCallback(
    (nextAnswers: AskUserAnswers) => {
      if (isLast) {
        if (questions.every((q) => isQuestionAnswered(q, nextAnswers))) {
          onSubmit?.(nextAnswers)
        }
        return
      }
      setStepIndex((i) => Math.min(i + 1, total - 1))
    },
    [isLast, onSubmit, questions, total],
  )

  const toggleMulti = (q: AskUserQuestion, choice: AgentChoiceOption) => {
    setAnswers((prev) => {
      const currentSelected = prev[q.id]?.selected ?? []
      const exists = currentSelected.some((c) => c.id === choice.id)
      const nextSelected = exists
        ? currentSelected.filter((c) => c.id !== choice.id)
        : [...currentSelected, choice]
      return { ...prev, [q.id]: { choice: undefined, selected: nextSelected } }
    })
  }

  const pickSingle = (q: AskUserQuestion, choice: AgentChoiceOption) => {
    setAnswers((prev) => ({ ...prev, [q.id]: { choice, selected: undefined } }))
  }

  const handleInputKeyDown = (q: AskUserQuestion, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
    e.preventDefault()
    const row = answers[q.id]
    if (!row?.input?.trim()) return
    advanceOrSubmit(answers)
  }

  if (!current || total === 0) {
    return null
  }

  const currentAnswered = isQuestionAnswered(current, answers)
  const multiMin = interaction.min_select ?? 1
  const multiCount = answers[current.id]?.selected?.length ?? 0
  const canAdvanceMulti = current.type === 'multi_select' && multiCount >= multiMin
  const canAdvanceSingle = current.type === 'single_select' && currentAnswered
  const selectOptions = current.options ?? []
  const effectiveType =
    (current.type === 'single_select' || current.type === 'multi_select') &&
    selectOptions.length === 0
      ? 'user_input'
      : current.type

  const progressRatio = (stepIndex + 1) / total

  return (
    <div className="mt-0.5 flex flex-col gap-2 max-md:gap-1.5">
      {interaction.prompt && stepIndex === 0 ? (
        <p className="m-0 text-sm leading-snug text-muted-foreground">{interaction.prompt}</p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <div className="text-[11px] font-semibold text-muted-foreground">
          第 {stepIndex + 1} / {total} 题
        </div>
        <div className="h-0.5 overflow-hidden rounded-full bg-border" aria-hidden>
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progressRatio * 100))}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 py-0.5 max-md:gap-1">
        <div className="text-sm font-semibold leading-snug text-foreground">{current.prompt}</div>

        {effectiveType === 'user_input' ? (
          <>
            <input
              className={editorFieldClass}
              value={answers[current.id]?.input ?? ''}
              placeholder={current.free_text_hint ?? interaction.free_text_hint ?? '请输入…'}
              autoFocus
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, [current.id]: { input: e.target.value } }))
              }
              onKeyDown={(e) => handleInputKeyDown(current, e)}
            />
            <ActionRow
              stepIndex={stepIndex}
              onPrev={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={!currentAnswered}
              label={isLast ? '提交' : '下一题'}
              onAction={() => advanceOrSubmit(answers)}
            />
          </>
        ) : null}

        {effectiveType === 'single_select'
          ? selectOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={agentChoiceButtonClass(answers[current.id]?.choice?.id === opt.id)}
                onClick={() => pickSingle(current, opt)}
              >
                <div className={AGENT_CHOICE_TITLE}>{opt.title}</div>
                {opt.description ? <div className={AGENT_CHOICE_DESC}>{opt.description}</div> : null}
              </button>
            ))
          : null}

        {effectiveType === 'single_select' ? (
          <ActionRow
            stepIndex={stepIndex}
            onPrev={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={!canAdvanceSingle}
            label={isLast ? '提交' : '下一题'}
            onAction={() => advanceOrSubmit(answers)}
          />
        ) : null}

        {effectiveType === 'multi_select' ? (
          <>
            <div className="text-[11px] text-muted-foreground">可多选，选完后点「下一题」</div>
            {selectOptions.map((opt) => {
              const selected = answers[current.id]?.selected?.some((c) => c.id === opt.id)
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={agentChoiceButtonClass(selected)}
                  onClick={() => toggleMulti(current, opt)}
                >
                  <div className={AGENT_CHOICE_TITLE}>{opt.title}</div>
                  {opt.description ? (
                    <div className={AGENT_CHOICE_DESC}>{opt.description}</div>
                  ) : null}
                </button>
              )
            })}
            <ActionRow
              stepIndex={stepIndex}
              onPrev={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={!canAdvanceMulti}
              label={
                isLast
                  ? `提交${multiCount > 0 ? ` (${multiCount})` : ''}`
                  : `下一题${multiCount > 0 ? ` (${multiCount})` : ''}`
              }
              onAction={() => advanceOrSubmit(answers)}
            />
          </>
        ) : null}
      </div>
    </div>
  )
}

function ActionRow({
  stepIndex,
  onPrev,
  disabled,
  label,
  onAction,
}: {
  stepIndex: number
  onPrev: () => void
  disabled: boolean
  label: string
  onAction: () => void
}) {
  return (
    <div className="mt-1 flex items-center justify-between gap-2 max-md:mt-0.5 max-md:gap-1.5">
      {stepIndex > 0 ? (
        <EditorButton variant="tool" type="button" size="sm" onClick={onPrev}>
          上一题
        </EditorButton>
      ) : (
        <span />
      )}
      <EditorButton variant="accent" type="button" size="sm" disabled={disabled} onClick={onAction}>
        {label}
      </EditorButton>
    </div>
  )
}
