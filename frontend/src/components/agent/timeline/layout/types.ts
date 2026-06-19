/**
 * 编排时间线布局层级（修改缩进时请只改 layout/ 内组件，勿在业务层拼 class）。
 *
 * insight     — 思考 / 推理：外层缩进，THINK_HEADLINE_ROW，与工具分离
 * flat-tool   — think_round 内工具：外包 OrchestrationFlatSlot(kind=tool) + 工具 grid
 * flat-text   — think_round 内正文/摘要：外包 OrchestrationFlatSlot(kind=text)
 * tool-root   — 顶层工具行（无 flat 外包）：TimelineToolRowShell
 */

export type TimelineLayoutTier = 'insight' | 'flat-tool' | 'flat-text' | 'tool-root'

/** 树状分支行对齐方式（由 layout 组件内部映射到 class，业务层勿传 pl-*） */
export type TimelineBranchVariant =
  /** 推理块在 think_round 内：└ 与「思考」标题左缘对齐 */
  | 'insight-in-round'
  /** 推理块在 think_round 外 */
  | 'insight-standalone'
  /** 带图标工具行（grid 第二列，与工具名对齐） */
  | 'tool-grid'
  /** 无图标工具行 */
  | 'tool-stack'
  /** 工具详情内的嵌套分支 */
  | 'nested'

export type OrchestrationFlatKind = 'tool' | 'text'
