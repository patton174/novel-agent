import styled, { css, keyframes } from 'styled-components'
import type { AgentTodoStatus } from '../../../types/agent'
import { editorTheme } from '../../../styles/editorTheme'
import { palette } from '../../../styles/theme'

const strokePulse = keyframes`
  0% {
    stroke-dashoffset: 40;
    opacity: 0.55;
  }
  50% {
    stroke-dashoffset: 8;
    opacity: 1;
  }
  100% {
    stroke-dashoffset: 40;
    opacity: 0.55;
  }
`

const Slot = styled.span<{ $active?: boolean }>`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 0.95rem;
  height: 0.95rem;
  margin-top: 0.14rem;
  color: ${({ $active }) =>
    $active ? editorTheme.accent : editorTheme.textMuted};

  ${({ $active }) =>
    $active &&
    css`
      filter: drop-shadow(0 0 4px ${palette.accentBorderLight});
    `}
`

const Svg = styled.svg<{ $animate?: boolean }>`
  display: block;

  ${({ $animate }) =>
    $animate &&
    css`
      path,
      rect,
      circle {
        stroke-dasharray: 40;
        animation: ${strokePulse} 1.35s ease-in-out infinite;
      }
    `}
`

export function TodoRowIcon({ status }: { status: AgentTodoStatus }) {
  const animate = status === 'in_progress'

  if (status === 'completed') {
    return (
      <Slot $active aria-hidden>
        <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M8 12.2l2.4 2.4 5.8-6"
            stroke={palette.traceOk}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Slot>
    )
  }

  if (status === 'cancelled') {
    return (
      <Slot aria-hidden>
        <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" opacity={0.55} />
          <path
            d="M9 9l6 6M15 9l-6 6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </Svg>
      </Slot>
    )
  }

  if (status === 'in_progress') {
    return (
      <Slot $active aria-hidden>
        <Svg $animate={animate} width={15} height={15} viewBox="0 0 24 24" fill="none">
          <rect
            x="5"
            y="5"
            width="14"
            height="14"
            rx="2.5"
            stroke="currentColor"
            strokeWidth="1.65"
          />
          <path
            d="M9 12h6"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
          />
        </Svg>
      </Slot>
    )
  }

  return (
    <Slot aria-hidden>
      <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
        <rect
          x="5"
          y="5"
          width="14"
          height="14"
          rx="2.5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </Svg>
    </Slot>
  )
}
