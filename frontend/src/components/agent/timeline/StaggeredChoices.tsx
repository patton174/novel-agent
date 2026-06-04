import { useEffect, useState } from 'react'
import type { AgentChoiceOption, AgentInteractionPayload } from '../../../types/agent'
import { CcChoiceButton, ChoiceDesc, ChoiceReveal, ChoiceTitle } from './timelineStyles'

export function StaggeredChoices({
  choices,
  stepId,
  interaction,
  multiSelected,
  singleSelectedId,
  onToggle,
  onSelectSingle,
}: {
  choices: AgentChoiceOption[]
  stepId: string
  interaction?: AgentInteractionPayload
  multiSelected: AgentChoiceOption[]
  singleSelectedId?: string
  onToggle: (choice: AgentChoiceOption) => void
  onSelectSingle: (choice: AgentChoiceOption) => void
}) {
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    setVisibleCount(0)
    if (!choices.length) {
      return undefined
    }
    let count = 0
    const timer = window.setInterval(() => {
      count += 1
      setVisibleCount(count)
      if (count >= choices.length) {
        window.clearInterval(timer)
      }
    }, 120)
    return () => window.clearInterval(timer)
  }, [choices, stepId])

  const isMulti = interaction?.type === 'multi_select'

  return (
    <>
      {choices.slice(0, visibleCount).map((choice, index) => (
        <ChoiceReveal key={choice.id} $delayMs={index * 40}>
          <CcChoiceButton
            type="button"
            $active={Boolean(
              isMulti
                ? multiSelected.some((item) => item.id === choice.id)
                : singleSelectedId === choice.id,
            )}
            onClick={() => {
              if (isMulti) {
                onToggle(choice)
                return
              }
              onSelectSingle(choice)
            }}
          >
            <ChoiceTitle>{choice.title}</ChoiceTitle>
            {choice.description ? <ChoiceDesc>{choice.description}</ChoiceDesc> : null}
          </CcChoiceButton>
        </ChoiceReveal>
      ))}
    </>
  )
}
