# Novel-Agent 全栈架构升级文档

> 版本：v1.0 ｜ 日期：2026-06-07 ｜ 范围：python-ai（写作/爬虫 Agent + RAG）、novel-agent（Java 微服务）、frontend（React）、infra/deploy（全链路部署）
>
> 本文基于对现有代码库的全量梳理，给出现状评估 + 深度优化方案 + 分阶段落地路线图。

---

## 0. 执行摘要

### 0.1 系统定位

本系统是一个「**AI 自动写小说 + 自动爬取素材 + 知识检索**」的全栈平台，由三大工程构成：

| 工程 | 技术栈 | 职责 |
|------|--------|------|
| `python-ai` | FastAPI + LangChain | 写作 Agent（CC 风格工具循环）、爬虫 Agent、RAG |
| `novel-agent` | Spring Boot 3.2 多模块 + Spring Cloud Gateway | 网关/鉴权/内容/编排/消费/记忆持久化 |
| `frontend` | React 18 + TS + Vite 5 | 编辑器、流式对话、安全通信层 |

### 0.2 核心结论（先看这里）

1. **写作 Agent 是「CC 风格工具 harness」**（`agent_step/query_loop.py` 的命令式 while 循环 + LangChain `bind_tools`），而非 LangGraph 状态机。存在**双 Agent 体系**（`query_loop` 主路径 vs `agents/base.py` 遗留）和**双交互 gate**（`RunSession` vs `choice_gate`）的技术债。
2. **工具调用是「VFS 路径门面 + 后端 API」混合架构**，模型必须**猜/拼虚拟文件路径**（含 UUID、URL 编码 key、`{novelId}` 占位符），这是工具调用失败率高的**根因**。用户诉求「全量 API 匹配而非检索文件」是正确方向。
3. **知识库严重断裂**：爬取的小说库（`crawl_catalog_*`）与 RAG **完全不连通**；RAG 仅对用户作品异步建索引，且**检索只走进程内存、Milvus 只写不读**，进程重启即丢失；**无知识图谱**。
4. **Java 侧持久化与可靠性有缺口**：SSE 模式无 durable checkpoint、`AgentRunEventJournal` 纯内存单点、Story Memory 整包 JSON 读写、reactive 栈中大量 `.block()`、`ddl-auto: update` 用于生产。
5. **部署热路径成熟但 CI 无质量门禁**：GitHub Actions 仅做 SSH 热部署，**无 test/lint/typecheck gate、无回滚、无监控告警**。

### 0.3 升级目标

- **工具调用失败率** 从「路径猜测高失败」降到结构化 API 调用（目标失败率 < 2%）。
- **知识库全链路打通**：爬取 → 自动入库 → 向量化 → 知识图谱 → 写作 Agent 可检索。
- **持久化可靠性**：写作/爬虫 run 可崩溃恢复，记忆冷热分层增量化，事件日志可水平扩展。
- **工程化与部署**：PR 质量门禁、灰度/回滚、可观测性（日志/指标/链路）。

---

## 1. 现状全景

### 1.1 写作 Agent（python-ai）

**主路径**：`POST /api/agent/run/stream` → `context_enrich` → `run_query_loop`（`agent_step/query_loop.py:290`）。

```
FE WebSocket → agent-pyai → POST /api/agent/run/stream
  → enrich_context（刷新 story_memory）
  → refresh_chapters_from_content_api
  → run_query_loop:
      while turn < 48 and not terminal:
        refresh RUN_CONTEXT HumanMessage
        prune / microcompact(55%) / autocompact(72%)
        LLM.bind_tools().stream  →  AIMessage.tool_calls
        validate_plan_batch → partition（并行 Read / 串行 Write）
        execute_tool_batches → ToolMessage 回灌
        若 AskUser → run.waiting → 阻塞等待 interaction
```

**harness 三层循环**：Run turn 循环（≤48）、Plan 校验重试（≤6）、工具执行 recover（≤6）。

**上下文压缩四层**：`message_tail`（>82 条裁剪）→ `microcompact`（≥55% 清旧 ToolMessage）→ `autocompact`（≥72% LLM 摘要）→ `transcript compact`。

**持久化现状**：
- SSE 模式：`RunSession` + `_sessions` dict（**纯内存、单点、无 TTL**），进程 crash 丢失 in-flight turn。
- Worker 模式：PG checkpoint（`worker/run_worker.py`），但 **checkpoint 不保存 LangChain messages 列表**，依赖 autocompact 边界 + transcript 重建。

**主要技术债**（详见 [写作 Agent 分析](7a00e049-44cb-4ff8-8d14-996a9c257005)）：
- 双 Agent 体系（`query_loop` CC vs `BaseAgent`/`ContinuationAgent` 向量续写）。
- 双交互 gate（`RunSession` AskUser vs `choice_gate` + `novel_graph` 未接主路由）。
- `sse_bridge.py` 职责过重（650+ 行：流式生成 + 持久化 + 事件映射 + enrich）。
- legacy 工具名（`chapter_create` 等）与 schema 残留。
- 无工具调用即 terminal，可能过早结束长任务。

### 1.2 爬虫 Agent + 知识库（python-ai + Java）

**数据流**（详见 [爬虫与知识库分析](2bd5e291-2333-4513-a523-cc5d9b65aed3)）：

```
CRM 设定 goal → Redis(crawl:orchestrator:state)
  → Python crawl_orchestrator daemon → CreateCrawlJob
  → MySQL(crawl_job) + RabbitMQ(agent.crawl.dispatch.queue)
  → Consumer → POST /internal/crawl/execute
  → crawl_agent tool loop（≤160 轮，LLM 读 HTML 自主决策）
      FetchPage → QueueChapters → InitNovel → SaveQueuedChapters(AI 抽正文) → CompleteJob
  → MySQL(crawl_catalog_novel / crawl_catalog_chapter)   ← 公共书库，与用户作品物理隔离

【断裂点】crawl_catalog_* --（手动 addToUserLibrary 复制）--> novel/chapter
                                                              ↓ createChapter 异步
                                                         ChapterIndexClient → POST /api/rag/index/chapter
                                                              ↓
                                                         RAG: _MEMORY(进程内存) + Milvus(只写不读)
```

