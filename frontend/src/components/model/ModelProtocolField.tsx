import { MODEL_PIXEL_LABEL } from '@/lib/modelPixelClasses'
import { MODEL_PROTOCOL } from '@/config/modelProviderPresets'

interface ModelProtocolFieldProps {
  label: string
}

/** 协议字段：后端当前仅支持 Anthropic */
export function ModelProtocolField({ label }: ModelProtocolFieldProps) {
  return (
    <div className="grid gap-1.5">
      <span className={MODEL_PIXEL_LABEL}>{label}</span>
      <div className="border-2 border-foreground bg-muted/30 px-2 py-1.5 font-mono text-[0.82rem] uppercase text-foreground shadow-[1px_1px_0_0_var(--foreground)]">
        {MODEL_PROTOCOL}
      </div>
    </div>
  )
}

export function withAnthropicProtocol<T extends { protocol: string }>(form: T): T {
  return { ...form, protocol: MODEL_PROTOCOL }
}
