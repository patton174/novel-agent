import { useId } from 'react'
import styled, { css } from 'styled-components'
import { motionMs, motion } from '../../styles/motion'
import { palette } from '../../styles/theme'

export interface NeumorphicSwitchProps {
  /** 受控开关状态 */
  checked: boolean
  onChange: (checked: boolean) => void
  id?: string
  disabled?: boolean
  /** 无障碍标签 */
  'aria-label'?: string
  /** 尺寸：composer 与输入栏下拉同高；xs/sm/md 用于更大展示 */
  size?: 'composer' | 'xs' | 'sm' | 'md'
  className?: string
}

export function NeumorphicSwitch({
  checked,
  onChange,
  id,
  disabled = false,
  'aria-label': ariaLabel,
  size = 'md',
  className,
}: NeumorphicSwitchProps) {
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <StyledWrapper
      className={className}
      $size={size}
      $checked={checked}
      data-testid="neumorphic-switch"
    >
      <div className="switch-container">
        <input
          className="toggle-checkbox"
          id={inputId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={ariaLabel}
        />
        <label className="switch" htmlFor={inputId}>
          <div className="toggle">
            <div className="led" />
          </div>
        </label>
      </div>
    </StyledWrapper>
  )
}

const sizeVars = {
  composer: {
    w: 44,
    h: 20,
    toggleW: 24,
    toggleH: 16,
    toggleOn: 22,
    pad: 3,
    led: 4,
    inset: 3,
    toggleTop: 2,
    toggleLeft: 2,
  },
  xs: {
    w: 72,
    h: 28,
    toggleW: 34,
    toggleH: 22,
    toggleOn: 38,
    pad: 5,
    led: 5,
    inset: 4,
    toggleTop: 3,
    toggleLeft: 3,
  },
  sm: {
    w: 100,
    h: 40,
    toggleW: 52,
    toggleH: 32,
    toggleOn: 44,
    pad: 7,
    led: 7,
    inset: 6,
    toggleTop: 4,
    toggleLeft: 4,
  },
  md: {
    w: 150,
    h: 60,
    toggleW: 80,
    toggleH: 50,
    toggleOn: 65,
    pad: 10,
    led: 10,
    inset: 8,
    toggleTop: 5,
    toggleLeft: 5,
  },
} as const

const switchMorph = css`
  transition:
    left ${motionMs('slow')} ${motion.easing.morph},
    top ${motionMs('slow')} ${motion.easing.morph},
    background ${motionMs('normal')} ${motion.easing.standard},
    box-shadow ${motionMs('normal')} ${motion.easing.standard};
`

const ledMorph = css`
  transition:
    background ${motionMs('normal')} ${motion.easing.standard},
    box-shadow ${motionMs('slow')} ${motion.easing.morph},
    transform ${motionMs('normal')} ${motion.easing.morph};
`

const StyledWrapper = styled.div<{ $size: 'composer' | 'xs' | 'sm' | 'md'; $checked: boolean }>`
  flex-shrink: 0;
  --sw-w: ${({ $size }) => sizeVars[$size].w}px;
  --sw-h: ${({ $size }) => sizeVars[$size].h}px;
  --toggle-w: ${({ $size }) => sizeVars[$size].toggleW}px;
  --toggle-h: ${({ $size }) => sizeVars[$size].toggleH}px;
  --toggle-left-on: ${({ $size }) => sizeVars[$size].toggleOn}px;
  --toggle-pad: ${({ $size }) => sizeVars[$size].pad}px;
  --led-size: ${({ $size }) => sizeVars[$size].led}px;
  --inset: ${({ $size }) => sizeVars[$size].inset}px;
  --toggle-top: ${({ $size }) => sizeVars[$size].toggleTop}px;
  --toggle-left: ${({ $size }) => sizeVars[$size].toggleLeft}px;

  .switch-container {
    position: relative;
    width: var(--sw-w);
    height: var(--sw-h);
    background: ${({ $checked }) => ($checked ? palette.bgInset : palette.bgHover)};
    border-radius: 50px;
    box-shadow:
      inset calc(-1 * var(--inset)) calc(-1 * var(--inset)) calc(var(--inset) * 2) ${palette.white},
      inset var(--inset) var(--inset) calc(var(--inset) * 2) #b0b0b0;
    transition:
      background ${motionMs('normal')} ${motion.easing.standard},
      box-shadow ${motionMs('normal')} ${motion.easing.standard};
  }

  .toggle-checkbox {
    display: none;
  }

  .switch {
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    height: 100%;
    transform: translateY(-50%);
    border-radius: 50px;
    overflow: hidden;
    cursor: pointer;
  }

  .toggle-checkbox:disabled + .switch {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .toggle {
    position: absolute;
    width: var(--toggle-w);
    height: var(--toggle-h);
    background: linear-gradient(145deg, #d9d9d9, ${palette.shadowSoft});
    border-radius: 50px;
    top: var(--toggle-top);
    left: var(--toggle-left);
    box-shadow:
      -3px -3px 6px ${palette.white},
      3px 3px 6px #b0b0b0;
    ${switchMorph}
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding-left: var(--toggle-pad);
  }

  .led {
    width: var(--led-size);
    height: var(--led-size);
    background: grey;
    border-radius: 50%;
    box-shadow: 0 0 10px 2px rgba(0, 0, 0, 0.2);
    ${ledMorph}
  }

  .toggle-checkbox:checked + .switch .toggle {
    left: var(--toggle-left-on);
    background: linear-gradient(145deg, #cfcfcf, #a9a9a9);
    box-shadow:
      -4px -4px 8px ${palette.white},
      4px 4px 8px #8a8a8a;
  }

  .toggle-checkbox:checked + .switch .led {
    background: ${palette.accent};
    box-shadow: 0 0 15px 4px ${palette.progressFill};
    transform: scale(1.08);
  }

  .switch:hover .toggle {
    box-shadow:
      -4px -4px 12px ${palette.white},
      4px 4px 12px #9b9b9b;
  }
`
