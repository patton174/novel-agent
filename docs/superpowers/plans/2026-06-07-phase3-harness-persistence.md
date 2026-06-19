# Phase 3 实施计划：Harness 统一 + 持久化加固 + Java 性能/记忆优化

> ⚠️ **历史设计记录**。生产已迁移至 **novel-studio 单体**，现状以 `CLAUDE.md` / `.cursor/rules/project-architecture.mdc` 为准。本文保留作历史参考，**勿据以部署**（旧微服务 agent-gateway/auth/pyai/content/consumer 与 `restart-dev.sh` 均已废弃）。

> 目标：①统一双 Agent/双交互体系；②写作 run 可崩溃恢复（durable checkpoint 含 message history）；③Java reactive 去 block、上下文聚合、事件日志落地化；④Story Memory 字段级增量；⑤上下文精准匹配。
>
> 周期：2-3 周 ｜ 依赖：Phase 1 ｜ 可与 Phase 2 并行。
>
> ⚠️ 路径说明：本 plan 沿用 Phase 1 重命名**前**的路径（`agent_step/...`）以对照当前代码；实施时按 `implementation-index.md` 的「目录重命名映射」换算为 `agent/...`。
>
> ⚠️ Java 当前仅 4 个测试文件，本 Phase 所有 Java 改动**必须**配套 Mockito 单测，DB/Redis/MQ 相关用 Testcontainers（见 Phase 4 T4.x 引入 Testcontainers 依赖；若 Phase 4 未先行，本 Phase 先加 Testcontainers 依赖到 `agent-content/pom.xml`）。

---

## 任务总览

| # | 任务 | 侧 | 单测 |
|---|------|----|------|
| T3.1 | 统一交互 gate（移除 choice_gate 或接入主路由） | py | `test_interaction_gate_unified.py` |
| T3.2 | 拆分 sse_bridge.py（职责分离） | py | `test_sse_bridge_split.py` |
| T3.3 | 下线 BaseAgent/ContinuationAgent 续写体系 | py | `test_legacy_agent_removed.py` |
| T3.4 | SSE 模式 durable checkpoint（含 message history） | py | `test_durable_checkpoint.py` |
| T3.5 | 修复 WorkerSliceSession._event latent bug | py | `test_worker_slice_session.py` |
| T3.6 | RunSession dict TTL + 清理 | py | `test_run_session_ttl.py` |
| T3.7 | Java 上下文聚合接口（3 跳→1 跳） | Java | `AgentRunContextAggregateTest` |
| T3.8 | Java reactive 去 block（Mono.zip 并发） | Java | `AgentContextAssemblerTest` |
| T3.9 | AgentRunEventJournal 落 Redis Stream | Java | `AgentRunEventJournalRedisTest` |
| T3.10 | Story Memory 字段级增量 + 结构化 | Java | `StoryMemoryIncrementalTest` |
| T3.11 | 上下文精准匹配（相关性注入） | py | `test_context_relevance_inject.py` |
| T3.12 | side-effect 线程池有界化 | Java | `BoundedSideEffectPoolTest` |

---

## T3.1 — 统一交互 gate

### 背景
`RunSession`（AskUser wait，`run_session.py`）与 `choice_gate._PENDING` + `novel_graph`（未接主路由）两套并存。

### 决策：保留 `RunSession`，移除 `choice_gate`/`novel_graph`（更简单，主路径已用 RunSession）。
- 删除 `app/agents/novel_graph.py`、`app/agents/choice_gate.py`（确认 `route_user_turn` 仅测试引用）。
- 删除 `tests/test_choice_gate.py` 或改写为 RunSession 测试。
- 检索全仓引用，确保无生产调用。

### 单测 `test_interaction_gate_unified.py`
- 断言 `choice_gate` 模块已移除（`import` 抛 ImportError）或其函数不再被 `router.py`/`query_loop.py` 引用。
- 断言 AskUser 交互完整走 `RunSession.submit_interaction → wait_interaction`。

