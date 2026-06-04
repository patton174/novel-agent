import { sliceTextByRunes } from '../../../hooks/useTypewriterStream'

export function runeLength(text: string): number {
  return Array.from(text).length
}

export function visiblePrefixForBlock(
  content: string,
  textOffset: number,
  globalVisibleLen: number,
  forceFull: boolean,
): string {
  if (forceFull) {
    return content
  }
  const available = Math.max(0, globalVisibleLen - textOffset)
  if (available <= 0) {
    return ''
  }
  return sliceTextByRunes(content, Math.min(runeLength(content), available))
}
