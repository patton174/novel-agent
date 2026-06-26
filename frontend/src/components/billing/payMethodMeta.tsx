import { CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'

function AlipayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-8 shrink-0', className)} aria-hidden>
      <rect width="24" height="24" rx="6" fill="#1677FF" />
      <path
        fill="#fff"
        d="M7.2 8.6h1.5v6.8H7.2V8.6Zm4.1 0c2.4 0 3.8 1.2 3.8 3.1 0 1.6-1 2.7-2.8 3l3.1 3.7h-1.8l-2.8-3.4h-1v3.4H9.9V8.6h1.4Zm-.1 1.3h-.9v2.5h.9c1.2 0 1.9-.5 1.9-1.3 0-.7-.6-1.2-1.9-1.2Zm6.4 5.5c-.8.6-1.9 1-3.1 1-2.6 0-4.7-2-4.7-4.5S12 7.4 14.6 7.4c2.5 0 4.3 1.8 4.3 4.2 0 .4 0 .8-.1 1.1h-6.2c.2 1.1 1.1 1.8 2.3 1.8.9 0 1.6-.3 2.1-.8l.8 1.1Z"
      />
    </svg>
  )
}

function WechatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-8 shrink-0', className)} aria-hidden>
      <rect width="24" height="24" rx="6" fill="#07C160" />
      <path
        fill="#fff"
        d="M9.2 7.5C6.4 7.5 4.2 9.3 4.2 11.5c0 1.2.6 2.2 1.6 3l-.4 1.4 1.6-.8c.5.1 1 .2 1.5.2.2 0 .4 0 .6-.1-.1-.3-.1-.6-.1-.9 0-2.2 2.2-4 5-4 .3 0 .6 0 .9.1C14.2 8.6 11.9 7.5 9.2 7.5Zm-2.1 2.1c.4 0 .7.3.7.7s-.3.7-.7.7-.7-.3-.7-.7.3-.7.7-.7Zm4.2 0c.4 0 .7.3.7.7s-.3.7-.7.7-.7-.3-.7-.7.3-.7.7-.7ZM16.8 10c-2.4 0-4.3 1.6-4.3 3.6 0 2 1.9 3.6 4.3 3.6.5 0 1-.1 1.4-.2l1.3.7-.3-1.1c.8-.7 1.3-1.6 1.3-2.6 0-2-1.9-3.6-4.3-3.6Zm-2.5 2.2c.3 0 .6.3.6.6s-.3.6-.6.6-.6-.3-.6-.6.3-.6.6-.6Zm2.5 0c.3 0 .6.3.6.6s-.3.6-.6.6-.6-.3-.6-.6.3-.6.6-.6Z"
      />
    </svg>
  )
}

export function PayMethodIcon({ method, className }: { method: string; className?: string }) {
  const key = method.toLowerCase()
  if (key.includes('alipay')) {
    return <AlipayIcon className={className} />
  }
  if (key.includes('wx') || key.includes('wechat')) {
    return <WechatIcon className={className} />
  }
  return <CreditCard className={cn('size-8 shrink-0 text-muted-foreground', className)} />
}

export function resolvePayMethodLabel(
  method: string,
  fallback: string,
  t: (key: string) => string,
): string {
  const key = method.toLowerCase()
  if (key.includes('alipay')) {
    return t('dashboard:billing.payMethods.alipay')
  }
  if (key.includes('wx') || key.includes('wechat')) {
    return t('dashboard:billing.payMethods.wechat')
  }
  return fallback?.trim() || method
}

export function resolvePayOrderStatusLabel(status: string, t: (key: string) => string): string {
  const key = status.trim().toUpperCase()
  const mapped = t(`dashboard:billing.payStatus.${key}`)
  if (mapped !== `dashboard:billing.payStatus.${key}`) {
    return mapped
  }
  return status
}
