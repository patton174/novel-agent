# Agent API / 工具 / 上下文 / RAG — 合理性分析

> 诊断稿，基于 2026-06 代码走读。  
> 关联：[AGENT_TOOLS.md](./AGENT_TOOLS.md)、[AGENT_TOOLS_REFACTOR_ISSUES.md](./AGENT_TOOLS_REFACTOR_ISSUES.md)、[AGENT_REFACTOR_PLAN.md](./AGENT_REFACTOR_PLAN.md)（执行计划）

---

## 总评

| 维度 | 结论 | 一句话 |
|------|------|--------|
| **Content API（章节）** | 基本合理 | REST 清晰，但读/写格式分裂、命名不统一 |
| **Content API（记忆）** | 部分合理 | 嵌套 scope 表达力强，但 session/novel 双栈 + 命名混用增加失败率 |
| **工具 schema** | **偏复杂** | 为容错叠了过多定位方式，模型仍易用错参数 |
| **工具 ↔ API 映射** | 基本对齐 | Python 客户端做了字段转换，但异步/同步语义不一致 |
| **上下文注入** | **有结构性缺陷** | 多源 catalog、刷新条件过窄、死字段 `retrieved_context` |
| **RAG 召回** | **能力有、默认弱** | 索引异步滞后；自动注入默认关；与 KG 未进 prompt |

**核心矛盾**：工具层要求 **精确 ID / 精确字符串**，而上下文层 **不能保证 catalog 与索引实时一致**，再叠加 **Edit 类 fragile 参数**，三者叠加导致失败率高——不完全是「模型笨」，而是系统设计未对齐。

---

## 一、Content API 定义是否合理

### 1.1 章节 API（novel-studio）

**端点**（`AuthNovelController` / `AuthChapterController`）：

| 操作 | 方法 | 路径 | 评价 |
|------|------|------|------|
| 列表 | GET | `/novels/{novelId}/chapters` | ✅ 合理，Agent 目录真值 |
| 创建 | POST | `/novels/{novelId}/chapters` | ✅ |
| 更新 | PUT | `/chapters/{chapterId}` | ✅ |
| 删除 | DELETE | `/chapters/{chapterId}` | ✅ |
| 全文 | GET | `/chapters/{chapterId}` | ⚠️ 与 `/read` 并存，用途重叠 |
| 分页读 | GET | `/chapters/{chapterId}/read?offset&limit` | ⚠️ 带行号，专供 Agent，但与存储格式不一致 |
| 重排 | POST | `/novels/{novelId}/chapters/reorder` | ✅ body `{ids:[]}` 简单明确 |

**DTO 命名**：章节侧 **camelCase**（`sortOrder`, `wordCount`）。对 Java 前端一致，对 Python Agent 工具（snake_case）需在 `chapter_store.py` 转换——**可接受，但应在 Agent 专用子路由统一 snake_case**（见重构建议）。

**不合理点**：

1. **双读接口**：`GET /chapters/{id}` 返回 raw `content`；`GET /chapters/{id}/read` 返回行号文本 + 分页元数据。工具 `ReadChapter` 只用后者，但 `EditChapter` 内部 `fetch_chapter_full` 用前者——**同一章两种形态**，是 `old_string not found` 的温床。
2. **CreateChapterRequest 字段过剩**：`volumeId`、`summary` 存在，但 Agent `persist_chapter_write` 只发 `title/content/sortOrder`——API 能力 > 工具暴露，模型不知道 summary 存在。
3. **错误体**：统一 `Result {code,msg,data,success}` 合理；但 Python `fetch_chapter_read_slice` 非 200 时有时只返回 `HTTP {code}`，**丢 msg 细节**。

### 1.2 记忆 API（story-memory）

**双路径**：

| 作用域 | 基路径 | clear |
|--------|--------|-------|
| novel | `/novels/{novelId}/story-memory/*` | ✅ POST `/clear` |
| session | `/sessions/{sessionId}/story-memory/*` | ❌ **无 clear 路由** |

**命名分裂**（同一前缀下）：

| 位置 | 约定 |
|------|------|
| 章节 DTO | camelCase |
| patch/delete body | snake_case（`item_id`） |
| read query | camelCase（`itemId`） |
| GET 树包装 | snake_case（`novel_id`） |

