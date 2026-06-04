const INVENTORY_HEADER_RE =
  /^#\s*(数据来源|章节（|记忆（|禁止用)/

const MEMORY_SCOPE_LABELS: Record<string, string> = {
  novel: '作品设定',
  world: '世界观',
  character: '角色库',
  chapter: '章节记忆',
  background: '背景设定',
}

const CATALOG_INTRO =
  '【作品库目录 · story-memory / Content API，非本机文件】'

type TreeNode = { children: Map<string, TreeNode> }

function treeNode(): TreeNode {
  return { children: new Map() }
}

function decodePathSegment(segment: string): string {
  const base = segment.replace(/\.json$/i, '').replace(/\.md$/i, '')
  try {
    return decodeURIComponent(base)
  } catch {
    return base
  }
}

function parseMemoryEntry(path: string): { scope: string; label: string } | null {
  const norm = path.replace(/\\/g, '/').trim()
  const match = norm.match(/\/memory\/([^/]+)\/([^/]+)$/)
  if (!match) {
    return null
  }
  return { scope: match[1], label: decodePathSegment(match[2]) }
}

function parseChapterEntry(path: string): string | null {
  const norm = path.replace(/\\/g, '/').trim()
  const match = norm.match(/\/chapters\/([^/]+)$/)
  if (!match) {
    return null
  }
  return decodePathSegment(match[1])
}

function isMemoryInventoryPath(path: string): boolean {
  return path.replace(/\\/g, '/').includes('/memory/')
}

function isChapterInventoryPath(path: string): boolean {
  return path.replace(/\\/g, '/').includes('/chapters/')
}

/** Group story-memory VFS paths into readable catalog lines (DB-backed, not a file tree). */
export function formatMemoryCatalogLines(paths: string[]): string[] {
  const groups = new Map<string, string[]>()
  for (const raw of paths) {
    const parsed = parseMemoryEntry(raw)
    if (!parsed) {
      continue
    }
    const scopeLabel = MEMORY_SCOPE_LABELS[parsed.scope] ?? parsed.scope
    const list = groups.get(scopeLabel) ?? []
    list.push(parsed.label)
    groups.set(scopeLabel, list)
  }
  if (!groups.size) {
    return []
  }
  const lines: string[] = [CATALOG_INTRO]
  for (const [scopeLabel, labels] of [...groups.entries()].sort(([a], [b]) =>
    a.localeCompare(b, 'zh'),
  )) {
    const unique = [...new Set(labels)].sort((a, b) => a.localeCompare(b, 'zh'))
    lines.push(`${scopeLabel}（${unique.length}）`)
    for (const label of unique) {
      lines.push(`  · ${label}`)
    }
  }
  return lines
}

function formatChapterCatalogLines(paths: string[]): string[] {
  const labels = paths
    .map(parseChapterEntry)
    .filter((label): label is string => Boolean(label?.trim()))
  const unique = [...new Set(labels)].sort((a, b) => a.localeCompare(b, 'zh'))
  if (!unique.length) {
    return []
  }
  return [CATALOG_INTRO, `章节（${unique.length}）`, ...unique.map((label) => `  · ${label}`)]
}

/** Flat API paths → indented tree (chapters / non-memory paths only). */
export function formatPathsAsTree(paths: string[]): string[] {
  const root = treeNode()
  for (const raw of paths) {
    const path = (raw || '').replace(/\\/g, '/').trim()
    if (!path) {
      continue
    }
    const parts = path.split('/').filter(Boolean)
    if (!parts.length) {
      continue
    }
    let node = root
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const key = isLast ? part : `${part}/`
      let child = node.children.get(key)
      if (!child) {
        child = treeNode()
        node.children.set(key, child)
      }
      node = child
    }
  }

  const lines: string[] = []
  const walk = (node: TreeNode, prefix: string) => {
    const items = [...node.children.entries()].sort(([a], [b]) => {
      const aDir = a.endsWith('/')
      const bDir = b.endsWith('/')
      if (aDir !== bDir) {
        return aDir ? -1 : 1
      }
      return a.localeCompare(b)
    })
    items.forEach(([name, child], idx) => {
      const last = idx === items.length - 1
      const branch = last ? '└── ' : '├── '
      const cont = last ? '    ' : '│   '
      lines.push(`${prefix}${branch}${name}`)
      if (child.children.size) {
        walk(child, `${prefix}${cont}`)
      }
    })
  }
  walk(root, '')
  return lines
}

function normalizeToolDisplayText(text: string): string {
  return text.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"')
}

function stripToolLineNumbers(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const m = line.match(/^\s*\d+\t(.*)$/)
      return m ? m[1] : line
    })
    .join('\n')
}

export function stripInventoryHeaders(text: string): string {
  const lines = stripToolLineNumbers(normalizeToolDisplayText(text))
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !INVENTORY_HEADER_RE.test(line))
  return lines.length ? lines.join('\n') : '（无匹配）'
}

function pathFromGrepLine(line: string): string {
  const trimmed = line.trim()
  if (!trimmed) {
    return ''
  }
  const colon = trimmed.indexOf(':')
  if (colon > 0 && trimmed.startsWith('/')) {
    return trimmed.slice(0, colon).trim()
  }
  return trimmed
}

const MEMORY_PATH_RE =
  /(?:\/novel\/[^/\s]+)?\/memory\/(?:novel|world|character|chapter|background)\/[^\s│├└"'`]+/gi

function collectInventoryPaths(stripped: string): string[] {
  const fromLines = stripped
    .split('\n')
    .map((line) => pathFromGrepLine(line.trim().replace(/^[├└│\s─]+/, '')))
    .filter(Boolean)
  const fromRegex = stripped.match(MEMORY_PATH_RE) ?? []
  const chapterFromRegex =
    stripped.match(/(?:\/novel\/[^/\s]+)?\/chapters\/[^\s│├└"'`]+/gi) ?? []
  return [...new Set([...fromLines, ...fromRegex, ...chapterFromRegex])]
}

/** Glob/Grep UI body: memory/chapter catalog or tree (never raw URL-encoded file paths). */
export function formatGlobGrepDisplayOutput(raw: string): string {
  const stripped = stripInventoryHeaders(raw)
  const paths = collectInventoryPaths(stripped)
  if (!paths.length) {
    return stripped
  }

  const memoryPaths = paths.filter(isMemoryInventoryPath)
  const chapterPaths = paths.filter(isChapterInventoryPath)
  const otherPaths = paths.filter(
    (p) => !isMemoryInventoryPath(p) && !isChapterInventoryPath(p),
  )

  const sections: string[] = []
  const memoryLines = formatMemoryCatalogLines(memoryPaths)
  if (memoryLines.length) {
    sections.push(memoryLines.join('\n'))
  }
  const chapterLines = formatChapterCatalogLines(chapterPaths)
  if (chapterLines.length) {
    sections.push(chapterLines.join('\n'))
  }
  if (otherPaths.length) {
    const tree = formatPathsAsTree(otherPaths)
    if (tree.length) {
      sections.push(tree.join('\n'))
    }
  }

  if (sections.length) {
    return sections.join('\n\n')
  }

  if (/[├└│]/.test(stripped)) {
    return stripped
  }
  const tree = formatPathsAsTree(paths)
  return tree.length ? tree.join('\n') : stripped
}
