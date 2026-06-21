import React, { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { fetchUserInfo } from '../api/userApi'
import { useUserStore, type UserRole } from '../stores/userStore'
import { login } from '../utils/authApi'
import { clearAuthSession } from '../security/sessionStore'
import { appToast } from '@/stores/appToastStore'
import { AuthShell } from '../components/auth/AuthShell'
import { AuthField } from '../components/auth/AuthField'
import { AuthLegalNotice } from '../components/auth/AuthLegalNotice'
import { AuthSubmitButton } from '../components/auth/AuthSubmitButton'
import { buildPostLoginHref } from '@/lib/authRedirect'
import { useFormDraft } from '@/hooks/useFormDraft'
import { useTranslation } from 'react-i18next'

const LoginPage: React.FC = () => {
  const { t, i18n } = useTranslation(['common', 'auth'])
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionHint = useMemo(() => {
    if (searchParams.get('reason') === 'session_expired') {
      return t('auth:login.sessionExpired')
    }
    return ''
  }, [searchParams, t])
  const [username, setUsername, clearUsernameDraft] = useFormDraft('login_username', '')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: { username?: string; password?: string } = {}
    if (!username.trim()) next.username = t('auth:login.usernameReq')
    if (!password.trim()) next.password = t('auth:login.passwordReq')
    if (Object.keys(next).length > 0) {
      setFieldErrors(next)
      return
    }
    setFieldErrors({})
    setSubmitting(true)
    clearAuthSession()
    try {
      const loginResult = await login(username.trim(), password)
      try {
        const profile = await fetchUserInfo()
        useUserStore.getState().setProfile(profile)
      } catch (profileErr) {
        if (loginResult.userId != null && loginResult.username) {
          useUserStore.getState().setProfile({
            userId: String(loginResult.userId),
            username: loginResult.username,
            email: '',
            role: (loginResult.role as UserRole) ?? 'user',
          })
          appToast.info(t('auth:login.profileSyncLater'))
        } else {
          appToast.error(
            profileErr instanceof Error
              ? t('auth:login.profileLoadFailWithErr', { msg: profileErr.message })
              : t('auth:login.profileLoadFail')
          )
          return
        }
      }
      clearUsernameDraft()
      appToast.success(t('auth:login.success'))
      const returnTo = searchParams.get('returnTo')
      navigate(
        buildPostLoginHref(returnTo, i18n.language, searchParams.get('theme') ?? undefined),
        { replace: true },
      )
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('auth:login.fail'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title={t('auth:login.title')}
      subtitle={t('auth:login.subtitle')}
      marketing={{
        headline: t('auth:login.marketingHeadline'),
        description: t('auth:login.marketingDesc'),
        footer: (
          <div className="flex flex-wrap gap-2 pt-1">
            {[t('auth:login.featureStream'), t('auth:login.featureMemory'), t('auth:login.featureTransparent')].map((text) => (
              <span
                key={text}
                className="border-2 border-white/40 bg-white/10 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wide text-white"
              >
                {text}
              </span>
            ))}
          </div>
        ),
      }}
      legal={<AuthLegalNotice variant="login" />}
      footer={
        <>
          {t('auth:login.noAccount')}{' '}
          <Link to="/register" className="font-bold text-primary hover:underline">
            {t('common:cta.registerFree')}
          </Link>
        </>
      }
    >
      {sessionHint ? (
        <p className="mb-4 border-2 border-foreground bg-neon px-3 py-2 font-mono text-xs font-bold text-ink">
          {sessionHint}
        </p>
      ) : null}
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          id="login-username"
          name="username"
          label={t('auth:login.usernameLabel')}
          autoComplete="username"
          placeholder={t('auth:login.usernamePlaceholder')}
          value={username}
          error={fieldErrors.username}
          onChange={(e) => {
            setUsername(e.target.value)
            setFieldErrors((prev) => ({ ...prev, username: undefined }))
          }}
        />

        <AuthField
          id="login-password"
          name="password"
          type="password"
          label={t('auth:login.passwordLabel')}
          autoComplete="current-password"
          placeholder={t('auth:login.passwordPlaceholder')}
          value={password}
          error={fieldErrors.password}
          onChange={(e) => {
            setPassword(e.target.value)
            setFieldErrors((prev) => ({ ...prev, password: undefined }))
          }}
          hint={
            <Link
              to="/forgot-password"
              className="inline-flex min-h-9 items-center py-1 text-xs text-primary hover:underline"
            >
              {t('auth:login.forgotPassword')}
            </Link>
          }
        />

        <AuthSubmitButton loading={submitting} loadingText={t('auth:login.submitting')} className="!mt-1">
          {t('auth:login.submit')}
        </AuthSubmitButton>
      </form>
    </AuthShell>
  )
}

export default LoginPage
