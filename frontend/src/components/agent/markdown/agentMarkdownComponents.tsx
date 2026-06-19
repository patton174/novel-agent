import type { Components } from 'streamdown'
import { AGENT_PROSE_TABLE_SCROLL } from '@/lib/agentProseClasses'

/** 与 agent-prose 表格样式对齐的自定义组件 */
export const agentMarkdownComponents: Components = {
  table: ({ children }) => (
    <div className={AGENT_PROSE_TABLE_SCROLL}>
      <table className="agent-prose-three-line-table">{children}</table>
    </div>
  ),
}
