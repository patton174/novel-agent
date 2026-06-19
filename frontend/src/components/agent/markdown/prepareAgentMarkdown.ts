import { normalizeAgentMarkdown } from '../../../utils/normalizeAgentMarkdown'

/**
 * Agent 域 Markdown 预处理：修复 LLM 常见格式问题后再交给 Streamdown。
 * Streamdown remend 负责流式未闭合语法；此处负责中文标题/列表/表格等启发式修复。
 */
export function prepareAgentMarkdown(text: string | null | undefined): string {
  if (!text) {
    return ''
  }
  return normalizeAgentMarkdown(text)
}
