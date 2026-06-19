# Agent 时间线 + 记忆工具 UI 修复计划

> 基于 2026-06 根因分析；按 P0 → P1 → P2 逐项落地。

## 问题摘要

| # | 现象 | 根因 |
|---|------|------|
| 1 | 已完成工具变「进行中」、无 Success | `tool.started` 无终态保护；`findStepForTimelineTool` 模糊匹配；合成 `started` 兜底 |
| 2 | 编排初态图标无描边、扫光不对 | `TimelineLeadIcon` 全局 `animate={false}` |
| 3 | GetMemoryTree/DeleteMemory JSON 透传 | `format_list_json_excerpt` 只认 `entries`；`delete_memory_ui_excerpt` 原样返回 JSON |
| 4 | 删除记忆无标题 | 删除前未解析节点 title；excerpt 未读 JSON.title |
| 5 | 分支两行重复 | `branchLine` + `branchInner`/`ToolDetailPeek` 双通道同文案 |
| 6 | UpdateMemory memory_id=None | 模型传 null；契约未强制先 List/Get 取 id |

---

## P0 — SSE 状态机（前端）

### P0-1 `tool.started` 终态保护

**文件**: `frontend/src/utils/agentStreamState.ts`

- 在 `isToolLifecycleEvent` 分支，当 `event.type === 'tool.started'` 且已有 step 为 `completed`/`failed` 时，**直接 return**，与 `step.started` 对齐。
- **测试**: `agentStreamState.test.ts` 增加 `duplicate tool.started after tool.completed`。

### P0-2 收紧 step 匹配

**文件**: `frontend/src/utils/agentMessageReplay.ts`

- `findStepForTimelineTool`：**仅** `stepId` 精确匹配，移除「第一个未渲染 tool step」模糊 fallback。

**文件**: `frontend/src/components/agent/timeline/AssistantStreamTimeline.tsx`

- 合成 `status: 'started'` 兜底仅在 `streamLive && !streamFinished` 时启用；流结束后找不到 step 则 `return null`。

---

## P0 — Python UI 摘要

### P0-3 GetMemoryTree 专用 excerpt

**文件**: `python-ai/app/agent/harness/tool_display.py`

- 新增 `format_memory_tree_excerpt(content)`：解析 `{ scope, count, nodes }`，输出「scope（N 项）」或顶层 title 列表。

**文件**: `python-ai/app/agent/harness/tool_ui.py`

- 新增 `get_memory_tree_ui_excerpt`；registry 中 `GetMemoryTree` 改绑此函数（不再共用 `list_memory_ui_excerpt`）。

### P0-4 DeleteMemory 标明删除对象

**文件**: `python-ai/app/agent/tools/memory.py`

- 删除前 `get_memory_node` 取 `title`，写入 result JSON 的 `title` 字段。

**文件**: `python-ai/app/agent/harness/tool_ui.py`

- `delete_memory_ui_excerpt`：优先 `tool_input.title` / JSON `title` / `resolve_delete_memory_label`，**禁止**透传原始 JSON。

---

## P1 — 前端渲染

### P1-1 记忆工具单行分支

**文件**: `frontend/src/components/agent/timeline/TimelineToolBlock.tsx`

- 记忆读/写/树工具：运行中不向 `branchInner` 推送 `displayExcerpt`；`compactBranchSummary` 时关闭 expandable detail，只保留 `branchLine`。

### P1-2 运行中图标描边

**文件**: `frontend/src/components/agent/timeline/TimelineLeadIcon.tsx`

- `ToolIcon animate={status === 'loading'}`（成功/失败/idle 不动画）。

---

## P2 — 提示词 / 契约

### P2-1 UpdateMemory 强制 memory_id

**文件**: `python-ai/app/agent/harness/tool_contract.py`、`python-ai/app/agent/tools/schemas.py`

- 强化 `UpdateMemory`：`memory_id` 必填 UUID，**禁止 null**；必须先 `ListMemory`/`GetMemoryTree` 取 id。

---

## 验收清单

- [x] CreateMemory 完成后 Success 不回退；重复 `tool.started` 不改变终态
- [x] GetMemoryTree 分支为中文摘要，无 `{` JSON
- [x] DeleteMemory 显示「已删除记忆：{title}」
- [x] ListMemory/CreateMemory 分支单行、无重复（memory API 工具关闭双通道 detail）
- [x] 编排中/工具运行中 SVG 描边动画；工具名扫光
- [x] `pytest tests/test_tool_ui.py` + 前端 vitest 通过
