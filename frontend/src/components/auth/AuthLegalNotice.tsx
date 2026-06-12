import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

type Variant = 'register' | 'login' | 'captcha'

const COPY: Record<Variant, { lead: string; showAi?: boolean }> = {
  register: {
    lead: '注册即表示您已阅读并同意',
  },
  login: {
    lead: '登录即表示您理解并同意',
  },
  captcha: {
    lead: '人机验证用于保护账号与邮件通道安全。',
    showAi: true,
  },
}

export function AuthLegalNotice({
  variant,
  className,
}: {
  variant: Variant
  className?: string
}) {
  const { lead, showAi } = COPY[variant]

  return (
    <div className={cn('space-y-2 text-xs leading-relaxed text-muted-foreground', className)}>
      <p>
        {lead}
        <Link to="/terms" className="mx-0.5 inline-flex min-h-9 items-center font-medium text-foreground/80 underline-offset-2 hover:text-primary hover:underline">
          《用户协议》
        </Link>
        与
        <Link to="/privacy" className="mx-0.5 inline-flex min-h-9 items-center font-medium text-foreground/80 underline-offset-2 hover:text-primary hover:underline">
          《隐私政策》
        </Link>
        。
      </p>
      {variant === 'register' ? (
        <p>我们会向您的邮箱发送一次性验证码；密码经加密存储，不会明文保存。</p>
      ) : null}
      {variant === 'login' ? (
        <p>会话凭证加密传输；异常登录可通过邮箱验证找回访问权限。</p>
      ) : null}
      {showAi ? (
        <p className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-2 text-xs leading-snug">
          <span className="font-medium text-foreground/70">关于验证图：</span>
          拼图背景由服务端程序实时生成，仅用于防机器人，非用户上传内容，不会用于模型训练或公开展示。
        </p>
      ) : null}
    </div>
  )
}
