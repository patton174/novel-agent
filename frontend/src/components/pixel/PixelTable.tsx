import { type ReactNode } from 'react'
import { ProTable, type ProColumn, type ProTableProps } from '@/components/pro/ProTable'

export type PixelColumn<T> = ProColumn<T>
export type PixelTableProps<T> = Omit<ProTableProps<T>, 'dense' | 'skin'> & {
  /** 紧凑模式：轻边框，适合嵌套面板 */
  compact?: boolean
  /** 嵌入面板：去掉表格外边框 */
  embedded?: boolean
}

/** 清爽多彩管理台表格 — emptyText 默认走 common:table.empty，可传入自定义文案 */
export function PixelTable<T>({
  compact = false,
  embedded = false,
  className,
  emptyText,
  ...props
}: PixelTableProps<T>) {
  return (
    <ProTable
      {...props}
      skin="pixel"
      dense={compact}
      embedded={embedded}
      emptyText={emptyText}
      className={className}
    />
  )
}

export function pixelColumns<T>(columns: PixelColumn<T>[]): PixelColumn<T>[] {
  return columns
}

export type { ReactNode }