**RAG 现状**：
- Embedding：OpenAI `text-embedding-3-small`，**失败时降级 384 维 hash（语义检索几乎失效）**。
- 分块：固定 480 字符，**无 overlap**。
- 存储：进程内 `_MEMORY` dict；Milvus `_milvus_upsert` **仅写不读**。
- 检索：`search_novel` 只查 `_MEMORY`，**进程重启即空**。
- **无知识图谱**（无 Neo4j/GraphRAG）。

**可靠性缺口**：
- 目录发现完全依赖 LLM 读 HTML（`discover_catalog` 已实现但未接工具链）。
- MQ `attempt` 字段无重投（对比 agent run dispatch 有 republish）。
- 章节级失败无自动补爬队列/死信。

### 1.3 Java 后端（novel-agent）

**分层**（详见 [Java 架构分析](31bedc5c-7da0-4698-9d47-6a1cdd0fc1c1)）：

```
Frontend → agent-gateway(:8080, SCG Reactive)
  Filter 链: Auth(-100) → Sign(-109) → Decrypt(-108) → Field(-107) → Replay(-106) → CSRF(-110)
  → agent-auth(:8081)   注册/登录/JWT/CryptoManifest/限流
  → agent-pyai(:8082, WebFlux)  Agent 编排桥接 + SSE/WS
      → agent-content(:8091, MVC)  小说/章节/会话/Run/StoryMemory（JPA→PostgreSQL + Redis）
      → python-ai(:8000)  RAG/工具/LLM
  → agent-consumer(:8090)  @RabbitListener → REST 回写 content
持久化: PostgreSQL + Redis + RabbitMQ ｜ 配置: Nacos
```

**技术栈澄清**：数据库是 **PostgreSQL**（非 MySQL）、ORM 是 **JPA/Hibernate**（非 MyBatis）、MQ 是 **RabbitMQ**（非 RocketMQ）。

> 注：爬虫书库子代理报告中提到的 "MySQL" 实为同一 PostgreSQL 实例的 `crawl_*` 表，以 Java 架构报告的 PostgreSQL 为准。

**记忆持久化（Story Memory）**：冷热分层——读 Redis 优先 miss 回填 PG；写 Redis 热写 + MQ 异步冷写 PG（不可用时同步降级）。`StoryMemoryReadSliceDTO` 支持按行号分页切片供 Agent 分段读。

**双运行模式**：`legacy`（PyAI 直连 Python SSE）vs `queued`（PG Run + MQ dispatch + Redis fanout）。

**主要问题**：
- 每次对话 pyai→content 多跳同步 HTTP（context + history + memory）。
- `AgentRunEventJournal` 纯内存（单 run ≤8000 事件，重启丢失，无法水平扩展）。
- WebFlux 栈中大量 `.block()`，占用 boundedElastic 线程池。
- Story Memory 整包 JSON 读写，无字段级增量。
- `ddl-auto: update` 生产 schema 漂移风险。
- Gateway 无全站限流。

### 1.4 前端 + 部署

**前端**（详见 [前端与部署分析](b01f2a97-da70-436b-92ef-9055d416b9f9)）：React 18 + TS 5 + Vite 5 + Zustand + Tailwind4/styled-components 双轨 + Vitest。所有 API 走 `secureFetch`（路由脱敏 `/g/{prefix}/{cipher}` + AES-GCM body + HMAC 签名 + WS ticket）。流式 = SSE 主通道 + Agent Run WS + Status WS + 打字机回放 + `agentMessageReplay`。

**部署**：MW/Worker 双机 Docker Compose + Nacos + 入口 Nginx。日常靠 `deploy-fast.sh`（本地 build → scp → `docker cp` → restart）+ GitHub Actions（push main → SSH 热部署）。

**问题**：CI 无 test/lint/typecheck gate；无回滚脚本；无监控告警；ESLint 配置文件缺失；`@tanstack/react-query` 冗余依赖；`useEditorAgentStream.ts` 近 900 行耦合。

### 1.5 补充分析（第二轮复核新增的遗漏点）

第二轮针对实现细节复核后，补充以下**原分析未覆盖、但直接影响实施**的事实：

1. **`normalize_tool_name` 已存在但未接入执行链**（重要简化）：`cc_visibility.py:74` 已有 `normalize_tool_name(name)`，内部就是查 `LEGACY_TOOL_ALIASES`。即「legacy 工具名止血」改动比预想更小——只需在 `registry.find_tool_by_name` 与 `orchestration_contract.validate_plan_batch` 调用前套一层 `normalize_tool_name`。

2. **Embedding 降级 hash 的真实根因**：`embeddings.py:31` 用 `OpenAIEmbeddings(model="text-embedding-3-small")`，但项目 LLM 可能配置为 **DeepSeek**（`pyproject.toml` 依赖含 `langchain-deepseek`），而 DeepSeek **不提供 embedding 接口**，导致 `aembed_documents` 抛错 → 静默落 hash。必须**独立配置 embedding provider**（OpenAI 兼容或本地 bge），不能复用 chat 的 `get_active_llm_config()`。

3. **Milvus 配置已就绪但检索不读**：`config.py:31-34` 已有 `milvus_host/port/user/password`，`_milvus_upsert` 也建了 collection schema（`chapter_id` 为主键、`embedding` 为 FLOAT_VECTOR）。改造成本主要在「检索改查 Milvus + 加索引/load + 分区过滤」，schema 基本可复用。

4. **测试基建现状**（关乎「每任务带单测」要求）：
   - **python-ai**：`pytest` + `pytest-asyncio`（`asyncio_mode=auto`，async 测试无需 `@pytest.mark.asyncio`），`testpaths=["tests"]`，已有约 30+ 测试文件，是成熟基建。
   - **frontend**：Vitest 2 + Testing Library，48 个 `*.test.ts(x)`，成熟。
   - **Java**：**仅 4 个测试文件**（`AgentRunStateMachineTest` 等），且无 Testcontainers——**这是最大工程化缺口**，新增 Java 改动几乎无测试保护。
   - **无任何 E2E / 集成测试 / CI 测试门禁**。