对 Agent 工具统一 snake_case 输入而言，**API 层不一致是额外认知负担**；Python 已适配，但新客户端易错。

**不合理点**：

1. **session 无法 clear**：`ClearMemory` 工具在仅有 session 时会调不存在的 `/clear`——**API 缺口**。
2. **patch 即写**：无「创建 vs 更新」区分；`value` 字段承载整段 JSON 字符串（WriteMemory）或字段级 patch——**REST 语义弱**，但尚可工作。
3. **character/chapter 嵌套**：`scope` + `key` + `item_id` 三轴在 API 与存储树（`characters` bucket）之间需要大量归一化——**表达力强但对 LLM 不友好**。

### 1.3 未被 Agent 使用的 API

| API | 说明 |
|-----|------|
| `GET /novels/{novelId}/search` | Java 语义搜索；Agent 走 Milvus `SearchKnowledge`，**双轨** |
| `GET /novels/{novelId}/knowledge-graph` | 前端侧栏；Agent `GetCharacterGraph` 走 Python 内存 KG，**双轨** |
| `POST /novels/{novelId}/reindex` | 全量重建；工具无封装，运维向 |

**评价**：RAG/KG 走 Python 栈合理（embedding 在 Worker），但 **Java 与 Python 各有一套「知识」入口**，文档与 enabled 语义易混（用户侧栏空图 ≠ 工具未启用）。

---

## 二、工具定义是否合理

### 2.1 设计原则对照

| 原则 | 现状 | 评分 |
|------|------|------|
| 一个概念一个工具 | Write/Edit/Reorder 均可改序 | ⚠️ |
| 定位方式单一 | chapter: id/title/index 三选一 | ❌ |
| 读写格式一致 | Read 行号 vs Edit 全文 | ❌ |
| 错误可恢复 | old_string 失败有 fallback | ⚠️ |
| context_patch 一致 | 各工具 patch 键不统一 | ❌ |
| 模型可发现参数 | List 前置依赖靠 prompt | ⚠️ |

### 2.2 章节工具（7）

#### ListChapters / ChapterAudit — 合理

- List 是 **catalog 真值入口**，应强制在 Edit/Delete 前调用——编排契约有提示，但 **无硬约束**。
- ChapterAudit 与 NarrativeReview **职责重叠**（规则审计 vs 语义审查），模型选型困难。

#### ReadChapter — 基本合理，格式是问题根源

```72:75:python-ai/app/agent/tools/schemas.py
class ReadChapterInput(BaseModel):
    chapter_id: str = Field(..., min_length=1, description="Chapter UUID from ListChapters.")
    offset: int | None = Field(None, ge=1, description="1-based start line.")
    limit: int | None = Field(None, ge=1, description="Max lines; omit to read to end.")
```

- **强制 UUID** 正确，但 RUN_CONTEXT 里 catalog 可能 stale，模型仍拿旧 id。
- 返回 **行号正文** 是为 Edit 服务，却与 DB 存 plain text 不一致——**工具链设计选择，但成本高**。

#### WriteChapter — 行为分裂

| 条件 | 行为 |
|------|------|
| `content` 非空 | 同步 POST/PUT |
| `content` 空 | 流式生成 + 异步 persist |

模型从 schema 难以预知「空 content = 流式」；`context_patch` 在流式阶段含 `stream_chapter: true`，与完成后的 `chapters` 列表 **形状不同**。

定位字段：`position` / `after_chapter_id` / `before_chapter_id` / `sort_order`（legacy 别名）**四选一语义**——对 LLM 过多。

#### EditChapter — **最不合理**

- 继承 Read 的 `old_string` 精确匹配 + 全文 GET 路径，容错在 `text_edit.py`，属于 **补丁式修复**。
- 同时支持 `chapter_id` / `title` / `index` 定位 + 内嵌 reorder——**一个工具承担编辑、重命名、移动、局部替换**。
- **建议**：拆为 `SaveChapterFull` + `SaveChapterPatch`（结构化 patch），或至少默认 `old_string=""` 整章替换并弱化局部替换。

#### DeleteChapter — 过宽

五种互斥/可组合定位 + `dedupe_title` 保留最早章——**运维向能力不应与 Agent 常用路径混在一个 schema**。

#### ReorderChapters — 与 Write/Edit 重复

