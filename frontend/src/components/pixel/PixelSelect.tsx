import type { ReactNode, SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { ProSelect, type ProSelectOption, type ProSelectProps } from '@/components/pro/ProSelect'
import { cn } from '@/lib/utils'
import { PIXEL_SELECT_NATIVE } from './pixelTokens'

export type { ProSelectOption as PixelSelectOption }

/** 像素风菜单下拉（Radix） */
export function PixelMenuSelect(props: Omit<ProSelectProps, 'variant'>) {
  return <ProSelect {...props} variant="pixel" />
}

/** 像素风原生 `<select>` */
export function PixelNativeSelect({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(PIXEL_SELECT_NATIVE, className)} {...props}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  )
}

export type PixelSelectProps =
  | ({ mode?: 'menu' } & Omit<ProSelectProps, 'variant'>)
  | ({ mode: 'native' } & SelectHTMLAttributes<HTMLSelectElement> & { options?: never })

/**
 * 统一入口：`mode="menu"`（默认）或 `mode="native"`。
 * menu 模式传 ProSelect 参数；native 模式传 select 属性 + children/options。
 */
export function PixelSelect(props: PixelSelectProps) {
  if (props.mode === 'native') {
    const { mode: _mode, ...rest } = props as SelectHTMLAttributes<HTMLSelectElement> & { mode: 'native' }
    return <PixelNativeSelect {...rest} />
  }
  const { mode: _mode, ...rest } = props as Omit<ProSelectProps, 'variant'> & { mode?: 'menu' }
  return <PixelMenuSelect {...rest} />
}

export function pixelSelectOptions(items: Array<{ value: string; label: ReactNode }>): ProSelectOption[] {
  return items
}