5. **可观测性完全缺失**：无结构化日志规范（散落 `logger.warning`）、无 metrics（Prometheus）、无 trace（OpenTelemetry）、无统一 run_id/trace_id 贯穿。这使「工具失败率」「RAG 命中率」等 KPI **当前无法度量**——必须先补埋点才能验证优化效果。

6. **知识图谱零基础**：仓库无任何图数据库依赖（Neo4j/kuzu/networkx），需从依赖引入开始。

7. **`reorder_novel_chapters` / `delete_chapter` 等后端访问函数已齐备**（`vfs/chapter_store.py`），新建 API 工具时**直接复用这些 async 函数**即可，无需重写 HTTP 调用。

> 这些点已并入下文 §3 各方案与 §4 路线图；其中第 1、3、7 点显著降低实施成本，第 4、5 点提升了工程化与可观测的优先级。

---

## 2. 问题清单汇总（按优先级）

| # | 问题 | 所属 | 严重度 | 对应升级章节 |
|---|------|------|--------|--------------|
| P1 | 工具 VFS 路径猜测 → 高失败率 | python-ai | 🔴 高 | §3.1 |
| P2 | 爬取书库与 RAG 完全断裂，无自动索引 | py + Java | 🔴 高 | §3.2 |
| P3 | RAG 检索只走内存、Milvus 只写不读、重启丢失 | python-ai | 🔴 高 | §3.2 |
| P4 | Embedding 降级 hash，语义检索失效 | python-ai | 🔴 高 | §3.2 |
| P5 | 无知识图谱（角色/情节关系无结构化检索） | 全栈 | 🟠 中高 | §3.2 |
| P6 | SSE 模式无 durable checkpoint，crash 丢失 | python-ai | 🔴 高 | §3.3 |
| P7 | Worker checkpoint 不含 message history | python-ai | 🟠 中高 | §3.3 |
| P8 | 双 Agent / 双交互 gate 体系分裂 | python-ai | 🟠 中 | §3.3 |
| P9 | `AgentRunEventJournal` 纯内存单点 | Java | 🔴 高 | §3.4 |
| P10 | reactive 栈大量 `.block()` | Java | 🟠 中高 | §3.4 |
| P11 | Story Memory 整包 JSON 无增量 | Java | 🟠 中 | §3.5 |
| P12 | 每次对话 pyai→content 多跳同步 HTTP | Java | 🟠 中 | §3.4 |
| P13 | `ddl-auto: update` 生产 schema 漂移 | Java | 🟠 中 | §3.4 |
| P14 | CI 无质量门禁、无回滚、无监控 | deploy | 🟠 中高 | §3.7 |
| P15 | 前端安全栈复杂、lint 缺配置、大组件耦合 | frontend | 🟡 中低 | §3.6 |
| P16 | Java 仅 4 个测试文件，几乎无测试保护 | Java | 🟠 中高 | §3.8 |
| P17 | 可观测性缺失，KPI 无法度量 | 全栈 | 🟠 中高 | §3.7.3 / §3.8 |
| P18 | Embedding 误用 chat provider（DeepSeek 无 embedding） | python-ai | 🔴 高 | §3.2.3 |

---

## 3. 深度优化方案

### 3.1 Python-AI 工程化重构 + 工具全量 API 化（彻底重构，不留旧代码）★ 最高优先

> **决策（用户明确要求）**：不做新旧并存、不做灰度兼容层。**直接重写工具层 + 重组目录 + 删除死代码**。只**借鉴** CC 的「工具注册 + bind_tools 循环 + 流式」**架构风格**，不照抄 CC 的工具集。有用的工具（WebSearch / MCP / Skill）**改造为真实 API 实现**，无用的 stub 直接删。

#### 3.1.1 现状：python-ai 是「屎山」

- **目录混乱**：`agent_step/` 顶层 ~50 个文件 + 子目录，`tools/cc/`（沿用 CC 命名、与领域无关）、`vfs/` 13 个文件全是路径门面。
- **VFS 路径门面**：`Read/Write/Edit/Glob/Grep` 以 `file_path` 为核心，模型要猜 `/novel/{novelId}/chapters/{uuid}.md`、URL 编码 key——**工具失败的根因**。
- **大量 stub 空壳**：`Brief`（patch-only no-op）、`TaskCreate/Get/List/Update/Stop`（内存 task store，与 TodoWrite 重复）、`NotebookEdit`（`is_enabled=False`）、`WebFetch/WebSearch`（返回 "not configured"）、`Skill`（"loader TBD"）、`ListMcpResources/ReadMcpResource`（返回 "[]"）——**全是占位**。
- **双实现 / 遗留**：`tools/run_tools.py` vs `tool_orchestration.py`；`agents/base.py`、`continuer.py`、`services/generation.py`、`novel_graph.py`、`choice_gate.py` 遗留；`cc_visibility.LEGACY_TOOL_ALIASES` 仅 UI 用；`ToolSearch` + defer 机制（小工具集根本不需要按需发现）。

#### 3.1.2 目标目录结构（重组，干掉 `cc/` 与 `vfs/`）

```
app/agent/                      # 原 agent_step 重命名为领域语义
  loop.py                       # 主循环（原 query_loop.py）
  harness/                      # 循环支撑：step / message_history / compact / run_session / checkpoint
  tools/                        # 扁平、按领域分文件（删除 cc/ 子目录）
    base.py                     # AgentTool 契约 + registry + langchain bind（合并 tool.py/registry.py/langchain_bind.py）
    chapter.py                  # ListChapters/ReadChapter/WriteChapter/EditChapter/DeleteChapter/ReorderChapters
    memory.py                   # ListMemory/ReadMemory/WriteMemory/EditMemory/DeleteMemory
    knowledge.py                # SearchKnowledge/GetCharacterGraph（接 RAG/KG）
    interaction.py              # AskUser/TodoWrite
    web.py                      # WebSearch/WebFetch（真实 API 实现，非 stub）
    mcp.py                      # ListMcpResources/ReadMcpResource（真实 MCP 客户端，API 形式）
    skill.py                    # Skill（真实技能加载 API）
    subagent.py                 # Agent
  backend/                      # 后端 API 客户端（原 vfs/chapter_store、memory_store，去掉路径解析）
    chapter_client.py / memory_client.py / content_client.py
  context/                      # enrich / compact / run_context（原散落文件归拢）
  streaming/                    # sse / events
api/ services/ rag/ kg/ core/ crawl_agent/   # 保留，crawl_agent 已较清晰
```