- `chapter_ids` 全序 vs `moves` 部分移动；未出现的 id **append 到末尾**（易误伤）。
- Write/Edit 也能改 `position`——**双入口**。

### 2.3 记忆工具（6）

| 工具 | 合理性 | 主要问题 |
|------|--------|----------|
| ListMemory | ✅ | 不写 `memory_catalog` patch；与 RUN_CONTEXT 刷新脱节 |
| ReadMemory | ⚠️ | slice 与 JSON 双路径，返回形态不同 |
| WriteMemory | ⚠️ | `payload` 须 v1 JSON envelope，模型常写 markdown |
| EditMemory | ❌ | 无 `context_patch`、无 `memory_async`；old_string 无 chapter 级 fallback |
| DeleteMemory | ⚠️ | key 模糊匹配 + 特殊值 `*`/`全部`——强大但不可预测 |
| ClearMemory | ⚠️ | session 路径 API 缺失 |

**scope 枚举**（`novel|world|character|chapter|background`）与存储树键（`characters` 复数）**不一致**，靠 `normalize_memory_scope` 桥接——对人是文档问题，对模型是 **List 结果与 Write 参数不一致**。

### 2.4 知识工具（2）

#### SearchKnowledge

```25:28:python-ai/app/agent/tools/schemas.py
class SearchMode(str, Enum):
    vector = "vector"
    graph = "graph"
    hybrid = "hybrid"
```

- **让模型选 mode 不合理**：应默认 hybrid，graph 作内部增强。
- `mode=graph` 时 **hits 为空**、只返回图结构——模型易以为「没搜到」。
- 无 `novel_id` 时 hard error；Milvus 未配置时 **软空数组**——与「工具失败」语义不清。

#### GetCharacterGraph

- 与 SearchKnowledge graph 模式 **重叠**。
- `KG_ENABLED=false` 返回空图 + note，**不报错**——模型可能继续基于空图推理。
- Python 内存图 vs Java `/knowledge-graph` **不同步**（多 worker 各一份）。

### 2.5 NarrativeReview — 过重

- 输入 10+ 字段（scope、threshold、六个 check_*），**像运维配置不像 Agent 工具**。
- 输出大 JSON（可达 80k 字符），UI 无友好摘要。
- 与 ChapterAudit 边界模糊。

### 2.6 工具 ↔ API 映射总表

| 合理性 | 说明 |
|--------|------|
| ✅ 对齐良好 | List/Read/Write/Delete/Reorder 章节 → 标准 REST |
| ✅ 对齐良好 | Memory patch/delete/read → story-memory API |
| ⚠️ 语义裂缝 | WriteMemory JSON → patch `value` 字符串 |
| ⚠️ 语义裂缝 | 记忆写：本地缓存 + async MQ vs Java 同步落库 |
| ❌ 未映射 | session ClearMemory → API 不存在 |
| ❌ 绕开 API | SearchKnowledge / GetCharacterGraph → Milvus/KG 直连 |

---

## 三、上下文注入是否合理

### 3.1 注入架构（三层）

```
┌─────────────────────────────────────────────────────────┐
│ System prompt（编排契约、工具说明）                        │
├─────────────────────────────────────────────────────────┤
│ HumanMessage #1: RUN_CONTEXT JSON（assemble_run_context）│
│   novel: chapter_catalog, chapter_window                 │
│   memory: memory_catalog, story_snapshot                 │
│   working: relevant_context[], todos, story_snippet      │
├─────────────────────────────────────────────────────────┤
│ HumanMessage #2: plan_context JSON                       │
│   transcript, think, memory ops, retrieved (死字段)      │
├─────────────────────────────────────────────────────────┤
│ 用户消息 + tool_use 历史 + ToolMessage                   │
└─────────────────────────────────────────────────────────┘
```

**评价**：信息量大，但 **结构重复**（`story_snapshot` 在 RUN_CONTEXT 与 plan_context 各出现）、**刷新策略不统一**，模型看到的 catalog 与 API 真值可能差一轮工具。

### 3.2 刷新时机（loop.py）

