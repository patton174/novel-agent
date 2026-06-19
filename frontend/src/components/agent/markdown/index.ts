/**
 * Agent Markdown 渲染栈
 *
 * | 层 | 职责 |
 * |----|------|
 * | prepareAgentMarkdown | LLM 输出启发式规范化（标题/列表/表格） |
 * | Streamdown + remend | 流式未闭合语法、GFM、分块 memo |
 * | @streamdown/cjk | 中日韩 emphasis / 自动链接边界 |
 * | agent-prose-* CSS | 业务变体样式（chat / think / memory …） |
 *
 * 用法：静态 `streaming={false}`；SSE 正文 `streaming={true}`。
 */

export { AgentStreamMarkdown } from './AgentStreamMarkdown'
export type { AgentStreamMarkdownProps } from './AgentStreamMarkdown'
export { prepareAgentMarkdown } from './prepareAgentMarkdown'
export { agentMarkdownComponents } from './agentMarkdownComponents'
