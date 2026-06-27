import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ImagePlus, PenLine, RotateCcw, Sparkles, BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DashboardNovel } from '@/api/dashboardApi'
import { CoverImageGeneratingOverlay } from '@/components/dashboard/CoverImageGeneratingOverlay'
import { StoredMediaPreview } from '@/components/media/StoredMediaPreview'
import { Button } from '@/components/ui/button'
import { APP_BTN_MD } from '@/lib/appButtonTokens'
import { cn } from '@/lib/utils'
import { editorNovelHref } from '@/lib/editorRoutes'
import { formatNovelDate } from '@/pages/dashboard/novels/useNovelsPage'

export interface NovelWorkCardProps {
  novel: DashboardNovel
  isGenerating?: boolean
  onGenerateCover: () => void
  className?: string
}

/** 作品库封面卡 — 正面仅封面，悬停/聚焦横向翻转展示信息与操作。 */
export function NovelWorkCard({
  novel,
  isGenerating = false,
  onGenerateCover,
  className,
}: NovelWorkCardProps) {
  const { t } = useTranslation(['dashboard'])
  const [flipped, setFlipped] = useState(false)
  const [isTouch, setIsTouch] = useState(false)
  const hasCover = Boolean(novel.hasCover || novel.coverStorageKey || novel.coverUrl)

  useEffect(() => {
    setIsTouch(window.matchMedia('(hover: none)').matches)
  }, [])

  const toggleFlip = useCallback(() => {
    if (!isGenerating) {
      setFlipped((v) => !v)
    }
  }, [isGenerating])

  return (
    <article
      tabIndex={0}
      className={cn(
        'group relative outline-none [perspective:1200px]',
        className,
      )}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setFlipped(false)
        }
      }}
    >
      <div
        className={cn(
          'relative aspect-[3/4] w-full border-2 border-black bg-white shadow-soft transition-transform duration-700 [transform-style:preserve-3d] ease-[cubic-bezier(0.4,0,0.2,1)]',
          flipped && '[transform:rotateY(180deg)]',
          !isGenerating && 'md:group-hover:[transform:rotateY(180deg)] md:group-focus-within:[transform:rotateY(180deg)]',
        )}
      >
        {/* 正面：仅封面 */}
        <div
          className="absolute inset-0 overflow-hidden [backface-visibility:hidden]"
          onClick={() => {
            if (isTouch) {
              toggleFlip()
            }
          }}
        >
          <StoredMediaPreview
            storageKey={novel.coverStorageKey}
            fallbackUrl={novel.coverUrl}
            refreshToken={novel.updatedAt}
            alt={t('dashboard:novels.coverAlt', { title: novel.title })}
            animateReveal={!isGenerating}
            placeholder={
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-violet-500/10">
                <BookOpen className="size-10 text-primary/35" />
              </div>
            }
          />
          {isGenerating ? <CoverImageGeneratingOverlay active /> : null}
          {!isGenerating ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-2 pb-2 pt-8 opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:opacity-0">
              <p className="text-center text-[10px] font-medium text-white/90">
                {t('dashboard:novels.flipHint')}
              </p>
            </div>
          ) : null}
          {!isGenerating && isTouch ? (
            <button
              type="button"
              className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full border border-white/40 bg-black/35 text-white backdrop-blur-sm md:hidden"
              onClick={(e) => {
                e.stopPropagation()
                toggleFlip()
              }}
              aria-label={t('dashboard:novels.tapFlipHint')}
            >
              <RotateCcw className="size-3.5" />
            </button>
          ) : null}
        </div>

        {/* 背面：信息与操作 */}
        <div className="absolute inset-0 flex flex-col [transform:rotateY(180deg)] [backface-visibility:hidden] border-2 border-black bg-white p-3">
          <div className="min-h-0 flex-1 space-y-2">
            <h3 className="line-clamp-3 text-sm font-bold leading-snug text-foreground" title={novel.title}>
              {novel.title}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
              {novel.genre ? (
                <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground/70">
                  {novel.genre}
                </span>
              ) : null}
              <span className="tabular-nums">{formatNovelDate(novel.updatedAt)}</span>
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-2 pt-2">
            <Button asChild size="sm" className={cn('h-9 w-full gap-1.5 text-xs normal-case', APP_BTN_MD)}>
              <Link to={editorNovelHref(novel.id)}>
                <PenLine className="size-3.5 shrink-0" />
                {t('dashboard:novels.continueWriting')}
              </Link>
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isGenerating}
              className={cn(
                'h-9 w-full gap-1.5 border-2 border-black text-xs normal-case shadow-soft',
                'bg-gradient-to-r from-primary/90 to-violet-600/90 text-primary-foreground hover:from-primary hover:to-violet-600',
              )}
              onClick={(e) => {
                e.stopPropagation()
                onGenerateCover()
              }}
            >
              {isGenerating ? (
                <>
                  <Sparkles className="size-3.5 shrink-0 animate-pulse" />
                  {t('dashboard:novels.coverGenerating')}
                </>
              ) : (
                <>
                  <ImagePlus className="size-3.5 shrink-0" />
                  {hasCover ? t('dashboard:novels.regenCover') : t('dashboard:novels.genCover')}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}

export function NovelWorkCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'aspect-[3/4] animate-pulse border-2 border-black bg-muted/40 shadow-soft',
        className,
      )}
      aria-hidden
    />
  )
}