```890:898:python-ai/app/agent/loop.py
                        refresh_memory = tool not in _MEMORY_WRITE_TOOLS
                        refresh_chapters = tool not in _CHAPTER_WRITE_TOOLS and not (
                            isinstance(patch, dict) and isinstance(patch.get("chapters"), list)
                        )
                        state.ctx = await enrich_context_for_run(
                            state.ctx,
                            refresh_story_memory=refresh_memory,
                            refresh_chapters=refresh_chapters,
                        )
```

| 场景 | refresh_chapters | refresh_story_memory | 问题 |
|------|------------------|----------------------|------|
| WriteChapter 成功 | ❌（若在 patch 中已有 chapters） | ✅ | patch 中 chapters 可能不完整 |
| WriteMemory 成功 | ✅ | ❌ | **story_snapshot 滞后** |
| ReadChapter | ✅ | 条件性 | 不更新 catalog 内容 |
| 流式写章 | ❌（`refresh_chapters=False`） | — | 下一工具可能用旧 catalog |

**enrich.py 额外问题**：

```8:8:python-ai/app/agent/context/enrich.py
_MEMORY_TOOLS = frozenset({"Read", "Write", "Edit"})
```

仍用 **已删除的 VFS 工具名**；`ReadMemory` / `WriteMemory` **不会**触发 `story_memory` 重渲染（除非用户消息含「角色」关键词）。

### 3.3 死字段与双槽位

| 字段 | 写入 | 读取 | 状态 |
|------|------|------|------|
| `relevant_context` | `inject_relevant_context`（run 头，默认关） | `run_context.working` | ⚠️ 默认不启用 |
| `retrieved_context` | **从未写入** | `plan_context`, `routing` | ❌ 死代码 |

**评价**：`retrieved_context` 应删除或接入 `SearchKnowledge` 结果缓存；`relevant_context` 与工具检索 **未统一**。

### 3.4 catalog 多源不一致

| 来源 | 更新时机 |
|------|----------|
| `ctx.chapters` | API fetch / tool patch |
| `chapter_catalog`（RUN_CONTEXT） | 每次 `assemble_run_context` 从 `ctx.chapters` 格式化 |
| `memory_catalog` | 每次 assemble 时 **重新 get_story_memory** |
| `ctx.story_memory` 字符串 | enrich 条件刷新 |

WriteMemory 后：**catalog 新、snapshot 旧**——模型 List 到的 key 与 snapshot 正文可能矛盾。

### 3.5 上下文注入评分

| 项 | 评分 | 建议 |
|----|------|------|
| chapter_catalog 进 prompt | ✅ 必要 | 每 plan 轮强制 API refresh + etag |
| story_snapshot 压缩 | ✅ 必要 | WriteMemory 后必须 refresh |
| 双 JSON 块 | ⚠️ 冗余 | 合并或明确分工 |
| 刷新条件 | ❌ | 写操作后 `catalog_stale=true` 强制 pull |
| retrieved_context | ❌ | 删除或接线 |

---

## 四、RAG 召回是否合理

### 4.1 索引链路

```
章节保存 (novel-studio ChapterService)
  → @Async ChapterIndexClient
  → POST python-ai /api/rag/index/chapter
      → embedding → Milvus upsert (novel_chapters)
      → [KG_ENABLED] asyncio ingest_chapter_kg → 内存图
```

**合理之处**：

- 索引与 Agent 主路径解耦，不阻塞写章 API。
- 按 `chapter_id` 先删后插，支持更新。

**不合理之处**：

1. **异步滞后**：同 run 内 WriteChapter → SearchKnowledge **常搜不到刚写内容**（已知产品行为，但工具无「索引中」提示）。
2. **失败软吞**：索引失败重试 3 次后仅日志，**工具层无 reindex 状态查询**。
3. **KG 与向量不同步**：向量成功、KG 抽取失败时，hybrid 有正文、graph 缺实体。

### 4.2 检索链路

| 路径 | 默认 | 实现 |
|------|------|------|
| 自动注入 | **关**（`agent_relevance_inject=false`） | run 头 `hybrid_search(top_k=3)` → `relevant_context` |
| SearchKnowledge 工具 | 模型主动 | vector / hybrid / graph |
| Java `/novels/{id}/search` | — | Agent **未使用** |

**hybrid_search**（`rag/hybrid_search.py`）：

