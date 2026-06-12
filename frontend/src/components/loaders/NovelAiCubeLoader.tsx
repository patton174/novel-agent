import { cn } from '@/lib/utils'
import {
  NOVELAI_CUBE_CUBE,
  NOVELAI_CUBE_FACE,
  NOVELAI_CUBE_FACE_BACK,
  NOVELAI_CUBE_FACE_BOTTOM,
  NOVELAI_CUBE_FACE_FRONT,
  NOVELAI_CUBE_FACE_LEFT,
  NOVELAI_CUBE_FACE_RIGHT,
  NOVELAI_CUBE_FACE_SIDES,
  NOVELAI_CUBE_FACE_TOP,
  NOVELAI_CUBE_GRID,
  NOVELAI_CUBE_GRID_COMPACT,
  NOVELAI_CUBE_LOADER,
} from '@/lib/shimmerClasses'

export interface NovelAiCubeLoaderProps {
  compact?: boolean
  className?: string
}

/**
 * 立方体字母加载动画（配色适配 Novel AI 暖金 / 新拟物主题）
 */
export function NovelAiCubeLoader({ compact = false, className }: NovelAiCubeLoaderProps) {
  const letters = ['L', 'O', 'A', 'D', 'I', 'N', 'G']

  return (
    <div className={cn(NOVELAI_CUBE_LOADER, className)} data-testid="novel-ai-cube-loader">
      <div className={cn(NOVELAI_CUBE_GRID, compact && NOVELAI_CUBE_GRID_COMPACT)}>
        {letters.map((letter, i) => (
          <div className={NOVELAI_CUBE_CUBE} key={i}>
            <div className={cn(NOVELAI_CUBE_FACE, NOVELAI_CUBE_FACE_FRONT)}>{letter}</div>
            <div className={cn(NOVELAI_CUBE_FACE, NOVELAI_CUBE_FACE_SIDES, NOVELAI_CUBE_FACE_BACK)} />
            <div className={cn(NOVELAI_CUBE_FACE, NOVELAI_CUBE_FACE_SIDES, NOVELAI_CUBE_FACE_RIGHT)} />
            <div className={cn(NOVELAI_CUBE_FACE, NOVELAI_CUBE_FACE_SIDES, NOVELAI_CUBE_FACE_LEFT)} />
            <div className={cn(NOVELAI_CUBE_FACE, NOVELAI_CUBE_FACE_TOP)} />
            <div className={cn(NOVELAI_CUBE_FACE, NOVELAI_CUBE_FACE_BOTTOM)} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default NovelAiCubeLoader