> 目录重组分步进行、每步跑全量测试（见 Phase 1 plan T1.0）。重命名用 IDE/`git mv` 保留历史。

#### 3.1.3 最终工具集（领域 API，ID/枚举为核心）

**保留并重写为 API 形式**：

```python
# 章节（chapter.py）— 全部用 chapter_id，杜绝路径
ListChapters(include_summary?) -> [{chapter_id, title, sort_order, word_count}]
ReadChapter(chapter_id, offset?, limit?) -> 正文
WriteChapter(title, content, sort_order?, chapter_id?) -> {chapter_id}
EditChapter(chapter_id, old_string, new_string, replace_all?)
DeleteChapter(chapter_id)
ReorderChapters(chapter_ids[])
# 记忆（memory.py）— scope 枚举 + raw key（内部编码，不暴露）
ListMemory(scope?) / ReadMemory(scope, key) / WriteMemory(scope, key, payload) / EditMemory / DeleteMemory
# 知识（knowledge.py）— 接 Phase 2
SearchKnowledge(query, mode=[vector|graph|hybrid], top_k) / GetCharacterGraph(character)
# 交互 / 编排
AskUser(questions/options) / TodoWrite(todos) / Agent(description, prompt)
# 通用工具（改造为真实 API，非 stub）
WebSearch(query) -> 真实搜索 API ｜ WebFetch(url) -> 真实抓取
ListMcpResources/ReadMcpResource -> 真实 MCP 客户端
Skill(skill) -> 真实技能加载
```

**直接删除（无用 stub / 冗余 / 路径门面）**：
- `Read/Write/Edit/Glob/Grep`（file_path 门面）→ 由 chapter/memory/knowledge 工具取代
- `Delete`（路径）→ `DeleteChapter`/`DeleteMemory`
- `Brief`、`TaskCreate/Get/List/Update/Stop`（与 TodoWrite 重复）
- `EnterPlanMode/ExitPlanMode`（写作场景非必需，plan_mode 逻辑保留在 context_patch 即可）
- `ToolSearch` + 整个 defer/`_discovered_tools` 机制（工具集小，全部 always-load）
- `cc_visibility.LEGACY_TOOL_ALIASES` 及 legacy 名映射

**关键设计原则**：
- 所有资源用稳定 ID（chapter_id / scope+key），模型从 `List*` 返回值拿 ID 回传，**永不构造路径**。
- scope 用 Pydantic `Enum`，schema 即文档，非法值 parse 阶段拦截。
- 检索统一走 RAG（`SearchKnowledge`），废弃 Glob/Grep 启发式扫描。
- 写工具内置 schema 兜底（title 缺失自动补），而非直接拒绝。
- 幂等读工具（List/Read/Search）加指数退避批内重试（瞬时 5xx/网络），减少占用 turn 预算。

#### 3.1.4 需要删除的文件 / 模块（死代码清单）

| 删除 | 原因 |
|------|------|
| `agent_step/tools/cc/`（整个目录：`__init__.py`/`schemas.py`/`vfs_ops.py`） | 路径门面工具，重写到 `tools/*.py` |
| `agent_step/vfs/paths.py`、`path_tree.py`、`api_inventory.py` | 路径解析门面，API 化后无用 |
| `agent_step/vfs/memory_catalog.py`、`read_tools.py` 中的路径模板部分 | catalog 改输出 ID，不再给路径 |
| `agent_step/tools/run_tools.py`（如确为 `tool_orchestration` 重复） | 双实现，保留一套 |
| `agents/base.py`、`continuer.py`、`services/generation.py` | 遗留续写体系（见 §3.3.1） |
| `agents/novel_graph.py`、`agents/choice_gate.py` | 未接主路由的交互 gate（见 §3.3.1） |
| `cc_visibility.py` 中 `LEGACY_TOOL_ALIASES` / `LEGACY_DISPLAY_NAMES` 等 legacy 段 | 无并存需求 |
| stub 工具实现（`_brief_call`/`_task_*`/`_notebook_call` 等） | 无用占位 |
| 历史 `PlanResult`/`StepResult` JSON 解析残留（`llm_parse.py` 中） | bind_tools 后不需要 |

> 删除前用 `ruff`/`vulture` 扫未引用符号 + 全仓 grep 确认零调用（见 Phase 1 T1.7 死代码清扫）。

#### 3.1.5 工程化基线（与重构同步落地）

- 引入 `ruff`（lint+import 排序）、`mypy`（类型）、`pytest --cov`（覆盖率门禁），见 Phase 4 但**本阶段即接入**，防止边重构边堆新债。
- 每个新模块**先写测试再写实现**（纯逻辑：schema 校验、分块、ID 解析）。

---

### 3.2 知识库构建：爬虫书库 → RAG → 知识图谱 ★ 最高优先

#### 3.2.1 目标架构

```
爬取入库(crawl_catalog_chapter)
   │  ① 自动触发（addChapter 内发 MQ 索引事件）
   ▼
知识库摄取管道(Ingestion Pipeline, python-ai)
   │  分块(语义/重叠) → Embedding(批量) → 向量库(Milvus 读写) → 实体抽取
   ├──────────────► ② 向量库 Milvus (collection: catalog_chapters / novel_chapters)
   │                    持久化、可水平扩展、检索走 Milvus
   └──────────────► ③ 知识图谱 (Neo4j / 图存储)
                        实体: 角色/地点/物品/势力/事件
                        关系: 角色-关系-角色、角色-出场-章节、事件-因果-事件
   ▼
检索融合层(Hybrid Retrieval)
   向量召回(语义) + 图召回(关系) + BM25(关键词) → rerank
   ▼
写作 Agent 工具: SearchKnowledge(novel_id, query, mode=[vector|graph|hybrid])
                 GetCharacterGraph(novel_id, character) -> 关系子图
```

#### 3.2.2 爬取书库自动入 RAG（打通 P2）

