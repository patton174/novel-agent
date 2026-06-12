import { useCallback, useEffect, useMemo, useState } from 'react'
import { Send } from 'lucide-react'
import { fetchDanmakuList, postDanmaku, type SiteDanmaku } from '@/api/billingApi'
import { appToast } from '@/stores/appToastStore'
import { isLoggedIn } from '@/utils/auth'

const TRACK_COUNT = 3
const MIN_DURATION = 11
const MAX_DURATION = 17

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

function pickDelay(seed: number): number {
  return (seed * 1.7) % 6
}

export function HomeDanmakuSection() {
  const [items, setItems] = useState<SiteDanmaku[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const list = await fetchDanmakuList()
      setItems(list)
    } catch {
      setLoadError('弹幕加载失败，请刷新页面后重试')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const trackItems = useMemo((): DanmakuTrackItem[] => {
    if (items.length === 0) return []
    const expanded: DanmakuTrackItem[] = []
    const loops = Math.max(2, Math.ceil(24 / items.length))
    let seq = 0
    for (let loop = 0; loop < loops; loop += 1) {
      items.forEach((item, index) => {
        const track = (index + loop) % TRACK_COUNT
        expanded.push({
          ...item,
          track,
          duration: pickDuration(seq + item.id),
          delay: pickDelay(seq + index + loop * 3),
          key: `${item.id}-${loop}-${seq}`,
        })
        seq += 1
      })
    }
    return expanded
  }, [items])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const text = message.trim()
    if (text.length < 2) {
      appToast.info('弹幕至少 2 个字')
      return
    }
    setSubmitting(true)
    try {
      const created = await postDanmaku(text)
      setItems((prev) => [created, ...prev].slice(0, 120))
      setMessage('')
      setLoadError(null)
      appToast.success(isLoggedIn() ? '弹幕已发送' : '弹幕已发送，感谢分享')
    } catch {
      appToast.error('发送失败，请稍后再试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      id="voices"
      className="relative w-full scroll-mt-16 overflow-hidden bg-slate-950 pb-0 pt-20 text-white"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(79,70,229,0.18),transparent_55%)]" />

      <div className="relative mx-auto mb-10 max-w-3xl px-6 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300/90">
          创作者说
        </p>
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">真实使用感受，像弹幕一样飘过</h2>
        <p className="mt-3 text-sm text-slate-400">
          登录后显示你的账号；未登录则根据 IP 显示大致地区
        </p>
      </div>

      {/* 全宽弹幕带 + 两侧渐隐 */}
      <div className="relative mb-8 w-full" style={{ height: '220px' }}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[min(18vw,140px)] bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-[min(18vw,140px)] bg-gradient-to-l from-slate-950 via-slate-950/85 to-transparent"
        />

        <div className="relative h-full w-full overflow-hidden">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              加载创作者弹幕中…
            </div>
          ) : loadError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm text-slate-400">{loadError}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-indigo-200 transition hover:bg-white/10"
              >
                重新加载
              </button>
            </div>
          ) : trackItems.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              还没有弹幕，做第一个分享感受的人吧
            </div>
          ) : (
            Array.from({ length: TRACK_COUNT }).map((_, trackIndex) => (
              <div
                key={trackIndex}
                className="absolute inset-x-0 flex items-center"
                style={{ top: `${22 + trackIndex * 28}%` }}
              >
                {trackItems
                  .filter((item) => item.track === trackIndex)
                  .map((item) => (
                    <span
                      key={item.key}
                      className="danmaku-item absolute whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm backdrop-blur-sm"
                      style={{
                        animationDuration: `${item.duration}s`,
                        animationDelay: `${item.delay}s`,
                      }}
                    >
                      <span className="mr-2 font-medium text-indigo-200">
                        {formatDanmakuLabel(item)}
                      </span>
                      <span className="text-slate-200">{item.message}</span>
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
            placeholder="写下你的使用感受…"
            className="min-w-0 flex-1 rounded-xl border border-transparent bg-black/20 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-400/50"
          />
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
          >
            <Send className="size-4" />
            发送
          </button>
        </div>
      </form>

      {/* 与下方 CTA 的渐变衔接 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent via-slate-950/40 to-indigo-700/90"
      />

      <style>{`
        @keyframes danmaku-fly {
          0% {
            transform: translateX(calc(100vw + 20%));
            opacity: 0;
          }
          6% {
            opacity: 1;
          }
          88% {
            opacity: 0.92;
          }
          100% {
            transform: translateX(calc(-100vw - 120%));
            opacity: 0;
          }
        }
        .danmaku-item {
          animation-name: danmaku-fly;
          animation-timing-function: cubic-bezier(0.12, 0.82, 0.22, 1);
          animation-iteration-count: infinite;
          will-change: transform, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .danmaku-item {
            animation: none;
            position: static !important;
            display: inline-block;
            margin: 0.25rem;
          }
        }
      `}</style>
    </section>
  )
}
