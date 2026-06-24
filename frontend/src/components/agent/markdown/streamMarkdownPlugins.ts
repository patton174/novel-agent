import { cjk } from '@streamdown/cjk'
import { code } from '@streamdown/code'
import type { PluginConfig } from 'streamdown'

/** 全局复用，避免每次 render 新建 remark / shiki 插件 */
export const agentStreamMarkdownPlugins: PluginConfig = {
  cjk,
  code,
}

/** 表格 / mermaid 控件仍关闭；代码块走 Streamdown 内置 Shiki + 复制 */
export const agentStreamMarkdownControls = {
  table: false,
  code: { copy: true, download: false },
  mermaid: false,
} as const
