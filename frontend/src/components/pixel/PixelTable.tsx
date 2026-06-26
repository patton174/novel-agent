import { type ReactNode } from 'react'
import { ProTable, type ProColumn, type ProTableProps } from '@/components/pro/ProTable'

export type PixelColumn<T> = ProColumn<T>
export type PixelTableProps<T> = Omit<ProTableProps<T>, 'dense' | 'skin'> & {
  /** 紧凑模式：轻边框，适合嵌套面板 */
  compact?: boolean
}

/** 清爽多彩管理台表格 */
export function PixelTable<T>({
  compact = false,
  className,
  emptyText = '暂无数据',
  ...props
}: PixelTableProps<T>) {
  return (
    <ProTable
      {...props}
      skin="pixel"
      dense={compact}
      emptyText={emptyText}
      className={className}
    />
  )
}

export function pixelColumns<T>(columns: PixelColumn<T>[]): PixelColumn<T>[] {
  return columns
}

export type { ReactNode }
