export type ChapterExportFormat = 'txt' | 'md' | 'json'

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || 'chapter'
}

export function exportChapterContent(
  title: string,
  content: string,
  format: ChapterExportFormat = 'md',
): void {
  const base = sanitizeFilename(title)
  let body = content
  let mime = 'text/plain;charset=utf-8'
  let ext = 'txt'

  if (format === 'md') {
    body = `# ${title.trim() || 'Chapter'}\n\n${content}`
    mime = 'text/markdown;charset=utf-8'
    ext = 'md'
  } else if (format === 'json') {
    body = JSON.stringify({ title: title.trim(), content }, null, 2)
    mime = 'application/json;charset=utf-8'
    ext = 'json'
  }

  const blob = new Blob([body], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${base}.${ext}`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function parseImportedChapter(raw: string, filename: string): { title?: string; content: string } {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { content: '' }
  }

  const lower = filename.toLowerCase()
  if (lower.endsWith('.json')) {
    try {
      const data = JSON.parse(trimmed) as { title?: string; content?: string; body?: string }
      const content = String(data.content ?? data.body ?? '').trim()
      const title = typeof data.title === 'string' ? data.title.trim() : undefined
      return { title, content }
    } catch {
      return { content: trimmed }
    }
  }

  if (lower.endsWith('.md') || lower.endsWith('.markdown')) {
    const match = trimmed.match(/^#\s+(.+?)(?:\n+([\s\S]*))?$/)
    if (match) {
      return { title: match[1].trim(), content: (match[2] ?? '').trim() }
    }
    return { content: trimmed }
  }

  return { content: trimmed }
}

export async function importChapterFromFile(file: File): Promise<{ title?: string; content: string }> {
  const text = await file.text()
  return parseImportedChapter(text, file.name)
}
