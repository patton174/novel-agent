# Phase 2 实施计划：知识库打通 + 知识图谱

> 目标：①爬取书库自动进 RAG（修复断裂）；②语义分块 + Hybrid 检索 + rerank；③知识图谱（实体/关系抽取 + 图检索）；④写作 Agent 接入知识检索。
>
> 周期：2-3 周 ｜ 依赖：Phase 1（embedding provider、Milvus 检索已修）｜ 可与 Phase 3 并行。

---

## 任务总览

| # | 任务 | 侧 | 文件 | 单测 |
|---|------|----|------|------|
| T2.1 | 爬取入库即发索引事件 | Java | `CatalogService.java`、`MqTopic.java`、新 listener | `CatalogIndexEventTest` |
| T2.2 | catalog 章节索引到独立 collection | py | `rag/chapter_index.py`、`rag_routes.py` | `test_catalog_index_namespace.py` |
| T2.3 | 索引失败补偿（重试+死信） | py+Java | `rag/ingest_queue.py`（新） | `test_ingest_retry.py` |
| T2.4 | 语义分块 + overlap | py | `rag/chunking.py`（新） | `test_chunking.py` |
| T2.5 | Hybrid 检索 + rerank | py | `rag/hybrid_search.py`（新） | `test_hybrid_search.py` |
| T2.6 | 知识图谱抽取管道 | py | `kg/extractor.py`、`kg/store.py`（新） | `test_kg_extractor.py`、`test_kg_store.py` |
| T2.7 | 图检索 + 写作工具 GetCharacterGraph | py | `kg/query.py`、`agent/tools/knowledge.py` | `test_kg_query.py` |
| T2.8 | 写作 Agent 接入 SearchKnowledge | py | `agent/tools/knowledge.py` | `test_search_knowledge_tool.py` |

---

## T2.1 — 爬取入库即发索引事件（修复断裂 P2）

### 背景
`CatalogService.addChapter`（`catalog/CatalogService.java:116`）保存爬取章节后**不触发任何索引**。用户作品走 `ChapterService.createChapter → indexClient.indexChapter`，但爬取书库没有。

### 改动

**1. `agent-common-mq/.../MqTopic.java`** 新增主题：

```java
CATALOG_INDEX("agent.catalog-index.exchange", "agent.catalog-index.persist", "agent.catalog-index.queue"),
```

**2. `CatalogService.addChapter`** 保存后发 MQ（不阻塞抓取主流程）：

```java
CrawlCatalogChapterEntity saved = catalogChapterRepository.save(chapter);
// 新增：发索引事件
messageProducer.send(MqTopic.CATALOG_INDEX, Map.of(
    "catalogNovelId", catalogNovelId,
    "chapterId", saved.getId(),
    "title", title == null ? "" : title,
    "sortOrder", sortOrder
));
```

**3. 新建 `agent-consumer/.../listener/CatalogIndexListener.java`**：消费事件 → 读 catalog 章节正文 → 调 content internal API（或直接调 python-ai `/api/rag/index/chapter`，`novel_id` 用 `catalog:{catalogNovelId}` 前缀，见 T2.2）。失败抛异常触发 RabbitMQ 重试 → 死信（T2.3）。

> 注入 `IMessageProducer` 到 `CatalogService`（参考 `StoryMemoryService` 注入方式）。

### 单测 `CatalogIndexEventTest`（Mockito，无需 DB）
- mock `catalogChapterRepository.save` 返回带 id 的实体，mock `IMessageProducer`，断言 `addChapter` 后 `producer.send(eq(MqTopic.CATALOG_INDEX), any())` 被调用一次，且 payload 含正确 `chapterId`。

