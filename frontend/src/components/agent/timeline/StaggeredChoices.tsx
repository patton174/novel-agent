import { useEffect, useState } from 'react'
import type { AgentChoiceOption, AgentInteractionPayload } from '../../../types/agent'
import {
  ccChoiceButtonClass,
  CHOICE_DESC,
  CHOICE_REVEAL,
  CHOICE_TITLE,
  choiceRevealStyle,
} from '@/lib/timelineClasses'

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
        <div
          key={choice.id}
          className={CHOICE_REVEAL}
          style={choiceRevealStyle(index * 40)}
        >
          <button
            type="button"
            className={ccChoiceButtonClass(
              Boolean(
                isMulti
                  ? multiSelected.some((item) => item.id === choice.id)
                  : singleSelectedId === choice.id,
              ),
            )}
            onClick={() => {
              if (isMulti) {
                onToggle(choice)
                return
              }
              onSelectSingle(choice)
            }}
          >
            <div className={CHOICE_TITLE}>{choice.title}</div>
            {choice.description ? (
              <div className={CHOICE_DESC}>{choice.description}</div>
            ) : null}
          </button>
        </div>
      ))}
    </>
  )
}
