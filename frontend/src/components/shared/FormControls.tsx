import type { ComponentProps, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PixelNativeSelect } from '@/components/pixel/PixelSelect'
import { cn } from '@/lib/utils'
import {
  formButtonGhostClass,
  formButtonOutlineClass,
  formButtonPrimaryClass,
  formChipBaseClass,
  formChipIdleClass,
  formChipSelectedClass,
  formControlRowClass,
  formFieldStackClass,
  formInputClass,
  formLabelClass,
  formSelectClass,
} from './formControlTokens'

export {
  FORM_CONTROL_HEIGHT,
  formActionsClass,
  formButtonClass,
  formButtonGhostClass,
  formButtonOutlineClass,
  formButtonPrimaryClass,
  formChipBaseClass,
  formChipIdleClass,
  formChipSelectedClass,
  formControlRowClass,
  formFieldStackClass,
  formFocusClass,
  formInputClass,
  formLabelClass,
  formSelectClass,
  formSurfaceClass,
} from './formControlTokens'

/** 并排控件行：输入 + 按钮等同高对齐 */
export function FormControlRow({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn(formControlRowClass, className)}>{children}</div>
}

/** 标准文本输入 */
export function FormInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <Input className={cn(formInputClass, className)} {...props} />
}

/** 带搜索图标输入 */
export function FormSearchInput({
  className,
  inputClassName,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { inputClassName?: string }) {
  return (
    <div className={cn('relative min-w-0', className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/80"
        aria-hidden
      />
      <FormInput className={cn('pl-9', inputClassName)} {...props} />
    </div>
  )
}

/** 原生下拉 — 与输入同高同质感 */
export function FormSelect({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <PixelNativeSelect className={cn(formSelectClass, className)} {...props}>
      {children}
    </PixelNativeSelect>
  )
}

type FormButtonProps = Omit<ComponentProps<typeof Button>, 'size' | 'variant'>

export function FormButtonPrimary({ className, ...props }: FormButtonProps) {
  return (
    <Button type="button" variant="default" size="lg" className={cn(formButtonPrimaryClass, className)} {...props} />
  )
}

export function FormButtonOutline({ className, ...props }: FormButtonProps) {
  return (
    <Button type="button" variant="outline" size="lg" className={cn(formButtonOutlineClass, className)} {...props} />
  )
}

export function FormButtonGhost({ className, ...props }: FormButtonProps) {
  return (
    <Button type="button" variant="ghost" size="lg" className={cn(formButtonGhostClass, className)} {...props} />
  )
}

/** 表单字段：标签 + 控件 */
export function FormField({
  label,
  hint,
  children,
  className,
  htmlFor,
}: {
  label?: string
  hint?: string
  children: ReactNode
  className?: string
  htmlFor?: string
}) {
  return (
    <div className={cn(formFieldStackClass, className)}>
      {label ? (
        <label htmlFor={htmlFor} className={formLabelClass}>
          {label}
        </label>
      ) : null}
      {children}
      {hint ? <span className="text-xs leading-snug text-muted-foreground">{hint}</span> : null}
    </div>
  )
}

/** 多选 Chip */
export function FormChip({
  selected,
  children,
  className,
  ...props
}: ComponentProps<'button'> & { selected?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        formChipBaseClass,
        selected ? formChipSelectedClass : formChipIdleClass,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