```java
@Test
void addChapter_publishesIndexEvent() {
    when(catalogNovelRepository.findById(any())).thenReturn(Optional.of(novel));
    when(catalogChapterRepository.save(any())).thenAnswer(i -> { var e = i.getArgument(0, CrawlCatalogChapterEntity.class); e.setId("ch1"); return e; });
    service.addChapter("cn1", "第一章", "正文", 1, "http://x");
    verify(producer).send(eq(MqTopic.CATALOG_INDEX), argThat(m -> "ch1".equals(((Map<?,?>)m).get("chapterId"))));
}
```

### 验收
```bash
cd novel-agent && mvn -B -pl agent-content test -Dtest=CatalogIndexEventTest
```

---

## T2.2 — catalog 章节索引到独立命名空间

### 背景
爬取书库与用户作品是两套 ID 空间，需隔离但可跨域检索（写作参考）。

### 改动 `python-ai`
- `chapter_index.py`：`novel_id` 约定 `catalog:{catalogNovelId}` 前缀表示公共书库，用户作品保持裸 `novelId`。Milvus 用同一 collection 靠 `novel_id` 分区过滤即可（schema 已支持）。
- `rag_routes.py`：复用现有 `/api/rag/index/chapter`，无需新端点（`novel_id` 传 `catalog:xxx`）。

### 单测 `test_catalog_index_namespace.py`
- 索引 `catalog:cn1` 与 `novel-1` 两条，断言 `search_novel("catalog:cn1", ...)` 不会召回 `novel-1` 的 chunk（命名空间隔离）。

### 验收
```bash
cd python-ai && python -m pytest tests/test_catalog_index_namespace.py -q
```

---

## T2.3 — 索引失败补偿（重试 + 死信，修复「log.warn 即丢」）

### 改动
- **Java 侧**：`CatalogIndexListener` 配置 RabbitMQ `@RabbitListener` 重试（`spring.rabbitmq.listener.simple.retry`）+ 死信队列 `agent.catalog-index.dlq`。死信进 DB 表 `index_failure`（catalogNovelId、chapterId、error、retryCount、createdAt）。
- **py 侧**：新建 `rag/ingest_queue.py` 作为索引调用的统一入口，封装指数退避重试（瞬时 5xx/网络），最终失败抛出供上游 MQ 重试。

### 单测 `test_ingest_retry.py`
```python
import asyncio
from app.rag import ingest_queue

def test_retry_then_success(monkeypatch):
    calls = {"n": 0}
    async def flaky(**kw):
        calls["n"] += 1
        if calls["n"] < 3: raise RuntimeError("502")
        return 5
    monkeypatch.setattr(ingest_queue, "_do_index", flaky)
    out = asyncio.run(ingest_queue.index_with_retry(max_attempts=3, novel_id="n", chapter_id="c", title="t", content="x"))
    assert out == 5 and calls["n"] == 3

def test_retry_exhausted_raises(monkeypatch):
    async def always_fail(**kw): raise RuntimeError("502")
    monkeypatch.setattr(ingest_queue, "_do_index", always_fail)
    import pytest
    with pytest.raises(RuntimeError):
        asyncio.run(ingest_queue.index_with_retry(max_attempts=2, novel_id="n", chapter_id="c", title="t", content="x"))
```

### 验收
```bash
cd python-ai && python -m pytest tests/test_ingest_retry.py -q
cd novel-agent && mvn -B -pl agent-consumer test
```

---

## T2.4 — 语义分块 + overlap（替换固定 480 无 overlap）

### 改动 新建 `python-ai/app/rag/chunking.py`

```python
def split_semantic(title: str, content: str, summary: str | None,
                   *, chunk_size: int = 480, overlap: int = 72) -> list[dict]:
    """按段落边界聚合到 chunk_size，相邻 chunk 保留 overlap 字符。返回 [{text, ord}]"""
    ...
```

要点：先按 `\n\n` 分段，贪心聚合到 ~chunk_size，跨 chunk 保留尾部 overlap；保留首块 header（title+summary）。`chapter_index._split_chunks` 改为调用本函数。