- Vector top-20 + BM25（从 Milvus list 全量 chunk 内存 BM25）→ RRF → 可选 rerank。
- **合理**：单机规模下简单有效。
- **风险**：大书全量 list chunk 内存 BM25 **可扩展性差**；与向量索引同一源，一并 stale。

### 4.3 RAG 与 prompt 的关系

| 内容 | 是否 RAG |
|------|----------|
| `chapter_window` | ❌ 最近章元数据，非向量 |
| `story_snapshot` | ❌ story-memory 压缩 |
| `working.relevant_context` | ✅ 自动注入（默认关） |
| SearchKnowledge ToolMessage | ✅ 模型可见 |
| GetCharacterGraph | ❌ KG 子图，非 Milvus |

**评价**：RAG **默认不进 prompt**，模型必须记得调 SearchKnowledge——与「写作助手应主动召回」的产品预期可能不符。

### 4.4 SearchKnowledge mode 设计

| mode | 行为 | 合理性 |
|------|------|--------|
| vector | 纯 Milvus | ✅ |
| hybrid | RRF | ✅ 应作为唯一默认 |
| graph | 仅 KG，hits=[] | ❌ 易误导，应合并进 hybrid 或废弃 |

### 4.5 RAG 评分与建议

| 项 | 评分 |
|----|------|
| Milvus 索引设计 | ✅ |
| 异步索引 | ⚠️ 需状态 API + 工具提示 |
| 自动注入默认关 | ⚠️ 产品策略问题 |
| 双搜索栈（Java/Python） | ❌ |
| KG 内存单进程 | ⚠️ 多 worker 不一致 |

**建议**：

1. `GET /api/rag/index/status?novelId&chapterId` → SearchKnowledge 空结果时附带 `indexing_pending`。
2. 默认 `agent_relevance_inject=true`（可配置关闭），或写章后自动 refresh 相关片段。
3. 去掉模型侧 `mode` 参数；graph 作为 hybrid 的一路信号。
4. SearchKnowledge 成功后将短摘要写入 `context_patch`（统一 `retrieved_context` 命名）。

---

## 五、交叉问题矩阵

```
                    API 不合理    工具 不合理    上下文 stale    RAG stale
EditChapter old_string      ·            █              █              ·
chapter_id 过期             ·            █              █              ·
WriteMemory 后 snapshot     ·            ·              █              ·
写章后立即 Search           ·            ·              ·              █
memory session clear        █            █              ·              ·
Reorder 双入口              ·            █              █              ·
graph 空 hits               ·            █              ·              █
```

---

## 六、重构优先级建议

### P0（降失败率）

1. **Plan 前** `fetch_chapter_summaries` + memory catalog pull（带 version/etag）。
2. **WriteMemory 后** `refresh_story_memory=True`；修复 `_MEMORY_TOOLS` 为 API 工具名。
3. **EditChapter**：默认整章替换路径；弱化 old_string；或拆工具。
4. **session ClearMemory**：补 Java `/clear` 或工具层禁止 session clear。

### P1（降复杂度）

5. Agent 专用 Content 子路由，统一 snake_case + 结构化 4xx。
6. 章节 **单读格式**（仅 raw + metadata，或仅 numbered slice，二选一）。
7. SearchKnowledge 去掉 mode；空结果区分「无匹配」vs「索引中」。
8. 删除或接入 `retrieved_context`。

### P2（架构）

9. Java search / python Milvus 合一文档与入口。
10. KG 外置存储（Redis/Neo4j）替代进程内存。
11. NarrativeReview 简化输入；ChapterAudit 合并或分工文档化。

---

## 七、结论

**API 层**：章节 CRUD **REST 设计合格**，主要问题是 **读格式双轨** 和 **命名不统一**；记忆 API **功能完整但 LLM 不友好**（三轴定位 + session 缺口）。

**工具层**：在 API 之上 **叠了过多容错定位与行为分裂**（Write 流式/同步、Edit 多职责、Reorder 多入口），使 schema **看起来灵活、实际上提高失败率**。

**上下文层**：RUN_CONTEXT 思路正确（catalog 进 prompt），但 **刷新策略与写操作未绑定**，且 **memory 双源不一致**、`retrieved_context` 死字段——**需要工程化 catalog version，而非仅靠 prompt 提醒 ListChapters**。

