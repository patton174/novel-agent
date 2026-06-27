import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { motionInteractiveClass } from '@/lib/motionClasses'
import {
  MOTION_TAB_TRACK,
  motionTabButtonClass,
  motionTabIconClass,
} from '@/lib/uiMenuClasses'

export interface MotionTabItem<T extends string = string> {
  id: T
  label: ReactNode
  icon?: ReactNode
  disabled?: boolean
}

export interface MotionTabBarProps<T extends string = string> {
  items: MotionTabItem<T>[]
  activeId: T
  onChange: (id: T) => void
  'aria-label'?: string
}

export function MotionTabBar<T extends string = string>({
  items,
  activeId,
  onChange,
  'aria-label': ariaLabel,
}: MotionTabBarProps<T>) {
  const { t } = useTranslation('common')
  const resolvedAriaLabel = ariaLabel ?? t('a11y.tabBar')
  return (
    <div className={MOTION_TAB_TRACK} role="tablist" aria-label={resolvedAriaLabel}>
      {items.map((item) => {
        const active = item.id === activeId
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={item.disabled}
            className={`${motionTabButtonClass(active)} ${motionInteractiveClass()}`}
            onClick={() => onChange(item.id)}
          >
            {item.icon ? (
              <span className={`${motionTabIconClass(active)} ${motionInteractiveClass()}`}>
                {item.icon}
              </span>
            ) : null}
            <span className={motionInteractiveClass()}>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
