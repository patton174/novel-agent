import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { ArrowIcon } from '../icons'
import { NovelAiPixelWordmark } from '../pixel/NovelAiPixelWordmark'
import { PixelField } from '../pixel/PixelField'
import { MKT_CTA_FOOTER_PRIMARY, MKT_CTA_FOOTER_SECONDARY } from '@/lib/marketingCta'
import { useAppMobile } from '@/hooks/useMediaQuery'

type FooterVariant = 'full' | 'linksOnly'

/**
 * 转化带：「准备好开始你的下一章了吗？」+ 注册/登录。
 * 放在弹幕区上方，避免与底部暗墙割裂。light 面。
 */
export function HomeCtaBand() {
  const { t } = useTranslation(['marketing', 'common'])
  return (
    <section className="border-t-2 border-foreground bg-background px-6 py-20 text-center md:py-24">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
        <h2 className="text-2xl font-black uppercase leading-[0.95] tracking-tighter text-foreground md:text-4xl">
          {t('footer.ctaTitle')}
        </h2>
        <p className="max-w-xl font-mono text-sm leading-relaxed text-muted-foreground md:text-base">
          {t('footer.ctaDesc')}
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/register" className={MKT_CTA_FOOTER_PRIMARY}>
            {t('common:cta.registerFree')}
            <ArrowIcon />
          </Link>
          <Link to="/login" className={MKT_CTA_FOOTER_SECONDARY}>
            {t('common:cta.login')}
          </Link>
        </div>
      </div>
    </section>
  )
}

export function HomeFooterSection({ variant = 'full' }: { variant?: FooterVariant }) {
  const { t } = useTranslation(['marketing', 'common'])
  const year = new Date().getFullYear()

  const productLinks = [
    { label: t('nav.guide'), to: '/guide' },
    { label: t('nav.pricing'), to: '/pricing' },
    { label: t('nav.about'), to: '/about' },
  ] as const

  const accountLinks = [
    { label: t('footer.dashboard'), to: '/dashboard' },
  ] as const

  const legalLinks = [
    { label: t('footer.privacy'), to: '/privacy' },
    { label: t('footer.terms'), to: '/terms' },
    { label: t('footer.contact'), to: '/contact' },
  ] as const

  if (variant === 'full') {
    return <PinnedPixelFooter year={year} t={t} productLinks={productLinks} accountLinks={accountLinks} legalLinks={legalLinks} />
  }
  return (
    <footer className="relative z-10 w-full">
      <div className="border-t-2 border-foreground bg-background px-6 py-14">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3 lg:col-span-1">
            <Link to="/" className="inline-block">
              <NovelAiPixelWordmark size="md" cursor={false} className="text-foreground" accent="#1043ff" />
            </Link>
            <p className="max-w-xs font-mono text-sm leading-relaxed text-muted-foreground">{t('footer.tagline')}</p>
          </div>

          <FooterLinkGroup title={t('footer.product')} links={productLinks} />
          <FooterLinkGroup title={t('footer.account')} links={accountLinks} />
          <FooterLinkGroup title={t('footer.legal')} links={legalLinks} />
        </div>

        <div className="mx-auto mt-10 flex max-w-6xl flex-col items-center justify-between gap-3 border-t-2 border-foreground/15 pt-6 font-mono text-xs text-muted-foreground sm:flex-row">
          <p>
            © {year} {t('brand')} · {t('footer.copyright')}
          </p>
          <p>{t('footer.slogan')}</p>
        </div>
      </div>
    </footer>
  )
}

/**
 * 钉住式 footer：状态机驱动的「页面钉住 + footer 升起」交互。
 *
 * 状态机：
 *   DISABLED（初始）             → footer 隐藏，页面正常滚动
 *     ↓ 像素区完全在视口 + 滚动停止 200ms
 *   ARMED（一次性）              → 页面钉住，footer 平滑升起覆盖像素区
 *     ↓ wheel 事件驱动 footer progress（页面继续钉住）
 *     ↓ footer 完全消失（progress=0）→ 释放页面
 *     ↓ 释放后滚动停止 200ms
 *   DISABLED                     → 恢复初始禁用态，可再次触发
 */