1. **入库即索引**：`CatalogService.addChapter` 保存后发 MQ 索引事件（参照 `ChapterService.createChapter` 的 `indexClient.indexChapter`），消费者调 python-ai `/api/rag/index/chapter`，**collection 区分 `catalog_chapters` 与用户 `novel_chapters`**。
2. **统一 novel_id 命名空间**：RAG 索引 key 用 `catalog:{catalogNovelId}` 前缀，写作 Agent 可跨命名空间检索公共书库做风格参考。
3. **失败补偿**：索引失败入**重试队列 + 死信**，避免当前「`log.warn` 即丢」。

#### 3.2.3 RAG 质量与持久化升级（打通 P3/P4）

| 项 | 现状 | 升级 |
|----|------|------|
| 向量存储 | 进程 `_MEMORY` + Milvus 只写 | **Milvus 读写双向**，`_MEMORY` 降级为 LRU 缓存 |
| 检索源 | 只查 `_MEMORY` | `search_novel` 改查 Milvus（带 `novel_id` 分区过滤） |
| Embedding | 失败降级 hash | **失败 fail-fast + 告警**，禁止 hash 兜底污染索引；支持本地 bge/m3e 模型作合规降级 |
| 分块 | 固定 480 无 overlap | **语义分块 + 15% overlap**，保留章节/段落边界元数据 |
| 检索方式 | 纯向量 | **Hybrid：向量 + BM25 + rerank（bge-reranker）** |
| 索引重建 | 串行逐章 HTTP | **批量 embedding + 并行 upsert** |

#### 3.2.4 知识图谱（打通 P5）

1. **实体/关系抽取**：在摄取管道中用 LLM 抽取章节中的角色、地点、物品、势力、事件及其关系，写入图库（Neo4j 或轻量 `kuzu`）。
2. **写作上下文增强**：写作 Agent 新增 `GetCharacterGraph(novel_id, character)` 工具，返回角色关系子图，解决「长篇人物关系/伏笔一致性」难题——这是 story_memory 扁平 JSON 无法表达的。
3. **GraphRAG 融合**：检索时先向量召回相关章节，再用图扩展关联实体，提供「事件因果链」「人物关系网」给写作 prompt。
4. **与 story_memory 协同**：story_memory 仍存「作者意图/设定」，知识图谱存「文本中已发生的客观事实」，两者互补。

#### 3.2.5 写作 Agent 接入检索（打通断裂点）

当前 `agent_step` 主写作循环**完全不用 vector_search**（用 story_memory + Content API 章节摘要），`routes.py` 续写接口 `used_context=False  # TODO`。升级：
- 写作 Agent 新增 `SearchKnowledge` 工具（§3.1 的 API 工具之一），按需检索本作品历史章节 + 公共书库参考。
- 长篇连载场景，自动在 turn 开始注入「与当前章节相关的前文片段 + 人物关系子图」到 RUN_CONTEXT。

---

### 3.3 写作 Agent Harness 统一与持久化

#### 3.3.1 统一 Agent 体系（打通 P8）

- **删除遗留路径**：`BaseAgent` / `ContinuationAgent` / `services/generation.py` 向量续写体系**直接删除**，续写能力作为主循环的一个工具/模式实现。
- **删除多余交互 gate**：保留 `RunSession`/`WorkerSliceSession`，**删除** `choice_gate.py` + `novel_graph.py`（未接主路由的死代码）。
- **拆分 `sse_bridge.py`**：按职责拆为「事件映射」「章节流式生成」「持久化 side-effect」「context enrich」四个模块，单文件 < 300 行。

#### 3.3.2 SSE 模式 durable checkpoint（打通 P6/P7）

当前 SSE 模式 `RunSession` 纯内存，crash 即丢 in-flight turn。升级：

1. **统一走 Worker checkpoint 模型**：让 SSE 模式也写 PG checkpoint（每 turn 末），SSE 仅作为「实时事件推送通道」，状态权威源在 PG。
2. **checkpoint 持久化完整 message history**：当前 `serialize_worker_state` 不存 LangChain messages，依赖 autocompact 边界重建，长 run 易丢 tool 配对。升级为**序列化压缩后的 message 列表**（或存「autocompact 摘要 + 最近 N 条原始消息」），保证恢复后 tool_call/ToolMessage 配对完整。
3. **`RunSession` dict 加 TTL + 清理**：避免内存泄漏；多实例部署时 interaction POST 通过 Redis 路由到持有 run 的实例（或全量走 Worker 模式）。
4. **修复 latent bug**：`WorkerSliceSession.submit_interaction` 引用不存在的 `_event`（`run_session.py`），需补齐或显式禁用。

#### 3.3.3 上下文精准匹配

- **章节相关性注入**：turn 开始时，基于当前编辑章节，用 RAG 召回 top-k 相关前文片段 + 人物图，替代当前「全量 chapter_catalog + story_snapshot」的粗放注入，**降低 token、提升相关性**。
- **autocompact 触发优化**：当前 72% 阈值触发整段 LLM 摘要，latency/成本高。改为**增量摘要**（只摘要新增的、未摘要过的历史段），并缓存摘要结果。
- **RUN_CONTEXT 瘦身**：当前每 turn 重写 14k+ JSON HumanMessage。改为「稳定部分（设定/人物）缓存 + 仅 diff 部分刷新」。

---

### 3.4 Java 后端：性能 + 架构 + 持久化优化

#### 3.4.1 性能优化

| 问题 | 升级方案 |
|------|----------|
| P10 reactive 栈 `.block()` | `AgentContextAssembler`、`StoryMemoryClient` 改为**全异步 `Mono.zip` 并发拉取** context+history+memory，消除 `.block()`；blocking 调用隔离到专用 Scheduler |
| P12 每对话多跳 HTTP | context+history+memory **一次聚合接口**（content 提供 `/internal/agent/run-context` 批量返回），减少 3 跳为 1 跳；热数据走 Redis |
| 连接池未调优 | 显式配置 HikariCP（maxPoolSize/minIdle 按压测）、Reactor Netty connection pool |
| `CachedThreadPool` 无界 | side-effect 线程池改**有界 `ThreadPoolExecutor` + 队列 + 拒绝策略**，防膨胀 |
| RAG reindex 串行 | content 侧改**批量提交 + 并发限流**（见 §3.2.3） |
| `isSessionOwnedByUser` 拉 200 条 | 改为**单条 ownership 查询**（DB 索引 userId+sessionId） |