### 验收
```bash
cd python-ai && python -m pytest tests/test_interaction_gate_unified.py -q
```

---

## T3.2 — 拆分 sse_bridge.py（650+ 行）

### 改动
按职责拆为 4 个模块（每个 < 300 行）：
- `sse_bridge.py` → 仅保留事件映射 orchestration（瘦身）
- `chapter_stream_bridge.py` → 章节流式生成（从 sse_bridge 抽出）
- `tool_side_effect.py` → 持久化 side-effect
- `context_enrich_bridge.py` → enrich 调用

保持对外函数签名不变（`stream_cc_tool_step` 等），仅内部重组，**行为零变更**。

### 单测 `test_sse_bridge_split.py`
- 导入各新模块，断言关键函数存在且签名兼容。
- 回归：既有 `tests/` 中涉及 sse_bridge 的测试全绿（行为不变）。

### 验收
```bash
cd python-ai && python -m pytest tests/ -q -k "sse or bridge or chapter"
```

---

## T3.3 — 下线 BaseAgent/ContinuationAgent 续写体系

### 背景
`agents/base.py`、`continuer.py`、`services/generation.py` 的向量续写与主 `query_loop` 概念重叠。

### 改动
- 确认 `services/generation.py` 唯一使用方（`api/routes.py` 续写接口）已在 Phase 2 T2.8 改接 `search_knowledge`。
- 将续写能力作为 `query_loop` 的一个入口/工具，删除 `BaseAgent`/`ContinuationAgent`。
- 谨慎：分步删除，先标 deprecated + 重定向，确认无调用后再删。

### 单测 `test_legacy_agent_removed.py`
- 断言续写 API 现在走 query_loop 路径（`used_context=True`）。
- 断言无模块导入 `BaseAgent`。

### 验收
```bash
cd python-ai && python -m pytest tests/ -q
```

---

## T3.4 — SSE 模式 durable checkpoint（含 message history，P6/P7）

### 背景
SSE 模式 `RunSession` 纯内存，crash 丢 in-flight。Worker checkpoint 不存 LangChain messages（`worker/checkpoint.py`）。

### 改动
**1. checkpoint 序列化加 messages**：
- `worker/checkpoint.py::serialize_worker_state` 增加 `messages_json`：序列化压缩后的消息列表 = 「最近 autocompact 摘要 + 最近 N 条原始 message」（N 默认 20），用 LangChain `messages_to_dict`。
- `restore_worker_state` 反序列化 `messages_to_dict` → `messages_from_dict`，重建时跳过 `_build_messages`。

**2. SSE 模式每 turn 末写 checkpoint**：
- `query_loop.py` turn 循环末（非 worker_mode 时）也调用 `client.upsert_checkpoint`（需 SSE 模式持有 content client；若无则降级仅内存 + 日志告警）。
- 进程重启后，新 run 请求带 `resume_run_id` 时从 checkpoint 恢复。

### 单测 `test_durable_checkpoint.py`
```python
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from app.agent_step.worker.checkpoint import serialize_worker_state, restore_worker_state

def test_messages_roundtrip():
    msgs = [HumanMessage(content="hi"),
            AIMessage(content="", tool_calls=[{"name":"Read","args":{},"id":"t1"}]),
            ToolMessage(content="result", tool_call_id="t1")]
    state = _make_state_with_messages(msgs)
    blob = serialize_worker_state(state)
    restored = restore_worker_state(blob)
    out = restored.messages  # 或重建后的 messages
    assert len(out) == 3
    assert out[1].tool_calls[0]["id"] == "t1"
    assert out[2].tool_call_id == "t1"   # 配对完整

def test_tool_pairing_preserved_after_compact():
    # 超过 N 条时，截断不破坏 tool_call/ToolMessage 配对
    ...
```

### 验收
```bash
cd python-ai && python -m pytest tests/test_durable_checkpoint.py -q
```

---

## T3.5 — 修复 WorkerSliceSession._event latent bug