**RAG 层**：技术栈完整（Milvus hybrid + 可选 KG），但 **默认不注入、索引异步无反馈、graph 模式误导**——属于 **产品默认值与工具契约** 问题，而非缺 Milvus。

---

## 八、异步持久化与流式写章（续排查 — Critical）

流式 `WriteChapter` 走 `StreamingChapterAppender` + `async_content_persist`，与同步 `persist_chapter_write` **语义完全不同**，且存在多处「假成功」。

### 8.1 新建章 `chapter_id` 永不回填

`StreamingChapterAppender.chapter_id` 仅在构造时设置；后台 `persist_chapter_write` 返回的新 `chapter_id` **被丢弃**。无 id 时每次 debounce flush 走 `POST` 新建——**同标题可能重复建章**。

### 8.2 `_run_once` dedupe 丢弃并发任务

```32:36:python-ai/app/runtime/async_content_persist.py
def _run_once(key: str, fn: Callable[[], None]) -> None:
    with _LOCK:
        if key in _PENDING_KEYS:
            return
        _PENDING_KEYS.add(key)
```

流式写入期间多次 `schedule_chapter_persist` 重叠时，**中间版本直接 return**，不 queue 最新 body。记忆 patch 同理（`mem:{user}:{scope}:{key}`）。

### 8.3 finalize 假成功

`finalize()` 在 `schedule_*` 之前就设 `persisted: True` 并 `return patch, None`：

```141:149:python-ai/app/agent/tools/chapter_stream_persist.py
        updated = {**cw, "persisted": True, "content": body}
        ...
        schedule_chapter_persist(ctx_dump, cw)
        schedule_chapter_finalize(ctx_dump, patch)
        return patch, None
```

`chapter_stream_bridge` 的 `if perr` **永不可达**；UI 显示「已流式保存」，但 persist/finalize 均为 fire-and-forget。

### 8.4 persist 与 finalize 并行竞态

- dedupe key 不同：`ch:...` vs `ch-final:...`，可**并行执行**。
- finalize 见 `persisted=True` 会**跳过 body 写入**、只做 reorder/catalog——若 final persist 尚未完成或 `chapter_id` 缺失，目录与正文不一致。

### 8.5 空壳章节 persist 必败（静默）

`schedule_start` 发 `content: ""` 的 shell；`chapter_store` 要求 content 非空 → 失败仅 `logger.warning`。

### 8.6 `chapter_persist_failures` 不覆盖流式

`loop.py` 931–954 的恢复 HumanMessage 仅由**同步** `persist_chapter_write_patch` 填充；流式路径失败**不会回灌模型**。

### 8.7 Story Memory 四层异步栈

```
WriteMemory → 本地 _STORE 立即更新
           → ThreadPool HTTP patch → Java Redis hot
           → MQ → Worker PG cold
```

| 问题 | 后果 |
|------|------|
| ListMemory 读本地 | Write 后 List 是新值 |
| ReadMemory 先 HTTP | Write 后 Read 可能是 Java 旧值 |
| `merge_remote_memory_snapshot` 整树覆盖 | 并发本地 patch 可丢失 |
| MQ 消费失败 `safeHandle` 仅 log | PG cold 长期落后 Redis |
| novel incremental cold patch 乱序 | 旧 bucket 覆盖新 key |

**评价**：Agent 工具返回 `ok: True` 与 **远端真值** 脱钩，是「工具成功但后续失败」的重要来源。

---

## 九、工具错误处理与重试（续排查）

### 9.1 静默重试与 turn 恢复自相矛盾

```812:814:python-ai/app/agent/loop.py
                        if _fail and is_recoverable_tool_execution_failure(err_code):
                            if int(getattr(run, "silent_retry_attempts", 0) or 0) <= 0:
                                turn_recoverable_failure = True
```

经过 1–2 次静默重试后最终仍失败：**不会**触发 `batch_tool_recover`，比「不重试直接失败」恢复机会更少。

### 9.2 UI 第 2+ 次重试零事件

`filter_tool_step_events_for_ui` 在 `attempt > 1 && will_retry` 时返回 `[]`——用户长时间停在「进行中」，突然跳到完成/失败。

### 9.3 分类器与生产工具名脱节

