/**
 * 稳定分段：长度仅随段序号变化（5～10 个 Unicode 码位），流式追加时前缀分段不变。
 */
export function chunkLineStable(
  line: string,
  segmentIndexStart: number,
): { chunks: string[]; nextSegmentIndex: number } {
  const runes = Array.from(line)
  const chunks: string[] = []
  let i = 0
  let seg = segmentIndexStart
  while (i < runes.length) {
    const len = 5 + (seg % 6)
    chunks.push(runes.slice(i, i + len).join(''))
    i += len
    seg += 1
  }
  return { chunks, nextSegmentIndex: seg }
}
