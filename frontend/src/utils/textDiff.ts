export type DiffLineType = 'equal' | 'insert' | 'delete'

export interface DiffLine {
  type: DiffLineType
  text: string
}

export interface DiffStats {
  equal: number
  insert: number
  delete: number
}

export function diffLines(before: string, after: string): DiffLine[] {
  const left = splitLines(before)
  const right = splitLines(after)
  const rows = left.length + 1
  const cols = right.length + 1
  const lcs: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0))

  for (let i = rows - 2; i >= 0; i -= 1) {
    for (let j = cols - 2; j >= 0; j -= 1) {
      if (left[i] === right[j]) {
        lcs[i][j] = lcs[i + 1][j + 1] + 1
      } else {
        lcs[i][j] = Math.max(lcs[i + 1][j], lcs[i][j + 1])
      }
    }
  }

  const result: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      result.push({ type: 'equal', text: left[i] })
      i += 1
      j += 1
      continue
    }
    if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      result.push({ type: 'delete', text: left[i] })
      i += 1
    } else {
      result.push({ type: 'insert', text: right[j] })
      j += 1
    }
  }
  while (i < left.length) {
    result.push({ type: 'delete', text: left[i] })
    i += 1
  }
  while (j < right.length) {
    result.push({ type: 'insert', text: right[j] })
    j += 1
  }
  return result
}

export function summarizeDiff(lines: DiffLine[]): DiffStats {
  return lines.reduce<DiffStats>(
    (acc, line) => {
      acc[line.type] += 1
      return acc
    },
    { equal: 0, insert: 0, delete: 0 },
  )
}

export function isSameText(before: string, after: string): boolean {
  return before === after
}

function splitLines(text: string): string[] {
  if (text.length === 0) {
    return []
  }
  return text.split('\n')
}