| 遗留 | 生产 |
|------|------|
| `chapter_create` / `chapter_update` | `WriteChapter` / `EditChapter` |
| `Read` / `Write` / `Edit`（RETRYABLE_TOOLS） | 已删除 VFS 工具 |
| `result.reason` 分支 | 实际用 `<tool_use_error>` 字符串 |

`run_tool_use` 将**任意 Exception** 包装为 `InputValidationError` → 标为可静默重试——基础设施 bug 被当作参数错误。

### 9.4 API 工具 repair 空转

`repair_tool_input_with_llm` 失败时注入 `_tool_retry`，但 Pydantic schema 多数不允许 extra → **相同错误输入重试最多 3 次**，无新上下文传给模型。

### 9.5 指标失真

`record_tool_result` 按每次 `run_tool_use` 计数——静默重试每次失败计 `error`，成功再计 `ok`；无 `error_code`/重试维度。

### 9.6 SSE 失败载荷不一致

- 主路径：`status: "error"`
- 遗留 `emit_display_events`：中文前缀 + `name.startswith("memory")`（**不匹配** `WriteMemory`）
- `step.failed` 无 `error_code`（`loop_support` 带 code 的分支为死代码）

---

## 十、编排、子 Agent 与并发（续排查）

### 10.1 提示词与实现严重脱节

`main_loop_guide_block()` 仍描述已删除的 VFS 工具：

```122:126:python-ai/app/agent/context/prompting/fragments.py
    return f"""## 单轮 tool_use 批内顺序

1. **准备**（可多个，在前）：`Read`（`chapters/index.json` 或单章 `.md`）、`Grep`、`memory` 路径、`context_search`
2. **写章**（可单独一轮）：`Write` / `Edit` 到 `…/chapters/{{uuid}}.md`（正文写入作品库）
```

模型仍可能被引导调用 **不存在的 Read/Grep/context_search**，与 `bind_tools` schema 冲突。

### 10.2 `Agent` 标记为可并发

```76:76:python-ai/app/agent/tools/interaction.py
        is_concurrency_safe=lambda _i: True,
```

- **多个 `Agent` 可并行**（测试 `test_partition_merges_consecutive_agent_calls` 合并 4 个为一批）。
- **`ReadChapter` + `Agent` 可同批**：子 Agent 可能在父 Read 完成前基于陈旧 catalog 写章。
- 并行批各用 `_branch_context` 浅拷贝，**共享 `ctx.chapters` 引用**；完成后才串行 merge patch——无法挽回并行执行期 DB 竞态。

### 10.3 子 Agent 上下文回传缺口

- `build_subagent_context` 继承父 `context_patch`（含 todos/skill_prompt），但 **清空 history**。
- 子 run 结束只回传 `last_subagent` patch，**不回传 `chapters`/memory 修订**。
- 父 loop 对 `Agent` 完成后 `refresh_chapters=True` 可部分补救——**并行 Agent 时无效**。

### 10.4 审查子 Agent 叠加成本

- 写章 / `Agent` / `ReorderChapters` 触发 `run_needs_review`。
- 每 turn 末自动 `stream_review_subagent`（最多 12 turns）。
- 审查失败 `except Exception` **静默跳过**（`loop.py` 1012–1015）。
- 子 Agent 内已跑 `NarrativeReview` 时父级仍可能再跑一遍。

### 10.5 遗留 PlanResult 碎片

主循环已改原生 `tool_use`，但 Java 仍过滤 `plan.result` 事件；`prepare_execution_batch.end_run` 分支疑似死代码。

---

## 十一、Java API 边界行为（续排查）

### 11.1 Reorder 契约脆弱

| Java `reorderNovelChapters` | python-ai `build_reorder_ids` |
|----------------------------|------------------------------|
| 只更新列表内章节 sort_order | 未列出 id **追加到末尾** |
| 不校验重复 id | delete 路径 `dict.fromkeys` 去重 |
| 不要求全量列表 | Agent 假定最终为完整序 |

绕过 Agent 直调 API 且只传子集 → **sort_order 冲突**。

### 11.2 章节标题无服务端约束

DB 无唯一约束；`createChapter` 不查重。python-ai 客户端校验占位名，但 **404 PUT → POST 新建** 可把错误 `chapter_id` 变成**幽灵重复章**。

### 11.3 索引与写章无一致性信号