function PinnedPixelFooter({
  year,
  t,
  productLinks,
  accountLinks,
  legalLinks,
}: {
  year: number
  t: TFunction
  productLinks: readonly { label: string; to: string }[]
  accountLinks: readonly { label: string; to: string }[]
  legalLinks: readonly { label: string; to: string }[]
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [overlayH, setOverlayH] = useState(0)
  const [armed, setArmed] = useState(false)
  const isMobile = useAppMobile()

  // 闭包安全的瞬态状态（事件处理器读取最新值）
  const armedRef = useRef(false)
  const releasedRef = useRef(false)
  const progressRef = useRef(0)
  // 像素区上一次可见性快照：用于 gating 仅在「不可见→可见」翻转时触发
  // （避免「滚到底 → 停下 → 自动重 armed」的伪触发）
  const lastVisibilityRef = useRef(false)

  // 测量 footer 内容高度（=像素场高度=钉住区高度）
  useEffect(() => {
    const el = overlayRef.current
    if (!el) return
    const measure = () => setOverlayH(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 同步 armed state → ref；DISABLED 时清零所有 transient state
  useEffect(() => {
    armedRef.current = armed
    if (!armed) {
      releasedRef.current = false
      progressRef.current = 0
    }
  }, [armed])

  // 持续追踪像素区可见性（不依赖 armed 状态，用于 gating 的边沿检测）
  useEffect(() => {
    let raf = 0
    const update = () => {
      const root = rootRef.current
      if (!root) return
      const rect = root.getBoundingClientRect()
      const vh = window.innerHeight
      const fullyVisible = rect.bottom <= vh + 1 && rect.top >= -1
      lastVisibilityRef.current = fullyVisible
    }
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [overlayH])

  // ARMED 触发器：像素区「不可见 → 完全可见」的边沿 + 滚动停止 200ms → ARMED = true
  // ARMED 仅是「可以出现」状态；footer 此时仍隐藏，需用户主动往下滚才升起
  useEffect(() => {
    if (armed) return
    let stopTimer: number | null = null
    const check = () => {
      const root = rootRef.current
      if (!root) return
      const rect = root.getBoundingClientRect()
      const vh = window.innerHeight
      const fullyVisible = rect.bottom <= vh + 1 && rect.top >= -1
      if (fullyVisible && !lastVisibilityRef.current) {
        // 边沿翻转：不可见 → 可见。等滚动停止 200ms 再触发。
        if (stopTimer != null) window.clearTimeout(stopTimer)
        stopTimer = window.setTimeout(() => {
          progressRef.current = 0 // 初始隐藏，等待用户主动滚
          releasedRef.current = false
          lastVisibilityRef.current = true
          setArmed(true)
        }, 200)
      } else {
        if (stopTimer != null) window.clearTimeout(stopTimer)
        stopTimer = null
      }
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
      if (stopTimer != null) window.clearTimeout(stopTimer)
    }
  }, [armed, overlayH])

  // ARMED 进入：仅设置 wheel 驱动用的短过渡，不自动升起 footer
  useEffect(() => {
    if (!armed) return
    const overlay = overlayRef.current
    if (!overlay) return
    // 200ms 短过渡，让 wheel 驱动的 progress 变化跟手且平滑
    overlay.style.transition = 'transform 200ms ease-out'
  }, [armed])

  // ARMED 退出：footer 平滑收回
  useEffect(() => {
    if (armed) return
    const overlay = overlayRef.current
    if (!overlay) return
    overlay.style.transition = 'transform 400ms ease-in'
    overlay.style.transform = 'translateY(100%)'
    const t = window.setTimeout(() => {
      overlay.style.transition = ''
    }, 450)
    return () => window.clearTimeout(t)
  }, [armed])

  // ARMED 期间：wheel 事件给 progressVel 推力（impulse），rAF 积分推进 progress。
  // 加重阻尼感：每次 wheel 仅加小冲量，progressVel 按 0.86/帧衰减 → 起步跟手、停手有惯性、不会一闪而过。
  // 退出条件：释放后滚动到弹幕区完全出视口 → 重置为 DISABLED。
  useEffect(() => {
    if (!armed) return

    // 速度模型参数
    const FORCE_PER_PIXEL = 0.00018 // wheel deltaY → 冲量（系数越大越跟手）
    // 移动端：取消阻尼 (1.0 = 跟手) —— 手指停 progress 立即停
    // 桌面端：阻尼 0.86/帧 → 起步跟手、停手有惯性
    const VEL_DAMP_PER_FRAME = isMobile ? 1.0 : 0.86
    // 移动端：VEL_MIN=0 → 永不归零（cancel 触底 clamp 0 兜底，避免 onTouchEnd 后还在动）
    const VEL_MIN = isMobile ? 0 : 0.0005

    let velRefLocal = 0 // 与 progressRef 平行；用 wheel 注入冲量

    // 边界冷却：
    //   - 像素区触底（ARMED 触发）：arm 后 800ms 内不响应 → 等用户「停下」
    //   - footer 完全覆盖（progress=1）：锁定 dy>0 → 等用户先往上收回再触发
    //   - footer 完全收起（progress=0 / released）：600ms 内不响应 → 「收起」停顿感
    let armedAt = 0
    let releasedAt = 0
    let wasReleased = false
    const ARM_COOLDOWN_MS = 800
    const RELEASE_COOLDOWN_MS = 600

    let raf = 0
    let running = false

    const integrate = () => {
      const cur = progressRef.current
      let next = cur + velRefLocal
      let nextVel = velRefLocal * VEL_DAMP_PER_FRAME

      // 边界 clamp + 速度反弹清零（避免来回振荡）
      if (next <= 0) { next = 0; if (nextVel < 0) nextVel = 0 }
      if (next >= 1) { next = 1; if (nextVel > 0) nextVel = 0 }

      progressRef.current = next
      const nowReleased = next <= 0.001
      // 检测刚进入 released：记录时间戳用于下边界冷却
      if (nowReleased && !wasReleased) {
        releasedAt = performance.now()
      }
      wasReleased = nowReleased
      releasedRef.current = nowReleased
      velRefLocal = nextVel

      const overlay = overlayRef.current
      if (overlay) overlay.style.transform = `translateY(${(1 - next) * 100}%)`

      // 仍在运动中或未到边界 → 继续积分
      const stillMoving = Math.abs(nextVel) >= VEL_MIN || (next > 0.001 && next < 0.999)
      if (stillMoving) {
        raf = requestAnimationFrame(integrate)
      } else {
        running = false
      }
    }

    const ensureRunning = () => {
      if (running) return
      running = true
      raf = requestAnimationFrame(integrate)
    }

    const applyImpulse = (dy: number) => {
      velRefLocal += dy * FORCE_PER_PIXEL
      ensureRunning()
    }

    const onWheel = (e: WheelEvent) => {
      if (!armedRef.current) return

      // 像素区触底冷却：ARMED 触发后短时间内不响应 → 避免页面刚滚到底就立刻推动 footer
      if (performance.now() - armedAt < ARM_COOLDOWN_MS) return

      // footer 收起冷却：完全收起后短暂停顿再接受 wheel → 「收起」停顿感
      if (releasedRef.current && performance.now() - releasedAt < RELEASE_COOLDOWN_MS) return

      // footer 触底锁定：完全覆盖后忽略 dy>0 → 等用户先往上收回再触发
      if (progressRef.current >= 1 && e.deltaY > 0) return

      if (releasedRef.current) {
        // footer 完全消失（页面已释放）：wheel 让页面滚；
        // 往下（dy>0）则同步给冲量，重新升起 footer（progress > 0 自动切回 active，页面钉住）
        if (e.deltaY > 0) applyImpulse(e.deltaY)
        return
      }

      // active：阻止页面滚动，dy 全部转为冲量（不再立即更新 progress）
      e.preventDefault()
      applyImpulse(e.deltaY)
    }

    // 移动端 touch handler：把手指滑动距离 deltaY 转成冲量
    // 复用 onWheel 同样的边界 / 冷却逻辑
    let touchLastY: number | null = null
    const onTouchStart = (e: TouchEvent) => {
      if (!armedRef.current) return
      const t = e.touches[0]
      if (t) touchLastY = t.clientY
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!armedRef.current) return
      if (touchLastY == null) return

      // 像素区触底冷却 / 收起冷却
      const now = performance.now()
      if (now - armedAt < ARM_COOLDOWN_MS) return
      if (releasedRef.current && now - releasedAt < RELEASE_COOLDOWN_MS) return

      const t = e.touches[0]
      if (!t) return
      const deltaY = touchLastY - t.clientY // 向上滑 = dy>0（与 wheel 一致：dy>0 = 触发 footer）
      touchLastY = t.clientY

      // 触底锁定
      if (progressRef.current >= 1 && deltaY > 0) return

      if (releasedRef.current) {
        if (deltaY > 0) applyImpulse(deltaY)
        return
      }

      // active：阻止页面滚动，dy 全部转为冲量
      e.preventDefault()
      applyImpulse(deltaY)
    }
    const onTouchEnd = () => {
      touchLastY = null
    }

    const checkDanmakuOutOfView = () => {
      if (!releasedRef.current) return
      const danmaku = document.querySelector<HTMLElement>('[data-danmaku-section]')
      if (!danmaku) return
      const rect = danmaku.getBoundingClientRect()
      const vh = window.innerHeight
      if (rect.bottom < 0 || rect.top > vh) {
        armedRef.current = false
        setArmed(false)
      }
    }

    // 平台分流：桌面用 wheel（鼠标滚轮），移动端用 touch（手指滑动）
    // 桌面端不监听 touch（避免与滚动手势冲突），移动端不监听 wheel
    if (isMobile) {
      document.addEventListener('touchstart', onTouchStart, { passive: true })
      document.addEventListener('touchmove', onTouchMove, { passive: false })
      document.addEventListener('touchend', onTouchEnd, { passive: true })
      document.addEventListener('touchcancel', onTouchEnd, { passive: true })
    } else {
      document.addEventListener('wheel', onWheel, { passive: false })
    }
    window.addEventListener('scroll', checkDanmakuOutOfView, { passive: true })
    window.addEventListener('resize', checkDanmakuOutOfView)

    // ARMED 触发时记录时间戳 → 用于 wheel 冷却判定
    armedAt = performance.now()
    return () => {
      if (isMobile) {
        document.removeEventListener('touchstart', onTouchStart)
        document.removeEventListener('touchmove', onTouchMove)
        document.removeEventListener('touchend', onTouchEnd)
        document.removeEventListener('touchcancel', onTouchEnd)
      } else {
        document.removeEventListener('wheel', onWheel)
      }
      window.removeEventListener('scroll', checkDanmakuOutOfView)
      window.removeEventListener('resize', checkDanmakuOutOfView)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [armed])

  return (
    <footer ref={rootRef} className="relative w-full" style={{ height: `${overlayH}px` }}>
      <div
        className="sticky bottom-0 overflow-hidden bg-ink"
        style={{ height: `${overlayH}px` }}
      >
        <div className="pixel-grid-bg-faint absolute inset-0 opacity-40" />
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <div className="relative w-full text-neon">
            <PixelField
              text="NOVEL AGENT"
              cell={24}
              stretchY={2}
              glyphGap={0}
              wordGap={24}
              targetDot={10}
              className="text-neon"
              attractRadius={220}
              attractStrength={0.9}
              ariaLabel="Novel Agent"
            />
            {/* CRT 扫描线：每 3px 一道暗线，模拟老式显像管扫描纹理 */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_2px,rgba(0,0,0,0.18)_2px,rgba(0,0,0,0.18)_3px)] mix-blend-multiply"
            />
          </div>
        </div>

        {/* Footer 覆盖层：始终 95% 不透明 + 轻磨砂 + 重边/阴影，文字锐利可读；
            无 hover 透出动画（保持稳定的「聚焦」状态） */}
        <div
          ref={overlayRef}
          className="absolute bottom-0 left-0 right-0 border-t-4 border-foreground/80
                     bg-background/95 shadow-[0_-8px_24px_rgba(0,0,0,0.18)]
                     backdrop-blur-sm
                     will-change-transform"
          style={{ transform: 'translateY(100%)' }}
        >
          <div className="px-5 py-4 md:px-6 md:py-10">
            <div className="mx-auto grid max-w-6xl gap-x-6 gap-y-3 md:grid-cols-2 md:gap-y-0 md:gap-x-10 lg:grid-cols-4">
              <div className="space-y-2 lg:col-span-1">
                <Link to="/" className="inline-block">
                  <NovelAiPixelWordmark size="sm" className="text-foreground md:inline-flex" accent="#1043ff" />
                </Link>
                {/* tagline 仅桌面端显示，移动端隐藏以省高度 */}
                <p className="hidden max-w-xs font-mono text-sm leading-relaxed text-muted-foreground md:block">{t('footer.tagline')}</p>
              </div>

              <FooterLinkGroup title={t('footer.product')} links={productLinks} />
              <FooterLinkGroup title={t('footer.account')} links={accountLinks} />
              <FooterLinkGroup title={t('footer.legal')} links={legalLinks} />
            </div>

            <div className="mx-auto mt-3 flex max-w-6xl flex-col items-center justify-between gap-2 border-t border-foreground/15 pt-2 font-mono text-[10px] text-muted-foreground sm:mt-6 sm:flex-row sm:pt-4 sm:text-xs">
              <p>
                © {year} {t('brand')} · {t('footer.copyright')}
              </p>
              <p>{t('footer.slogan')}</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterLinkGroup({
  title,
  links,
}: {
  title: string
  links: readonly { label: string; to: string }[]
}) {
  return (
    <div>
      <h3 className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-primary md:mb-2 md:text-xs">{title}</h3>
      <ul className="space-y-1 md:space-y-1.5">
        {links.map((link) => (
          <li key={link.to}>
            <Link to={link.to} className="font-mono text-xs font-medium text-muted-foreground transition-colors hover:bg-neon hover:text-ink md:text-sm">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
