import type { AgentTodoStatus } from '../../../types/agent'
import { palette } from '../../../styles/theme'
import { todoRowIconSlotClass, todoRowIconSvgClass } from '@/lib/timelineClasses'

export function TodoRowIcon({ status }: { status: AgentTodoStatus }) {
  const animate = status === 'in_progress'

  if (status === 'completed') {
    return (
      <span className={todoRowIconSlotClass(true)} aria-hidden>
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" className="block">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M8 12.2l2.4 2.4 5.8-6"
            stroke={palette.traceOk}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    )
  }

  if (status === 'cancelled') {
    return (
      <span className={todoRowIconSlotClass()} aria-hidden>
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" className="block">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" opacity={0.55} />
          <path
            d="M9 9l6 6M15 9l-6 6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </span>
    )
  }

  if (status === 'in_progress') {
    return (
      <span className={todoRowIconSlotClass(true)} aria-hidden>
        <svg
          width={15}
          height={15}
          viewBox="0 0 24 24"
          fill="none"
          className={todoRowIconSvgClass(animate)}
        >
          <rect x="5" y="5" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.65" />
          <path d="M9 12h6" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
        </svg>
      </span>
    )
  }

  return (
    <span className={todoRowIconSlotClass()} aria-hidden>
      <svg width={15} height={15} viewBox="0 0 24 24" fill="none" className="block">
        <rect x="5" y="5" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </span>
  )
}