`ChapterIndexClient.indexChapter`：`@Async` + 异常仅 `log.warn`；空 content/title 跳过索引。写章 HTTP 200 成功，**SearchKnowledge 可能搜不到**；删除章时 Milvus 残留也可能静默。

### 11.4 记忆 delete 非幂等

`item not found` → `ok:false` → HTTP 400。Agent 重试 Delete 会**反复失败**（与 patch 同值幂等形成对比）。

### 11.5 Redis 写失败仍返回 ok

`persistNovelHotOnly` 等 Redis 失败仅 warn，向上仍 `ok:true`——与 python-ai local-first 叠加后**三层都可能「看起来成功」**。

### 11.6 `fetch_chapter_summaries` 失败静默

非 200 时退回 `ctx.chapters` 缓存——catalog **静默变 stale**。

---

## 十二、安全与暴露面（续排查）

| 风险 | 证据 |
|------|------|
| Python `agent_allow_direct_stream` 默认 **true** | `/api/agent/run/stream` 无 internal key |
| Interaction/Abort 仅认 `run_id` | 知 id 可注入/取消（TTL 3600s） |
| `internal_service_key` 默认 dev 占位 | Content 回调误配风险 |
| Java Agent SSE 依赖 `X-User-Id` header | 网关未强制 JWT→header 时可伪造 |
| Resume 不重检配额 | `resumeRunStreamFrames` 无 quota gate |
| Worker Redis ctx TTL 24h | 完整创作上下文驻留 |

子 Agent 未排除 `WebSearch`/`WebFetch`/`Skill`——审查 Agent 白名单只读，**普通子 Agent 可外联+写库**。

---

## 十三、问题全景图（续）

```
                    ┌─────────────────────────────────────┐
                    │         用户看到「工具成功」          │
                    └─────────────────┬───────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
  流式 finalize                  WriteMemory                   静默重试
  persisted=True                 local ok + async              UI 隐藏失败
  后台 persist 失败              HTTP/MQ 未完成                turn 恢复被跳过
        │                             │                             │
        └─────────────────────────────┼─────────────────────────────┘
                                      ▼
                    下一轮 LLM 基于 stale catalog / 旧 memory /
                    搜不到新章 / 错误 chapter_id → 再次失败
```

---

## 十四、扩展优先级（在 §六 基础上）

### P0+（数据正确性）

| # | 项 |
|---|-----|
| A | 流式写章：persist 成功回填 `chapter_id`；finalize 等 persist 完成；失败写入 `chapter_persist_failures` |
| B | `_run_once` 改为 coalesce 最新（或 queue），禁止丢弃中间版本 |
| C | WriteMemory 后 Read 与 List 统一数据源策略（或 Read 先本地后 HTTP） |
| D | `Agent` 设 `concurrency_safe=False`；禁止与 mutating 工具同批 |

### P1+（可观测与恢复）

| # | 项 |
|---|-----|
| E | 修复 `silent_retry_attempts > 0` 仍应 `turn_recoverable_failure` |
| F | 分类器对齐 API 工具名；Exception 不一律标 recoverable |
| G | `main_loop_guide_block` 对齐 ReadChapter/SearchKnowledge 等 |
| H | `ChapterIndexClient` 失败可查询；Search 空结果区分 indexing |

### P2+（契约与安全）

| # | 项 |
|---|-----|
| I | Reorder API 与客户端语义统一（全量列表 + 去重校验） |
| J | 生产关闭 direct stream + interaction 绑 user |
| K | MQ 消费失败 DLQ/重试 |
| L | 子 Agent 回传 `chapters` + memory revision |

---

## 十五、更新结论

首轮分析（§一–§七）聚焦 **schema 设计、上下文刷新、RAG 默认值**。续排查（§八–§十四）暴露更严重的一类问题：**「成功」语义在异步栈中被稀释**——工具层、流式层、Java 层、MQ 层各自报告成功，但**没有单一真值与失败回灌**，导致 LLM 在下一轮用错误前提继续调用工具。

若只改工具 schema 而不改异步持久化与并发分区，**失败率上限难以显著下降**。

---

*§八–§十五 追加于 2026-06 续排查；涉及 `async_content_persist.py`、`chapter_stream_persist.py`、`tool_execution.py`、`tool_orchestration.py`、`fragments.py`、novel-studio Content/Worker 模块。*