#### 3.4.2 架构优化

- **统一运行模式**：`legacy` / `queued` 双模式并存增加维护成本。建议**全面切 queued（Worker）模式**，PG Run 为权威状态源，legacy 仅保留本地开发 flag。
- **Feign 契约化**：content 调用当前全用硬编码 URL 的 RestClient/WebClient。统一为 **OpenFeign 契约模块**（已有 `agent-feign-auth` 范例），降低耦合、便于 mock/测试。
- **Gateway 全站限流**：当前仅 auth 有 Redis 限流。在 Gateway 增加**基于用户/IP/路由的令牌桶限流**（Spring Cloud Gateway RequestRateLimiter + Redis），保护 Agent/Content 接口。

#### 3.4.3 持久化（打通 P13）

- **引入数据库迁移工具**：`ddl-auto: update` 改为 `validate` + **Flyway/Liquibase** 管理 schema，版本化、可回滚、防漂移。
- **事务边界审视**：`AgentRunService.createRun` 会话 upsert + 消息 + Run + Checkpoint 同事务，确认无长事务持锁；大 JSON 写入考虑拆分。

#### 3.4.4 异步持久化（打通 P9）

- **`AgentRunEventJournal` 落地化**：当前纯内存（单 run ≤8000 事件、重启丢、不可水平扩展）。升级为 **Redis Stream / PG 事件表** 持久化，Status WS 重放从持久层读取，支持多 PyAI 实例与重启续传。
- **会话持久化时序**：当前会话经 MQ 异步落库，用户刷新可能看不到最新消息。升级：**前端乐观写入 + 服务端幂等去重**，或关键消息同步落库、trace 异步。
- **Story Memory 冷写可靠性**：MQ 冷写失败的同步降级路径需补齐**幂等 + 重试 + 死信**，避免 Redis/PG 不一致。

---

### 3.5 记忆持久化（Story Memory）深度优化

#### 3.5.1 字段级增量（打通 P11）

当前 Story Memory 整包 JSON 读写（Redis + PG + 网络序列化随记忆增大线性恶化）。升级：

- **结构化存储**：将 memory 拆为 `novel` / `world` / `character` / `chapter` 维度的**独立行/文档**（PG JSONB 列或独立表），支持**字段级读写**。
- **增量 patch**：Agent 写记忆时只提交 diff（已有 `context_patch.last_memory_patch` 雏形），冷写只更新变更项，而非整包覆盖。
- **读切片复用**：`StoryMemoryReadSliceDTO` 已支持行号分页，配合 §3.1 的 `ReadMemory(scope, key)` API 工具，按需读取避免全量加载。

#### 3.5.2 记忆与知识图谱分工

- **story_memory**：作者设定、写作意图、风格约束（主观、前置）。
- **知识图谱**：文本中已发生的客观事实、人物关系、事件因果（客观、事后抽取）。
- 写作 Agent 上下文 = story_memory（设定）+ 知识图谱召回（一致性）+ RAG 章节召回（细节）。

---

### 3.6 前后端 + Python 工程化

#### 3.6.1 前端（打通 P15）

| 项 | 升级 |
|----|------|
| ESLint 配置缺失 | 补 `eslint.config.js`（flat config），纳入 CI |
| `@tanstack/react-query` 冗余 | 移除未使用依赖，或正式用于 API 缓存层 |
| 样式双轨 | 渐进收敛 styled-components → Tailwind，统一设计系统 |
| `useEditorAgentStream.ts` 900 行 | 拆分为「SSE 连接管理」「WS 续传」「章节 side-effect」「timeline 状态机」hooks |
| 测试覆盖 | 补安全层（secureFetch/requestSign）+ 流式集成测试；引入 Playwright E2E |
| 类型检查 | 测试文件纳入 `tsc`（或独立 `tsconfig.test.json`） |

#### 3.6.2 Python（python-ai）

- **统一工具/Agent 框架**：写作 Agent（CC 风格）与爬虫 Agent（领域 API 风格）工具注册机制不同，抽象**统一 tool registry + run loop 基类**，复用重试/配对修复/RUN_CONTEXT 逻辑。
- **类型与质量**：引入 `ruff` + `mypy` + `pytest` 覆盖率门禁；当前 tests 丰富但需纳入 CI。
- **配置管理**：LLM key / 爬虫代理 / Milvus / Neo4j 连接集中到 `settings`，支持多 profile。

#### 3.6.3 后端 Java

- 统一异常/响应契约（`Result`、`BaseController` 已有基础）。
- 关键路径补单元 + 集成测试（Testcontainers 起 PG/Redis/RabbitMQ）。

---

### 3.7 全链路自动部署 + CI/CD + 可观测性（打通 P14）

#### 3.7.1 CI 质量门禁（PR 阶段）

新增 `.github/workflows/ci.yml`（push/PR 触发），**与现有 `deploy-split.yml` 分离**：

```yaml
jobs:
  frontend:   # pnpm install → tsc → eslint → vitest run → vite build
  python-ai:  # pip install → ruff → mypy → pytest --cov
  java:       # mvn -B verify（单元 + 集成 Testcontainers）
```

- PR 必须全绿才可合并（branch protection）。
- 与部署 workflow 解耦：CI 验证质量，CD 负责发布。

#### 3.7.2 CD 增强

| 能力 | 现状 | 升级 |
|------|------|------|
| 灰度 | 无 | python-ai×2 实例**滚动发布**（先停一个、健康检查、再发另一个），Java 蓝绿/金丝雀 |
| 回滚 | 仅 `/tmp/*-bak.jar` 手动 | **一键 rollback 脚本**（保留上 N 个镜像/jar，按 tag 回退）+ GHA 手动触发 |
| 健康检查 | python-ai 有 healthcheck，Java 靠 curl | 全服务 `/actuator/health`（Spring Boot Actuator）+ Compose healthcheck + 依赖就绪门 |
| 制品版本 | jar/dist 直接覆盖 | **镜像 tag = git sha**，可追溯、可回退 |
| 首次/HTTPS/Nacos | 大量手动 | 脚本化 + 幂等化（已有 setup-split-config.sh，补全 HTTPS/证书自动化） |

