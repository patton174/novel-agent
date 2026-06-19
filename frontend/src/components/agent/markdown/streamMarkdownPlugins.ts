import { cjk } from '@streamdown/cjk'
import type { PluginConfig } from 'streamdown'

/** 全局复用，避免每次 render 新建 CJK remark 插件 */
export const agentStreamMarkdownPlugins: PluginConfig = {
  cjk,
}

/** 未安装 @streamdown/code / mermaid 时关闭控件，减少空按钮 */
export const agentStreamMarkdownControls = {
  table: false,
  code: false,
  mermaid: false,
} as const
