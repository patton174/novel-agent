import { useEffect, useState } from 'react'
import { marketingScrollTo } from '../utils/marketingScrollTo'
import { usePageScrollProgress } from '../../../hooks/marketing/usePageScrollProgress'
import {
  ScrollChapterDot,
  ScrollProgressFill,
  ScrollProgressRail as Rail,
  ScrollProgressTrack,
} from '../../../styles/surfaces/marketingScroll'

const CHAPTERS = [
  { id: 'hero', label: '开篇' },
  { id: 'story-orchestrate', label: '编排' },
  { id: 'story-subagent', label: '子代理' },
  { id: 'features', label: '流程' },
  { id: 'capabilities', label: '能力' },
] as const

export function ScrollProgressRail() {
  const progress = usePageScrollProgress()
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const lenis = (window as Window & { __lenis?: { scroll: number } }).__lenis
    const scrollY = (lenis?.scroll ?? window.scrollY) + window.innerHeight * 0.35
    let idx = 0
    CHAPTERS.forEach((c, i) => {
      const el = document.getElementById(c.id)
      if (el && el.offsetTop <= scrollY) idx = i
    })
    setActiveIndex(idx)
  }, [progress])

  return (
    <Rail aria-label="页面滚动进度">
      <ScrollProgressTrack>
        <ScrollProgressFill $progress={progress} />
      </ScrollProgressTrack>
      {CHAPTERS.map((chapter, i) => (
        <ScrollChapterDot
          key={chapter.id}
          type="button"
          title={chapter.label}
          aria-label={`跳转到：${chapter.label}`}
          $active={i === activeIndex}
          onClick={() => marketingScrollTo(chapter.id)}
        />
      ))}
    </Rail>
  )
}
