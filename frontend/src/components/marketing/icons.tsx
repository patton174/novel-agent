import { palette } from '../../styles/theme'

export function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden>
      <path d="M0 0h24v24H0z" fill="none" />
      <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
    </svg>
  )
}

export function NovelLogoIcon({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill={palette.accent} width={size} height={size} aria-hidden>
      <path d="M0 0h24v24H0z" fill="none" />
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  )
}