### 背景
`run_session.py` `WorkerSliceSession.submit_interaction` 引用不存在的 `self._event`。

### 改动
补齐 `_event = asyncio.Event()` 初始化，或显式 `raise NotImplementedError("WorkerSliceSession is resume-once")`（按设计意图）。

### 单测 `test_worker_slice_session.py`
```python
import pytest
from app.agent_step.run_session import WorkerSliceSession

def test_submit_interaction_behaviour():
    s = WorkerSliceSession(run_id="r", payload={"choice": "a"})
    # 首次 resume 消费 payload
    out = s.consume_resume_payload()  # 视实际 API
    assert out["choice"] == "a"
    # 再次调用行为明确（不再 AttributeError）
    ...
```

### 验收
```bash
cd python-ai && python -m pytest tests/test_worker_slice_session.py -q
```

---

## T3.6 — RunSession dict TTL + 清理（防泄漏）

### 改动 `run_session.py`
- `_sessions` 增加 `created_at`，run 结束 `finally` 必删（已有 unregister，确认覆盖异常路径）。
- 新增后台清理：超过 TTL（如 1h）的孤儿 session 定期清除。

### 单测 `test_run_session_ttl.py`
- 注册 session，模拟时间推进，断言过期 session 被清理；活跃 session 保留。

### 验收
```bash
cd python-ai && python -m pytest tests/test_run_session_ttl.py -q
```

---

## T3.7 — Java 上下文聚合接口（3 跳 → 1 跳，P12）

### 背景
`AgentContextAssembler`（`agent-pyai`）每 run 调 content 3 次（novelContext + history + storyMemory）。

### 改动
- `agent-content` 新增 `InternalAgentRunController` 端点 `POST /internal/agent/run-context`，一次返回 `{novelContext, history, storyMemory, storyMemoryData}`。
- 内部并发组装（content 侧本地调用各 service，无跨网络）。
- `agent-pyai` `AgentContextAssembler` 改调单接口。

### 单测 `AgentRunContextAggregateTest`（content 侧，Mockito）
- mock 各 service，断言聚合接口返回的 4 个字段都正确填充，且各 service 各调用一次。

### 验收
```bash
cd novel-agent && mvn -B -pl agent-content test -Dtest=AgentRunContextAggregateTest
```

---

## T3.8 — Java reactive 去 block（P10）

### 背景
`AgentContextAssembler`、`StoryMemoryClient` 用 `.block()`，占用 boundedElastic。

### 改动 `agent-pyai`
- 改为返回 `Mono`，用 `Mono.zip(novelMono, historyMono, memoryMono)` 并发拉取（配合 T3.7 单接口后甚至单 Mono）。
- 移除 `.block()`；blocking 残留隔离到 `Schedulers.boundedElastic()` 明确标注。

### 单测 `AgentContextAssemblerTest`
- 用 `StepVerifier`（reactor-test）断言 `assemble` 返回 Mono 正确组装，无阻塞调用（可用 BlockHound 可选）。

### 验收
```bash
cd novel-agent && mvn -B -pl agent-pyai test -Dtest=AgentContextAssemblerTest
```

---

## T3.9 — AgentRunEventJournal 落 Redis Stream（P9）

### 背景
`AgentRunEventJournal`（`agent-pyai/orchestration`）纯内存，单 run ≤8000，重启丢，不可水平扩展。

### 改动
- 用 Redis Stream（`XADD agent:run:events:{runId}`）替代内存 `List`。
- `append` → `XADD`；`replay` → `XRANGE`；设 TTL（如 24h）。
- `AgentStatusHub.subscribe` 从 Redis 读 replay，多 PyAI 实例共享。

### 单测 `AgentRunEventJournalRedisTest`（Testcontainers Redis）
```java
@Testcontainers
class AgentRunEventJournalRedisTest {
    @Container static GenericContainer<?> redis = new GenericContainer<>("redis:7").withExposedPorts(6379);
    @Test void appendAndReplay() {
        journal.beginRun("r1", 1L, "s1");
        journal.append("r1", "{\"e\":1}");
        journal.append("r1", "{\"e\":2}");
        assertThat(journal.replay("r1")).hasSize(2);
    }
}
```