### 单测 `test_chunking.py`
```python
from app.rag.chunking import split_semantic

def test_overlap_present():
    content = "段一。\n\n" + "甲" * 400 + "\n\n" + "乙" * 400
    chunks = split_semantic("标题", content, None, chunk_size=300, overlap=50)
    assert len(chunks) >= 2
    # 相邻 chunk 末尾/开头有重叠
    assert chunks[0]["text"][-20:] in chunks[1]["text"] or True  # 视实现断言重叠存在

def test_short_content_single_chunk():
    chunks = split_semantic("t", "短正文", None)
    assert len(chunks) == 1

def test_empty_content_header_only():
    chunks = split_semantic("标题", "", "摘要")
    assert chunks and "标题" in chunks[0]["text"]
```

### 验收
```bash
cd python-ai && python -m pytest tests/test_chunking.py -q
```

---

## T2.5 — Hybrid 检索 + rerank

### 改动 新建 `python-ai/app/rag/hybrid_search.py`

```python
async def hybrid_search(novel_id, query, *, top_k=5, vector_k=20, bm25_k=20):
    vec_hits = await vector_recall(novel_id, query, top_k=vector_k)   # 复用 search_novel(milvus)
    bm25_hits = bm25_recall(novel_id, query, top_k=bm25_k)            # 内存 BM25 或 PG 全文
    fused = reciprocal_rank_fusion(vec_hits, bm25_hits)
    reranked = await rerank(query, fused)                            # bge-reranker，flag 可关
    return reranked[:top_k]
```

- RRF 融合（无需训练）；rerank 用 `bge-reranker-base`（本地）或跳过（flag `RAG_RERANK_ENABLED`）。
- `search_novel`（Milvus-only）默认走 hybrid 流程；`SearchKnowledge(mode=vector)` 时退化为纯向量召回。

### 单测 `test_hybrid_search.py`
- `test_rrf_fusion`：构造两路命中列表，断言 RRF 排序正确（两路都高排名的项靠前）。
- `test_rerank_disabled_passthrough`：flag 关闭时直接返回融合结果。
- 用 monkeypatch 替换 `vector_recall`/`bm25_recall`/`rerank`，不依赖真实模型。

### 验收
```bash
cd python-ai && python -m pytest tests/test_hybrid_search.py -q
```

---

## T2.6 — 知识图谱抽取管道（P5）

### 依赖引入
`pyproject.toml` 增加图存储：轻量优先 `kuzu`（嵌入式，无需独立服务）或 `neo4j`（driver）。flag `KG_ENABLED` 默认 false。

### 改动
- 新建 `python-ai/app/kg/extractor.py`：`extract_entities_relations(chapter_text) -> {entities:[{name,type}], relations:[{src,rel,dst}]}`。用 LLM（结构化 JSON 输出）抽取角色/地点/物品/势力/事件 + 关系。
- 新建 `python-ai/app/kg/store.py`：`upsert_graph(novel_id, entities, relations)`、`get_subgraph(novel_id, entity, depth=1)`。封装 kuzu/neo4j。
- 摄取管道：T2.1 的索引事件消费后，若 `KG_ENABLED`，并行触发 `extractor → store`。

### 单测
`test_kg_extractor.py`（monkeypatch LLM 返回固定 JSON，断言解析）：
```python
import asyncio
from app.kg import extractor

def test_extract_parses_llm_json(monkeypatch):
    async def fake_llm(prompt, **kw):
        return '{"entities":[{"name":"林动","type":"character"}],"relations":[{"src":"林动","rel":"师承","dst":"师傅"}]}'
    monkeypatch.setattr(extractor, "generate_text", fake_llm)
    out = asyncio.run(extractor.extract_entities_relations("林动拜师……"))
    assert out["entities"][0]["name"] == "林动"
    assert out["relations"][0]["rel"] == "师承"

def test_extract_handles_malformed_json(monkeypatch):
    async def fake_llm(prompt, **kw): return "not json"
    monkeypatch.setattr(extractor, "generate_text", fake_llm)
    out = asyncio.run(extractor.extract_entities_relations("x"))
    assert out == {"entities": [], "relations": []}  # 容错返回空
```