#### 3.7.3 可观测性（新增）

- **日志**：结构化 JSON 日志 + 集中采集（Loki / ELK），run_id / session_id / trace_id 贯穿前端→网关→pyai→python-ai。
- **指标**：Prometheus + Grafana。关键指标：工具调用失败率、turn 数分布、autocompact 频率、RAG 召回命中率、爬虫成功率、SSE/WS 连接数、各服务 P99 延迟、MQ 积压。
- **链路追踪**：OpenTelemetry，串联 Gateway → pyai → content → python-ai 的全链路 span。
- **告警**：工具失败率 > 阈值、MQ 积压、Embedding 服务不可用（防 hash 降级）、Milvus/Neo4j 连接异常。

---

### 3.8 工程化实施规范（贯穿所有阶段）★ 强制

> 本节是所有实施任务的**通用纪律**，每个 plan 的每个任务都必须遵守。详见各 phase plan 的「单测要求」段。

#### 3.8.1 测试策略（分语言）

| 语言 | 框架 | 命令 | 约定 |
|------|------|------|------|
| python-ai | `pytest` + `pytest-asyncio`（`asyncio_mode=auto`） | `cd python-ai && python -m pytest tests/ -q` | 新增/改动模块必须在 `tests/test_*.py` 配套用例；async 函数直接写 `async def test_xxx`，无需 mark；HTTP 用 `httpx` mock 或 monkeypatch |
| frontend | Vitest + Testing Library | `cd frontend && pnpm test` | 工具/hook 必须有 `*.test.ts`；安全层（secureFetch/requestSign）必须覆盖 |
| Java | JUnit 5 + Mockito（+ Testcontainers 用于集成） | `cd novel-agent && mvn -B test` | 新增 Service/Filter 必须有单测；涉及 DB/Redis/MQ 的用 Testcontainers |

#### 3.8.2 每任务的「完成定义」（Definition of Done）

每个实施任务（task）**只有同时满足以下条件才算完成**：

1. ✅ 代码改动完成，且通过 lint/typecheck（python: `ruff`；frontend: `tsc + eslint`；java: 编译）。
2. ✅ **配套单测已写**，覆盖：正常路径 + 至少 1 个边界/失败路径。
3. ✅ 本模块测试**本地实跑通过**（命令见上），并在 plan 中勾选记录。
4. ✅ 不破坏既有测试（回归：跑全量 `pytest`/`pnpm test`/`mvn test`）。
5. ✅ 关键路径补埋点（失败率/延迟/命中率），供 §3.7.3 KPI 度量。

#### 3.8.3 实施顺序纪律

- **TDD 倾向**：对纯逻辑函数（路径解析、分块、别名映射、schema 校验），**先写测试再写实现**。
- **小步提交**：每个 task 一个独立、可回滚的 commit（本仓库默认不自动提交，由开发者按需提交）。
- **灰度 flag**：行为变更类（工具面切换、检索源切换、运行模式切换）必须挂 feature flag，默认关闭，灰度验证后开启。
- **重构在测试护栏下进行**：Phase 1 工具层为彻底重写（非并存），靠「重构前全量测试基线 + 每步重跑 + git mv 保历史」控制风险；运行时行为变更类（Phase 3 运行模式切换等）才用 flag/灰度。

#### 3.8.4 工程化补强清单（作为 Phase 4 任务）

- [ ] Java 测试覆盖率从「4 文件」提升到核心 Service/Filter 全覆盖（P16）。
- [ ] python-ai 引入 `ruff` + `mypy` + `pytest --cov`，覆盖率门禁 ≥ 70%。
- [ ] frontend 补 `eslint.config.js`，移除冗余依赖，拆分 900 行大组件。
- [ ] 全栈结构化日志 + Prometheus 指标 + OTel 链路（P17）。
- [ ] CI 三语言质量门禁 + branch protection（§3.7.1）。

---

## 4. 分阶段落地路线图

> 原则：**先重构止血（工程化 + 工具 API 化）→ 再打通（知识库）→ 后加固（持久化/可观测）**。Phase 1 为彻底重构（不留旧代码），每个 task 以「全量测试 + git mv 保历史」控制风险；后续阶段可独立交付、可回滚。

### Phase 1：Python-AI 工程化重构 + 工具全量 API 化（2-3 周，最高 ROI）

- [ ] 目录重组：`agent_step/ → agent/`，删除 `tools/cc/`、`vfs/` 路径门面，工具按领域扁平拆分。§3.1.2
- [ ] 重写领域工具（chapter/memory/knowledge/interaction/subagent），全部 ID/枚举式，杜绝路径。§3.1.3
- [ ] 有用工具改真实 API（WebSearch/WebFetch/MCP/Skill）；删除无用 stub（Brief/Task*/Notebook/ToolSearch）与 legacy 别名。§3.1.3/§3.1.4
- [ ] RUN_CONTEXT/prompt 全 ID 式，删除路径模板。§3.1.3
- [ ] Embedding 独立 provider（修复 DeepSeek 无 embedding 的 hash 降级）；RAG 改 Milvus-only，删除内存主存与 hash 兜底。§3.2.3
- [ ] 死代码总清扫（ruff/vulture）+ 工程化基线接入（ruff/mypy/pytest-cov）+ 工具失败率埋点。§3.1.5/§3.7.3
- [ ] 遗留 agents（`base.py`/`continuer`/`novel_graph`/`choice_gate`）的删除归入 Phase 3 T3.1/T3.3 统一处理。

**验收**：`tools/cc/`、`vfs/paths.py` 等已删除（import 报错证明）；工具集为领域 API；工具失败率可量化；RAG 重启不丢。

### Phase 2：知识库全链路打通（2-3 周）

- [ ] `CatalogService.addChapter` 入库即发 MQ 索引事件，爬取书库自动入 RAG。§3.2.2
- [ ] 索引失败补偿队列 + 死信。§3.2.2
- [ ] 语义分块 + overlap + Hybrid 检索 + rerank。§3.2.3
- [ ] 知识图谱：实体/关系抽取管道 + Neo4j/kuzu + `GetCharacterGraph` 工具。§3.2.4
- [ ] 写作 Agent 接入 `SearchKnowledge`，turn 内相关性注入。§3.2.5 / §3.3.3