### 验收
```bash
cd novel-agent && mvn -B -pl agent-pyai test -Dtest=AgentRunEventJournalRedisTest
```

---

## T3.10 — Story Memory 字段级增量（P11）

### 背景
`StoryMemoryService` 整包 JSON 读写，随规模线性恶化。

### 改动 `agent-content`
- 拆 memory 为维度行：novel/world/character/chapter 各独立存储（PG JSONB 列 + 维度 key，或独立表 `story_memory_entry`）。
- 写入支持字段级 patch（只更新变更项），冷写只 upsert 变更维度。
- 读 `getNovelMemory` 仍可聚合，但支持按 scope 部分加载（配合 Phase 1 `ReadMemory(scope,key)`）。
- 兼容迁移：旧整包 JSON 首次读时拆分迁移。

### 单测 `StoryMemoryIncrementalTest`（Testcontainers PG）
- 写入 character 维度 patch，断言只 character 行更新，world/novel 未变。
- 断言聚合读返回完整 memory。
- 断言旧整包迁移正确。

### 验收
```bash
cd novel-agent && mvn -B -pl agent-content test -Dtest=StoryMemoryIncrementalTest
```

---

## T3.11 — 上下文精准匹配（相关性注入）

### 背景
当前 turn 注入全量 chapter_catalog + story_snapshot，token 大、相关性低。

### 改动 `python-ai`
- turn 开始时（`query_loop` enrich 阶段），用当前章节/用户消息调 `hybrid_search`（Phase 2）召回 top-k 相关前文片段 + `kg.character_graph`（若启用），注入 RUN_CONTEXT 的 `relevant_context` 段。
- flag `AGENT_RELEVANCE_INJECT`，默认灰度。
- autocompact 改增量摘要（只摘要未摘要段，缓存结果）。

### 单测 `test_context_relevance_inject.py`
- monkeypatch `hybrid_search` 返回固定片段，断言 RUN_CONTEXT 文本含 `relevant_context` 段且包含召回内容；flag 关闭时不注入。

### 验收
```bash
cd python-ai && python -m pytest tests/test_context_relevance_inject.py -q
```

---

## T3.12 — side-effect 线程池有界化

### 背景
`AgentRunCoordinator` 用 `Executors.newCachedThreadPool()`（无界）。

### 改动 `agent-pyai`
- 改为有界 `ThreadPoolExecutor`（corePool/maxPool/queue/拒绝策略 CallerRuns）。

### 单测 `BoundedSideEffectPoolTest`
- 提交超过容量的任务，断言不会无限创建线程（队列 + 拒绝策略生效），无任务丢失。

### 验收
```bash
cd novel-agent && mvn -B -pl agent-pyai test -Dtest=BoundedSideEffectPoolTest
```

---

## Phase 3 整体验收

```bash
cd python-ai && python -m pytest tests/ -q
cd novel-agent && mvn -B test
```

灰度上线：
1. 先上 T3.4~T3.6（durable checkpoint），用「kill 进程后 resume」端到端验证恢复。
2. T3.7~T3.9（Java 性能/事件落地），压测对比延迟与多实例。
3. T3.10（记忆增量），大记忆作品验证读写延迟平稳。
4. T3.1~T3.3（统一/瘦身）放最后，确认无回归再删 legacy。

### Definition of Done
- [ ] 进程崩溃后 run 可从 checkpoint 恢复，tool 配对完整
- [ ] 单次对话后端跳数从 3 降到 1
- [ ] 事件日志落 Redis，多 PyAI 实例可重放
- [ ] Story Memory 字段级增量，读写延迟随规模平稳
- [ ] 所有 Java/py 改动配套单测通过 + 全量回归绿