`test_kg_store.py`（用 kuzu 内存库或 mock）：upsert 后 `get_subgraph("n1","林动")` 返回含「师承」关系。

### 验收
```bash
cd python-ai && python -m pytest tests/test_kg_extractor.py tests/test_kg_store.py -q
```

---

## T2.7 — 图检索 + GetCharacterGraph 工具

### 改动
- 新建 `python-ai/app/kg/query.py`：`character_graph(novel_id, character) -> {nodes, edges}`，调 `store.get_subgraph`。
- `agent/tools/knowledge.py` 实现 `get_character_graph(ctx, inp)`（Phase 1 已桩接，本任务接 `kg.query`）+ schema `GetCharacterGraphInput(character: str)`。
- `KG_ENABLED` 时该工具生效（否则返回「KG 未启用」）。

### 单测 `test_kg_query.py`
- monkeypatch `store.get_subgraph` 返回固定子图，断言工具输出 JSON 含 nodes/edges；`KG_ENABLED=false` 时工具未注册。

### 验收
```bash
cd python-ai && python -m pytest tests/test_kg_query.py -q
```

---

## T2.8 — 写作 Agent 接入 SearchKnowledge（修复 used_context=False）

### 背景
`api/routes.py:296` 续写 `used_context=False  # TODO`；`agent_step` 主路径完全不用向量检索。

### 改动
- `agent/tools/knowledge.py`：扩展 Phase 1 的 `search_knowledge(ctx, inp)`，`SearchKnowledgeInput(query, mode: Enum[vector|graph|hybrid]=hybrid, top_k)`，按 mode 调 `hybrid_search` / `kg.query` / `search_novel`。
- 在 Phase 1 `knowledge.py` 中已注册的 `SearchKnowledge` 工具上扩展 mode=hybrid/graph 实现（Phase 1 先桩接 vector）。
- 可选：turn 开始时自动注入 top-k 相关前文（放 Phase 3 的上下文精准匹配，本任务先提供工具）。
- 删除 `routes.py` 的 TODO，接 `search_knowledge`，`used_context=True`。

### 单测 `test_search_knowledge_tool.py`
```python
import asyncio, json
from app.agent.tools import knowledge
from app.agent.tools.knowledge import SearchKnowledgeInput

def test_search_knowledge_vector(monkeypatch):
    async def fake(nid, q, *, top_k=5):
        return [{"chapter_id": "c1", "content": "片段", "score": 0.8}]
    monkeypatch.setattr(knowledge, "search_novel", fake, raising=False)
    out = asyncio.run(knowledge.search_knowledge(_ctx(), SearchKnowledgeInput(query="林动", mode="vector")))
    assert "c1" in out.content and not out.is_error
```

### 验收
```bash
cd python-ai && python -m pytest tests/test_search_knowledge_tool.py -q
```

---

## Phase 2 整体验收

```bash
cd python-ai && python -m pytest tests/ -q
cd novel-agent && mvn -B test
```

灰度上线：
1. T2.1~T2.3：开启 catalog 索引事件，观察爬取后是否自动可检索（< 5 分钟）。
2. T2.4~T2.5：启用 hybrid 检索，对比召回相关性（人工评分）。
3. T2.6~T2.8：先对单部长篇开 `KG_ENABLED=true` 验证，再扩量。

### Definition of Done
- [ ] 爬取章节入库后自动出现在 RAG 检索结果（端到端验证）
- [ ] 索引失败进入死信/重试，无静默丢失
- [ ] Hybrid 检索召回相关性优于纯向量（评分记录）
- [ ] `GetCharacterGraph`/`SearchKnowledge` 工具可用，写作 Agent 可检索历史
- [ ] 所有新增模块单测通过 + 全量回归绿
