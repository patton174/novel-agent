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
