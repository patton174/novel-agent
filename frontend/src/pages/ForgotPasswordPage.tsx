import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthField } from '@/components/auth/AuthField'
import { AuthLegalNotice } from '@/components/auth/AuthLegalNotice'
import { AuthSubmitButton } from '@/components/auth/AuthSubmitButton'
import { requestPasswordReset } from '@/api/userApi'
import { appToast } from '@/stores/appToastStore'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setFieldError('请输入有效邮箱')
      return
    }
    setFieldError(undefined)
    setSubmitting(true)
    try {
      await requestPasswordReset(trimmed)
      setSent(true)
      appToast.success('若该邮箱已注册，您将收到重置密码邮件')
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '发送失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="找回密码"
      subtitle="通过注册邮箱接收重置链接"
      marketing={{
        headline: '安全重置账户密码',
        description: '我们将向您的注册邮箱发送一次性重置链接，链接有效期为 1 小时。',
      }}
      legal={<AuthLegalNotice variant="login" />}
      footer={
        <>
          想起密码了？{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            返回登录
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-4 text-sm leading-relaxed text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
          如果 <span className="font-medium">{email.trim()}</span>{' '}
          已注册，请查收邮件（含垃圾箱）并点击链接设置新密码。
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <AuthField
            id="forgot-email"
            name="email"
            type="email"
            label="注册邮箱"
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            error={fieldError}
            onChange={(e) => {
              setEmail(e.target.value)
              setFieldError(undefined)
            }}
          />
          <AuthSubmitButton loading={submitting} loadingText="发送中…">
            发送重置链接
          </AuthSubmitButton>
        </form>
      )}
    </AuthShell>
  )
}
