import { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import { editorTheme } from '../../styles/editorTheme'
import { palette } from '../../styles/theme'
import { textStyle } from '../../styles/typography'
import { CcChoiceButton, ChoiceDesc, ChoiceTitle } from './timeline/timelineStyles'
import { EditorButton } from '../ui/EditorButton'
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

  return (
    <Wrap>
      {interaction.prompt && stepIndex === 0 ? <Overview>{interaction.prompt}</Overview> : null}

      <ProgressRow>
        <ProgressText>
          第 {stepIndex + 1} / {total} 题
        </ProgressText>
        <ProgressBar aria-hidden>
          <ProgressFill $ratio={(stepIndex + 1) / total} />
        </ProgressBar>
      </ProgressRow>

      <QuestionBlock>
        <QuestionTitle>{current.prompt}</QuestionTitle>

        {effectiveType === 'user_input' ? (
          <>
            <TextInput
              value={answers[current.id]?.input ?? ''}
              placeholder={current.free_text_hint ?? interaction.free_text_hint ?? '请输入…'}
              autoFocus
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, [current.id]: { input: e.target.value } }))
              }
              onKeyDown={(e) => handleInputKeyDown(current, e)}
            />
            <ActionRow>
              {stepIndex > 0 ? (
                <EditorButton
                  variant="tool"
                  type="button"
                  onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                >
                  上一题
                </EditorButton>
              ) : (
                <span />
              )}
              <EditorButton
                variant="accent"
                type="button"
                disabled={!currentAnswered}
                onClick={() => advanceOrSubmit(answers)}
              >
                {isLast ? '提交' : '下一题'}
              </EditorButton>
            </ActionRow>
          </>
        ) : null}

        {effectiveType === 'single_select'
          ? selectOptions.map((opt) => (
              <CcChoiceButton
                key={opt.id}
                type="button"
                $active={answers[current.id]?.choice?.id === opt.id}
                onClick={() => pickSingle(current, opt)}
              >
                <ChoiceTitle>{opt.title}</ChoiceTitle>
                {opt.description ? <ChoiceDesc>{opt.description}</ChoiceDesc> : null}
              </CcChoiceButton>
            ))
          : null}

        {effectiveType === 'single_select' ? (
          <ActionRow>
            {stepIndex > 0 ? (
              <EditorButton
                variant="tool"
                type="button"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              >
                上一题
              </EditorButton>
            ) : (
              <span />
            )}
            <EditorButton
              variant="accent"
              type="button"
              disabled={!canAdvanceSingle}
              onClick={() => advanceOrSubmit(answers)}
            >
              {isLast ? '提交' : '下一题'}
            </EditorButton>
          </ActionRow>
        ) : null}

        {effectiveType === 'multi_select' ? (
          <>
            <MultiHint>可多选，选完后点「下一题」</MultiHint>
            {selectOptions.map((opt) => {
              const selected = answers[current.id]?.selected?.some((c) => c.id === opt.id)
              return (
                <CcChoiceButton
                  key={opt.id}
                  type="button"
                  $active={selected}
                  onClick={() => toggleMulti(current, opt)}
                >
                  <ChoiceTitle>{opt.title}</ChoiceTitle>
                  {opt.description ? <ChoiceDesc>{opt.description}</ChoiceDesc> : null}
                </CcChoiceButton>
              )
            })}
            <ActionRow>
              {stepIndex > 0 ? (
                <EditorButton
                  variant="tool"
                  type="button"
                  onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                >
                  上一题
                </EditorButton>
              ) : (
                <span />
              )}
              <EditorButton
                variant="accent"
                type="button"
                disabled={!canAdvanceMulti}
                onClick={() => advanceOrSubmit(answers)}
              >
                {isLast ? '提交' : '下一题'}
                {multiCount > 0 ? ` (${multiCount})` : ''}
              </EditorButton>
            </ActionRow>
          </>
        ) : null}
      </QuestionBlock>
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-top: 0.1rem;

  @media (max-width: 767px) {
    gap: 0.4rem;
  }
`

const Overview = styled.p`
  margin: 0;
  ${textStyle('uiSm')}
  color: ${editorTheme.textSecondary};
  line-height: 1.45;
`

const ProgressRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`

const ProgressText = styled.div`
  ${textStyle('micro')}
  font-weight: 600;
  color: ${editorTheme.textMuted};
`

const ProgressBar = styled.div`
  height: 2px;
  border-radius: 999px;
  background: ${editorTheme.border};
  overflow: hidden;
`

const ProgressFill = styled.div<{ $ratio: number }>`
  height: 100%;
  width: ${({ $ratio }) => `${Math.min(100, Math.max(0, $ratio * 100))}%`};
  background: ${palette.progressFill};
  border-radius: inherit;
  transition: width 0.2s ease;
`

const QuestionBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.15rem 0;

  @media (max-width: 767px) {
    gap: 0.28rem;
  }
`

const QuestionTitle = styled.div`
  ${textStyle('uiSm')}
  font-weight: 600;
  line-height: 1.45;
  color: ${editorTheme.text};
`

const MultiHint = styled.div`
  ${textStyle('micro')}
  color: ${editorTheme.textMuted};
`

const TextInput = styled.input`
  border: 1px solid ${editorTheme.border};
  border-radius: ${editorTheme.radiusSm};
  padding: 0.42rem 0.5rem;
  background: ${editorTheme.bgElevated};
  color: ${editorTheme.text};
  ${textStyle('uiSm')}

  &::placeholder {
    color: ${editorTheme.textMuted};
  }

  &:focus {
    outline: none;
    border-color: ${palette.accentBorder};
  }
`

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.25rem;

  @media (max-width: 767px) {
    gap: 0.35rem;
    margin-top: 0.15rem;
  }
`
