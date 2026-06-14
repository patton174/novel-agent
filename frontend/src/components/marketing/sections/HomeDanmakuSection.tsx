import { useState } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DanmakuMarquee } from '@/components/marketing/danmaku/DanmakuMarquee'
import { useDanmakuFeed } from '@/components/marketing/danmaku/useDanmakuFeed'
import { appToast } from '@/stores/appToastStore'
import { isLoggedIn } from '@/utils/auth'
import { MKT_CTA_ON_DARK_SM, MKT_CTA_PRIMARY_INLINE } from '@/lib/marketingCta'

export function HomeDanmakuSection() {
  const { t } = useTranslation('marketing')
  const { pool, loading, error, totalFetched, reload, loadMore, submit } = useDanmakuFeed()
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const text = message.trim()
    if (text.length < 2) {
      appToast.info(t('home.danmaku.minLength'))
      return
    }
    setSubmitting(true)
    try {
      await submit(text)
      setMessage('')
      appToast.success(isLoggedIn() ? t('home.danmaku.sent') : t('home.danmaku.sentGuest'))
    } catch {
      appToast.error(t('home.danmaku.sendError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      id="voices"
      className="relative scroll-mt-16 overflow-hidden bg-marketing-dark pb-0 pt-20 md:pt-24 text-white"
    >
      <div className="mkt-starfield pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(99,102,241,0.35),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_80%_80%,rgba(139,92,246,0.15),transparent_50%)]" />

      <div className="relative mx-auto mb-8 flex max-w-4xl flex-col gap-2 px-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300/90">
            <Sparkles className="size-3.5" />
            {t('home.danmaku.eyebrow')}
          </p>
          <h2 className="bg-gradient-to-r from-white via-indigo-100 to-violet-200 bg-clip-text text-2xl font-bold tracking-tight text-transparent md:text-3xl">
            {t('home.danmaku.title')}
          </h2>
          <p className="mt-1 text-sm text-slate-400">{t('home.danmaku.subtitle')}</p>
        </div>
        {!loading && !error && totalFetched > 0 ? (
          <p className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs tabular-nums text-slate-400">
            {t('home.danmaku.synced', { count: totalFetched })}
          </p>
        ) : null}
      </div>

      <div className="relative mb-6 h-[200px] w-full max-md:h-[200px] md:h-[228px]">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-marketing-dark to-transparent sm:w-24 md:w-32" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-marketing-dark to-transparent sm:w-24 md:w-32" />

        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            {t('home.danmaku.loading')}
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <p className="text-sm text-slate-400">{t('home.danmaku.loadError')}</p>
            <button
              type="button"
              onClick={() => void reload()}
              className={`${MKT_CTA_ON_DARK_SM} text-indigo-200`}
            >
              {t('home.danmaku.retry')}
            </button>
          </div>
        ) : pool.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            {t('home.danmaku.empty')}
          </div>
        ) : (
          <DanmakuMarquee pool={pool} onPoolLow={() => void loadMore()} />
        )}
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="relative mx-auto max-w-2xl px-6 pb-14">
        <div className="flex gap-2 rounded-2xl border border-white/12 bg-white/[0.05] p-2 shadow-[0_0_40px_-8px_rgba(99,102,241,0.5)] ring-1 ring-indigo-500/20 backdrop-blur-md transition focus-within:border-indigo-400/40 focus-within:ring-indigo-400/35">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={120}
            placeholder={t('home.danmaku.placeholder')}
            className="min-w-0 flex-1 rounded-xl bg-transparent px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none"
          />
          <button
            type="submit"
            disabled={submitting}
            className={MKT_CTA_PRIMARY_INLINE}
          >
            <Send className="size-4" />
            {t('home.danmaku.send')}
          </button>
        </div>
      </form>

      <div
        aria-hidden
        className="pointer-events-none h-8 bg-gradient-to-b from-transparent to-indigo-950/80"
      />
    </section>
  )
}

