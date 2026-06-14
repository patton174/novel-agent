import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthField } from '@/components/auth/AuthField'
import { AuthLegalNotice } from '@/components/auth/AuthLegalNotice'
import { AuthSubmitButton } from '@/components/auth/AuthSubmitButton'
import { confirmPasswordReset } from '@/api/userApi'
import { appToast } from '@/stores/appToastStore'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const linkParams = useMemo(() => {
    const token = searchParams.get('token')?.trim()
    const sig = searchParams.get('sig')?.trim()
    const expRaw = searchParams.get('exp')?.trim()
    const exp = expRaw ? Number(expRaw) : NaN
    if (!token || !sig || !Number.isFinite(exp)) return null
    return { token, sig, exp }
  }, [searchParams])

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!linkParams) return
    const next: { password?: string; confirm?: string } = {}
    if (password.length < 6) next.password = '密码至少 6 位'
    if (password !== confirm) next.confirm = '两次密码不一致'
    if (Object.keys(next).length > 0) {
      setFieldErrors(next)
      return
    }
    setFieldErrors({})
    setSubmitting(true)
    try {
      await confirmPasswordReset(linkParams.token, linkParams.sig, linkParams.exp, password)
      appToast.success('密码已更新，请使用新密码登录')
      navigate('/login')
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '重置失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="设置新密码"
      subtitle="请输入新的登录密码"
      marketing={{
        headline: '完成密码重置',
        description: '设置新密码后，请使用新密码登录创作台。',
      }}
      legal={<AuthLegalNotice variant="login" />}
      footer={
        <>
          <Link to="/login" className="font-medium text-primary hover:underline">
            返回登录
          </Link>
        </>
      }
    >
      {!linkParams ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-4 text-sm text-destructive">
          重置链接无效或已过期，请
          <Link to="/forgot-password" className="mx-1 font-medium underline">
            重新申请
          </Link>
          。
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <AuthField
            id="reset-password"
            name="password"
            type="password"
            label="新密码"
            autoComplete="new-password"
            placeholder="至少 6 位"
            value={password}
            error={fieldErrors.password}
            onChange={(e) => {
              setPassword(e.target.value)
              setFieldErrors((prev) => ({ ...prev, password: undefined }))
            }}
          />
          <AuthField
            id="reset-confirm"
            name="confirmPassword"
            type="password"
            label="确认新密码"
            autoComplete="new-password"
            placeholder="再次输入"
            value={confirm}
            error={fieldErrors.confirm}
            onChange={(e) => {
              setConfirm(e.target.value)
              setFieldErrors((prev) => ({ ...prev, confirm: undefined }))
            }}
          />
          <AuthSubmitButton loading={submitting} loadingText="保存中…">
            更新密码
          </AuthSubmitButton>
        </form>
      )}
    </AuthShell>
  )
}
