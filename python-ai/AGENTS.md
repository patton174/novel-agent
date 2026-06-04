# Python AI — CC Agent 编排

## 架构

主循环：`query_loop` → `bind_tools`（CC 工具 registry）→ `tool_prepare` → `tool_orchestration` / `sse_bridge` → VFS → Content API。

## 工具（CC 名称）

`Read` `Write` `Edit` `Glob` `Grep` `Delete` `AskUser` `TodoWrite` `ToolSearch` `EnterPlanMode` `ExitPlanMode` + **`Agent`（子 Agent，真跑嵌套 query_loop）** + defer 工具（`WebFetch` `Task*` …）。

**子 Agent**：`subagent.py` + `subagent_sse.py` — `Agent` 工具派生子 `query_loop`，SSE：`subagent.started` / `subagent.progress` / `subagent.completed|failed`（前端 `SubagentPanel`）。默认 20 轮、不可嵌套；长任务拆多次派发。配置：`agent_subagent_max_turns` / `agent_subagent_max_depth`。

虚拟路径（**API 入口，非本机文件**）：`Read`/`Glob`/`Grep`/`Write` 均访问 Content API（章节）与 story-memory（记忆）。权威清单在 RUN_CONTEXT `chapter_catalog` / `memory_catalog`。

## 工具结果双通道（对齐 CC）

| CC | 本项目 |
|----|--------|
| `mapToolResultToToolResultBlockParam` → API `tool_result` | `ToolCallResult.content` → `step.completed.display.content` → `ToolMessage` |
| `toolUseResult` + `renderToolResultMessage` | `tool.completed`（`display_excerpt` / `output_summary`；Glob/Grep 的 `output` 仅前端） |
| `processToolResultBlock` / `toolResultStorage.ts` | `truncate_tool_result`（`tools/result_storage.py`） |
| `renderToolResultMessage` | `AgentTool.ui_excerpt` → `tool_ui.py`（`build_tool` 自动挂载默认摘要） |
| Glob/Grep 展开树 | SSE `output`（仅前端）；摘要走 `display_excerpt` |

实现与禁止混用规则见 `app/agent_step/tool_result_routing.py`。改 SSE 或回灌逻辑时**先读** `claude-code-ref/src/services/tools/toolExecution.ts`（`addToolResult`）与 `utils/transcriptSearch.ts`（API vs UI 文本分离注释）。

## 关键模块

| 模块 | 职责 |
|------|------|
| `tool_result_routing.py` | SSE vs 模型正文路由（CC 双通道） |
| `context_meter.py` / `context_usage.py` | 上下文计量（API usage + 消息估算）→ `context.usage` SSE |
| `context_policy.py` | 压缩阈值策略（microcompact @ 55%、autocompact @ 72%） |
| `context_compact_micro.py` | 旧 `ToolMessage` 微压缩（CC `[Old tool result content cleared]`） |
| `context_compact_autocompact.py` | LLM 会话摘要 + `compact_boundary`（CC `compactConversation`） |
| `tools/registry.py` | `get_all_tools()` |
| `tools/run_tool_use.py` | 单工具执行 + tool_use_error |
| `tools/run_tools.py` | 并发分区 |
| `tools/langchain_bind.py` | bind_tools |
| `tools/sse_bridge.py` | SSE + Write 流式写章 |
| `vfs/` | 路径解析 + Content/记忆 |
| `tool_prepare.py` | 批内排序 |
| `orchestration_contract.py` | 批校验 + system prompt |

## 已删除

`strategies/`、`registry.py`（Strategy）、`tool_batch_enrich.py`、`agent_tool_bindings.py`、`plan_input_policy.py`、`executor.py`。

## 测试

```bash
cd python-ai
python -m pytest tests/test_cc_tool_execution.py tests/test_vfs_read.py tests/test_orchestration_contract.py tests/harness/ tests/test_tool_orchestration.py -q
```

全栈：`bash novel-agent/docs/deploy/windows/restart-dev.sh`
