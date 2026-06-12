import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { fetchDanmakuPage, postDanmaku, type SiteDanmaku } from '@/api/billingApi'
import { appToast } from '@/stores/appToastStore'
import { isLoggedIn } from '@/utils/auth'

const TRACK_COUNT = 4
const PAGE_SIZE = 24
const MIN_DURATION = 14
const MAX_DURATION = 22

interface DanmakuTrackItem extends SiteDanmaku {
  track: number
  duration: number
  delay: number
  key: string
}

function formatDanmakuLabel(item: SiteDanmaku): string {
  const region = item.region ? ` · ${item.region}` : ''
  return `${item.authorName}${region}`
}

function pickDuration(seed: number): number {
  return MIN_DURATION + (seed % (MAX_DURATION - MIN_DURATION + 1))
}

function pickDelay(seed: number, track: number): number {
  return ((seed * 2.3 + track * 1.7) % 8) + track * 0.6
}

function mergeUnique(prev: SiteDanmaku[], incoming: SiteDanmaku[]): SiteDanmaku[] {
  const seen = new Set(prev.map((x) => x.id))
  const merged = [...prev]
  for (const item of incoming) {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      merged.push(item)
    }
  }
  return merged
}

export function HomeDanmakuSection() {
  const { t } = useTranslation('marketing')
  const [items, setItems] = useState<SiteDanmaku[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const nextBeforeIdRef = useRef<number | null>(null)
  const hasMoreRef = useRef(true)
  const loadingMoreRef = useRef(false)

  const loadPage = useCallback(async (append = false) => {
    if (append) {
      if (!hasMoreRef.current || loadingMoreRef.current) return
      loadingMoreRef.current = true
    } else {
      setLoading(true)
      setLoadError(null)
    }
    try {
      const page = await fetchDanmakuPage({
        pageSize: PAGE_SIZE,
        beforeId: append ? nextBeforeIdRef.current : null,
      })
      hasMoreRef.current = page.hasMore
      nextBeforeIdRef.current = page.nextBeforeId
      setItems((prev) => (append ? mergeUnique(prev, page.list) : page.list))
    } catch {
      if (!append) {
        setLoadError(t('home.danmaku.loadError'))
      }
    } finally {
      if (append) {
        loadingMoreRef.current = false
      } else {
        setLoading(false)
      }
    }
  }, [t])

  useEffect(() => {
    void loadPage(false)
  }, [loadPage])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadPage(true)
    }, 45_000)
    return () => window.clearInterval(timer)
  }, [loadPage])

  const trackItems = useMemo((): DanmakuTrackItem[] => {
    if (items.length === 0) return []
    const pool = items.length >= 8 ? items : [...items, ...items, ...items]
    const expanded: DanmakuTrackItem[] = []
    const target = Math.max(32, pool.length * 2)
    let seq = 0
    for (let i = 0; i < target; i += 1) {
      const item = pool[i % pool.length]
      const track = i % TRACK_COUNT
      expanded.push({
        ...item,
        track,
        duration: pickDuration(seq + item.id),
        delay: pickDelay(seq + item.id, track),
        key: `${item.id}-${seq}`,
      })
      seq += 1
    }
    return expanded
  }, [items])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const text = message.trim()
    if (text.length < 2) {
      appToast.info(t('home.danmaku.minLength'))
      return
    }
    setSubmitting(true)
    try {
      const created = await postDanmaku(text)
      setItems((prev) => [created, ...prev])
      setMessage('')
      setLoadError(null)
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
      className="relative w-full scroll-mt-16 overflow-hidden bg-slate-950 pb-0 pt-20 text-white"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(79,70,229,0.2),transparent_55%)]" />

      <div className="relative mx-auto mb-10 max-w-3xl px-6 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300/90">
          {t('home.danmaku.eyebrow')}
        </p>
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{t('home.danmaku.title')}</h2>
        <p className="mt-3 text-sm text-slate-400">{t('home.danmaku.subtitle')}</p>
      </div>

      <div className="relative mb-8 w-full" style={{ height: '240px' }}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[min(20vw,160px)] bg-gradient-to-r from-slate-950 via-slate-950/90 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-[min(20vw,160px)] bg-gradient-to-l from-slate-950 via-slate-950/90 to-transparent"
        />

        <div className="danmaku-stage relative h-full w-full overflow-hidden">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              {t('home.danmaku.loading')}
            </div>
          ) : loadError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm text-slate-400">{loadError}</p>
              <button
                type="button"
                onClick={() => void loadPage(false)}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-indigo-200 transition hover:bg-white/10"
              >
                {t('home.danmaku.retry')}
              </button>
            </div>
          ) : trackItems.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              {t('home.danmaku.empty')}
            </div>
          ) : (
            Array.from({ length: TRACK_COUNT }).map((_, trackIndex) => (
              <div
                key={trackIndex}
                className="danmaku-lane absolute inset-x-0"
                style={{ top: `${14 + trackIndex * 22}%`, height: '36px' }}
              >
                {trackItems
                  .filter((item) => item.track === trackIndex)
                  .map((item) => (
                    <span
                      key={item.key}
                      className="danmaku-item inline-flex max-w-none items-center whitespace-nowrap rounded-full border border-white/10 bg-white/[0.07] px-4 py-1.5 text-sm shadow-[0_4px_24px_rgba(0,0,0,0.25)] backdrop-blur-md"
                      style={{
                        animationDuration: `${item.duration}s`,
                        animationDelay: `${item.delay}s`,
                      }}
                    >
                      <span className="mr-2 font-medium text-indigo-200">
                        {formatDanmakuLabel(item)}
                      </span>
                      <span className="text-slate-100">{item.message}</span>
                    </span>
                  ))}
              </div>
            ))
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="relative mx-auto flex max-w-2xl gap-3 px-6 pb-16"
      >
        <div className="flex w-full gap-3 rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-md">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={120}
            placeholder={t('home.danmaku.placeholder')}
            className="min-w-0 flex-1 rounded-xl border border-transparent bg-black/20 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-400/50"
          />
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
          >
            <Send className="size-4" />
            {t('home.danmaku.send')}
          </button>
        </div>
      </form>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent via-slate-950/40 to-indigo-700/90"
      />

      <style>{`
        .danmaku-lane {
          overflow: visible;
        }
        .danmaku-item {
          position: absolute;
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          animation-name: danmaku-marquee;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform;
        }
        @keyframes danmaku-marquee {
          0% {
            transform: translateY(-50%) translateX(0);
            opacity: 0;
          }
          4% {
            opacity: 1;
          }
          92% {
            opacity: 0.95;
          }
          100% {
            transform: translateY(-50%) translateX(calc(-100vw - 120%));
            opacity: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .danmaku-item {
            position: static;
            display: inline-flex;
            margin: 0.25rem;
            animation: none;
            transform: none;
            opacity: 1;
          }
          .danmaku-lane {
            position: static;
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            height: auto !important;
            padding: 0 1rem;
          }
        }
      `}</style>
    </section>
  )
}
