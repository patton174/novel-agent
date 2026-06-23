import type { AgentTodoStatus } from '../../../types/agent'
import { todoRowIconSlotClass, todoRowIconSvgClass } from '@/lib/timelineClasses'

const BOX = { x: 3, y: 3, size: 18, stroke: 2 }

/** 像素风方形勾选框 */
export function TodoRowIcon({ status }: { status: AgentTodoStatus }) {
  const animate = status === 'in_progress'

  if (status === 'completed') {
    return (
      <span className={todoRowIconSlotClass(true)} aria-hidden>
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" className="block">
          <rect
            x={BOX.x}
            y={BOX.y}
            width={BOX.size}
            height={BOX.size}
            stroke="currentColor"
            strokeWidth={BOX.stroke}
            fill="currentColor"
          />
          <path
            d="M8 12.5 10.5 15 16 9.5"
            stroke="var(--ink, #1a1a1a)"
            strokeWidth="2.2"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </svg>
      </span>
    )
  }

  if (status === 'cancelled') {
    return (
      <span className={todoRowIconSlotClass()} aria-hidden>
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" className="block opacity-55">
          <rect
            x={BOX.x}
            y={BOX.y}
            width={BOX.size}
            height={BOX.size}
            stroke="currentColor"
            strokeWidth={BOX.stroke}
          />
          <path
            d="M9 9 15 15 M15 9 9 15"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
          />
        </svg>
      </span>
    )
  }

  if (status === 'in_progress') {
    return (
      <span className={todoRowIconSlotClass(true)} aria-hidden>
        <svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          className={todoRowIconSvgClass(animate)}
        >
          <rect
            x={BOX.x}
            y={BOX.y}
            width={BOX.size}
            height={BOX.size}
            stroke="currentColor"
            strokeWidth={BOX.stroke}
            fill="currentColor"
            fillOpacity={0.25}
          />
          <path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
        </svg>
      </span>
    )
  }

  return (
    <span className={todoRowIconSlotClass()} aria-hidden>
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" className="block">
        <rect
          x={BOX.x}
          y={BOX.y}
          width={BOX.size}
          height={BOX.size}
          stroke="currentColor"
          strokeWidth={BOX.stroke}
        />
      </svg>
    </span>
  )
}
