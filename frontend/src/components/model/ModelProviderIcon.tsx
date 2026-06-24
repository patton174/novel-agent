import { cn } from '@/lib/utils'
import {
  getIcon,
  getIconUrl,
  hasIcon,
  isUrlIcon,
} from '@/icons/cc-switch/icons'
import { getIconMetadata } from '@/icons/cc-switch/metadata'
import { providerInitial } from '@/utils/modelProviderVisual'

interface ModelProviderIconProps {
  provider?: string | null
  label?: string | null
  size?: 'sm' | 'md'
  className?: string
}

const PROVIDER_ICON_ALIASES: Record<string, string> = {
  anthropic: 'claude',
  moonshot: 'kimi',
  qwen: 'bailian',
  agnes: 'openai',
  custom: 'openai',
  rc: 'rc',
  micu: 'micu',
  bailing: 'bailian',
  aicodemirror: 'aicodemirror',
  sssaicode: 'sssaicode',
  therouter: 'openrouter',
  dmxapi: 'openrouter',
  crazyrouter: 'crazyrouter',
  ucloud: 'ucloud',
  eflowcode: 'eflowcode',
  longcat: 'longcat',
}

const SIZE_PX = { sm: 24, md: 32 } as const

function resolveIconKey(provider?: string | null): string {
  const key = (provider || '').trim().toLowerCase()
  if (!key) return ''
  if (hasIcon(key) || isUrlIcon(key)) return key
  return PROVIDER_ICON_ALIASES[key] ?? key
}

/** 提供商图标（对齐 cc-switch ProviderIcon） */
export function ModelProviderIcon({
  provider,
  label,
  size = 'md',
  className,
}: ModelProviderIconProps) {
  const iconKey = resolveIconKey(provider)
  const px = SIZE_PX[size]
  const meta = iconKey ? getIconMetadata(iconKey) : undefined
  const color =
    meta?.defaultColor && meta.defaultColor !== 'currentColor' ? meta.defaultColor : undefined

  if (iconKey && !isUrlIcon(iconKey) && hasIcon(iconKey)) {
    const svg = getIcon(iconKey)
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center border-2 border-foreground bg-background shadow-[2px_2px_0_0_var(--foreground)]',
          className,
        )}
        style={{ width: px, height: px, color }}
        aria-hidden
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    )
  }

  const iconUrl = iconKey && isUrlIcon(iconKey) ? getIconUrl(iconKey) : ''
  if (iconUrl) {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center overflow-hidden border-2 border-foreground bg-background shadow-[2px_2px_0_0_var(--foreground)]',
          className,
        )}
        style={{ width: px, height: px }}
        aria-hidden
      >
        <img src={iconUrl} alt="" className="size-full object-contain" loading="lazy" />
      </span>
    )
  }

  const initials = providerInitial(provider, label)
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center border-2 border-foreground bg-muted font-mono font-black uppercase text-foreground shadow-[2px_2px_0_0_var(--foreground)]',
        size === 'sm' ? 'text-[9px]' : 'text-[10px]',
        className,
      )}
      style={{ width: px, height: px }}
      aria-hidden
    >
      {initials}
    </span>
  )
}
