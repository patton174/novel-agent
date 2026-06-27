# Python AI — Novel Writing Agent

## 架构

主循环：`app/agent/loop.py` → `bind_tools` → `tool_prepare` → `tool_orchestration` / `streaming/sse_bridge` → `backend/*` → Content API。

```
app/agent/
├── loop.py              # 主 query loop
├── router.py            # FastAPI /api/agent/*
├── schemas.py           # AgentRunContext / PlanResult / StepResult
├── harness/             # 编排、会话、子 Agent、事件/UI、计划上下文、路由、工具执行
├── context/             # RUN_CONTEXT、压缩、prompting、计量
├── streaming/           # SSE bridge、流式通道
├── tools/               # 领域 API 工具 + run_tool_use + registry
├── backend/             # chapter/memory 客户端与 catalog
└── metrics.py           # 工具失败率埋点
```

> 章节与记忆经 `app/agent/backend/`（`chapter_store.py` / `memory_store.py`）HTTP 回调 novel-studio Content API，不访问本机磁盘。

## 工具（API 名称）

完整工具/API/前端展示对照见仓库根目录 [`docs/AGENT_TOOLS.md`](../../docs/AGENT_TOOLS.md)。

`ListChapters` `ReadChapter` `WriteChapter` `EditChapter` `DeleteChapter` `ReorderChapters`
`ListMemory` `GetMemoryTree` `ReadMemory` `CreateMemory` `UpdateMemoryFields` `UpdateMemoryContent` `UpdateMemoryMeta` `MoveMemory` `DeleteMemory`
`SearchKnowledge` `GetCharacterGraph`
`AskUser` `TodoWrite` `Agent`
`WebSearch` `WebFetch` `Skill` `MCP`

旧 VFS 工具（`Read`/`Write`/`Glob`/`Grep`/`ToolSearch` 等）已删除。

## 工具结果双通道

| 模型正文 | `ToolCallResult.content` → `step.completed` → `ToolMessage` |
| UI 摘要 | `tool.completed`（`display_excerpt` / `output_summary`） |
| 路由规则 | `app/agent/harness/tool_result_routing.py` |

## SSE 用户可见文案（无后端 i18n）

**python-ai 不做 locale 解析**（无 `Accept-Language` / 用户语言透传）。发往浏览器的 SSE 以**中文模板 + 用户内容**为主；英文界面由 **frontend 翻译层**处理。

### 到达浏览器的字段

| SSE 字段 | 来源 | 前端处理 |
|----------|------|----------|
| `tool.*.name` | API 工具名（`WriteChapter`） | `resolveToolTitle` → `editor:timeline.toolTitles.*` |
| `tool.*.display_name` | `cc_visibility.TOOL_DISPLAY_NAMES`（中文） | `toolDisplayName` → `editor:tools.*` |
| `display_excerpt` / `output_summary` | `tool_ui.py` / `tool_display.py` 模板 | **多数直出**（空态、计数、行号等中文） |
| `tool.progress.message` | `tool_display.*_progress_message`、`chapter_stream_bridge` | 章节流式时写入 `step.detail`；标题行优先 `toolTitles` |
| `interaction.questions` / `options` | 模型 `AskUser` 入参 | 模型语言，不翻译 |
| `message.delta` / `think.delta` | 模型输出 | 模型语言 |
| `run.failed.error` | `loop.py` 等 | 直出（常为英文或 `<tool_use_error>`） |

REST / 业务 API 错误走 **novel-studio `ResultLocalizer`**，不在此列。

### 约定（新增文案时）

1. **工具动作名**：只改 `cc_visibility.TOOL_DISPLAY_NAMES`，并同步 `frontend/src/i18n/locales/en/editor.json` → `timeline.tools` 与 `timeline.toolTitles`。
2. **结果摘要模板**（`tool_ui.py`）：保持简短中文；若需英文 UI，在前端 `toolDetailFormat` / 新增 `editor:sseExcerpts` 映射，**不要在 python-ai 加 locale 分支**。
3. **AskUser**：`interaction.py` 仅传结构化 `questions`/`options`；勿在 `content` 里写用户可见提示（`Waiting for user response.` 会被前端过滤）。
4. **子 Agent 描述**：用 `tool_input.description`（模型语言），`display_name` 保持 `TOOL_DISPLAY_NAMES["Agent"]`，不要拼 `子任务：…` 前缀（前端 `ccToolArgsSubtitle` 单独展示描述）。

### 主要中文模板位置

- `app/agent/harness/cc_visibility.py` — 工具 `display_name`
- `app/agent/harness/tool_ui.py` — `display_excerpt` 单行标题
- `app/agent/harness/tool_display.py` — 进度文案、列表空态、删除确认
- `app/agent/harness/events.py` — `think.started` 默认标题、`tool.completed` 失败检测前缀
- `app/agent/streaming/chapter_stream_bridge.py` / `tool_side_effect.py` — 章节流式 `tool.progress`

## 关键模块

| 模块 | 职责 |
|------|------|
| `app/agent/harness/tool_result_routing.py` | SSE vs 模型正文路由 |
| `app/agent/context/meter.py` / `usage.py` | 上下文计量 → `context.usage` SSE |
| `app/agent/context/compact.py` / `compact_micro.py` / `compact_autocompact.py` | microcompact / autocompact |
| `app/agent/tools/registry.py` | `get_all_tools()` |
| `app/agent/tools/run_tool_use.py` | 单工具执行 |
| `app/agent/streaming/sse_bridge.py` | SSE + WriteChapter 流式 |
| `app/rag/chapter_index.py` | Milvus 向量索引（`catalog:` 前缀隔离爬取书库） |

## 测试

```bash
cd python-ai && python -m pytest tests/ -q
```
