import { AgentMarkdown } from '@/components/agent/AgentMarkdown'
import { cn } from '@/lib/utils'

/** 站点公告 / 隐私政策等公开文档 Markdown — 主题自适应 */
export function SiteMarkdown({ text, className }: { text: string; className?: string }) {
  return <AgentMarkdown text={text} variant="document" className={cn(className)} />
}

/** 从 Markdown 提取纯文本摘要（用于公告折叠预览） */
export function markdownPlainPreview(md: string, maxLen = 180): string {
  const plain = md
    .replace(/^#+\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\*\*|__|\*|_|`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\|[^|\n]+\|/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!plain) return ''
  return plain.length > maxLen ? `${plain.slice(0, maxLen)}…` : plain
}
