import { useHeroTypewriter, type UseHeroTypewriterOptions } from '@/hooks/marketing/useHeroTypewriter'
import { PixelText, type PixelTextProps } from './PixelText'

type PixelTypewriterTextProps = Omit<PixelTextProps, 'text'> & {
  text: string
  typewriter?: UseHeroTypewriterOptions
}

/** PixelText + 首次加载打字机揭示 */
export function PixelTypewriterText({
  text,
  typewriter,
  ...rest
}: PixelTypewriterTextProps) {
  const { visibleText } = useHeroTypewriter(text, typewriter)
  return <PixelText text={visibleText} {...rest} />
}