**验收**：爬取后无需手动操作即可被写作 Agent 检索；长篇人物一致性提升。

### Phase 3：Harness 统一 + 持久化加固（2-3 周）

- [ ] 统一 Agent 体系（下线 BaseAgent 续写）、统一交互 gate、拆分 sse_bridge。§3.3.1
- [ ] SSE 模式 durable checkpoint，checkpoint 含完整 message history。§3.3.2
- [ ] `AgentRunEventJournal` 落 Redis Stream / PG 事件表。§3.4.4
- [ ] reactive 栈去 `.block()`，context 聚合接口。§3.4.1
- [ ] Story Memory 字段级增量 + 结构化存储。§3.5.1
- [ ] Flyway 接管 schema。§3.4.3

**验收**：写作/爬虫 run 可崩溃恢复；多 PyAI 实例可水平扩展；记忆读写延迟随规模平稳。

### Phase 4：工程化 + 部署 + 可观测（2 周，可与前序并行）

- [ ] CI 质量门禁（frontend/python/java）+ branch protection。§3.7.1
- [ ] 滚动发布 + 一键回滚 + Actuator 健康检查 + 镜像 sha tag。§3.7.2
- [ ] Prometheus/Grafana + 结构化日志 + OpenTelemetry 链路。§3.7.3
- [ ] 前端：ESLint 配置、移除冗余依赖、拆分大组件、补 E2E。§3.6.1
- [ ] Python：ruff/mypy/pytest 门禁。§3.6.2

**验收**：PR 全绿才可合并；故障可回滚；关键指标可观测告警。

---

## 5. 风险与成功指标

### 5.1 风险与缓解

| 风险 | 缓解 |
|------|------|
| 工具面彻底切换导致模型不适应 | 同步重写 system prompt + RUN_CONTEXT 为 ID 式；用离线评测集回归工具调用；失败率埋点监控，异常即修 prompt/schema |
| 知识图谱抽取成本高/不准 | 增量抽取 + 人工校验采样 + 仅对长篇启用 |
| Milvus/Neo4j 引入运维负担 | 先用轻量内嵌（kuzu/Milvus-lite）验证，再上集群 |
| checkpoint 序列化体积大 | 存压缩摘要 + 最近 N 条原始消息，而非全量 |
| 全切 queued 模式影响本地开发 | 保留 legacy flag 仅用于 dev |
| reactive 改造引入并发 bug | 充分集成测试（Testcontainers）+ 灰度 |

### 5.2 成功指标（KPI）

| 指标 | 现状（估） | 目标 |
|------|-----------|------|
| 工具调用失败率 | 高（路径猜测） | < 2% |
| RAG 检索召回相关性（人工评分） | 低（hash 降级风险） | 显著提升，命中 top-k 有效 |
| 爬取→可检索 延迟 | 手动，不确定 | 自动，< 5 分钟 |
| 写作 run 崩溃恢复率 | SSE 模式 0 | ≈ 100%（durable checkpoint） |
| 单次对话后端跳数 | 3+ | 1（聚合接口） |
| Story Memory 读写延迟 | 随规模线性恶化 | 平稳（字段级增量） |
| PR 质量门禁 | 无 | 100% 强制 |
| 部署回滚时间 | 手动数分钟 | 一键 < 1 分钟 |

---

## 6. 附录：关键代码索引

| 主题 | 文件:行 |
|------|---------|
| 写作主循环入口 | `python-ai/app/agent_step/query_loop.py:290-338` |
| 工具批执行 | `python-ai/app/agent_step/query_loop.py:698-846` |
| VFS 路径解析 | `python-ai/app/agent_step/vfs/paths.py:50-97` |
| 工具校验 | `python-ai/app/agent_step/orchestration_contract.py:64-96` |
| legacy 别名（仅 UI） | `python-ai/app/agent_step/cc_visibility.py:13-27` |
| 失败分类 | `python-ai/app/agent_step/tool_execution.py:108-169` |
| RAG 内存检索 | `python-ai/app/rag/chapter_index.py:169-196` |
| Embedding 降级 | `python-ai/app/rag/embeddings.py:31-49` |
| 爬虫主循环 | `python-ai/app/crawl_agent/loop.py:42-129` |
| 爬取入库（不索引） | `novel-agent/.../catalog/CatalogService.java:116-135` |
| 用户章节索引 | `novel-agent/.../ChapterService.java:148-149` |
| 续写 TODO | `python-ai/app/api/routes.py:296-299` |
| Run 事件日志（内存） | `novel-agent/.../orchestration/AgentRunEventJournal.java:14-66` |
| Story Memory 冷热 | `novel-agent/.../service/StoryMemoryService.java:150-165,495-559` |
| 上下文组装 | `novel-agent/.../service/AgentContextAssembler.java:40-92` |
| 前端 secureFetch | `frontend/src/security/secureFetch.ts:29-112` |
| 前端 SSE | `frontend/src/utils/api.ts:28-98` |
| CI 部署 workflow | `.github/workflows/deploy-split.yml` |

### 相关历史设计文档
- `docs/superpowers/specs/2026-05-27-java-python-agent-runtime-design.md`
- `docs/superpowers/specs/2026-06-07-crawl-orchestrator-design.md`
- `docs/superpowers/specs/2026-06-05-client-route-field-crypto-design.md`
- `novel-agent/agent-document/docs/specs/2026-05-30-story-memory-mq-pg.md`
- `docs/ARCHITECTURE.md`

### 子代理深度分析报告（可追溯）
- 写作 Agent：[7a00e049](7a00e049-44cb-4ff8-8d14-996a9c257005)
- 爬虫与知识库：[2bd5e291](2bd5e291-2333-4513-a523-cc5d9b65aed3)
- Java 架构：[31bedc5c](31bedc5c-7da0-4698-9d47-6a1cdd0fc1c1)
- 工具机制：[5a08e767](5a08e767-c209-47bb-a5b8-264d2af58739)
- 前端与部署：[b01f2a97](b01f2a97-da70-436b-92ef-9055d416b9f9)



