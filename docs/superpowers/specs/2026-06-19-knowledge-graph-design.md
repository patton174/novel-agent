# 模块 1：知识图谱完善 — 设计文档（册 1）

> 范围：KG 持久化(PG) + 分块抽取+实体合并 + 自动回填 + 模态全图 + 显式错误。
> 本册含 §1 架构 + §2 数据模型 + §3 API；§4–§6 见 [册2](./2026-06-19-knowledge-graph-design-part2.md)。
> 状态：已通过 brainstorming 全部 6 节确认，待用户复核后转 writing-plans。

## 背景与目标

当前 KG 是 python-ai 进程内 dict（`_MemoryGraphStore`，按 novel_id），重启丢失；抽取 8000 字截断（`extractor.py:78` text[:8000]）；实体名精确匹配无合并（`store.py:44` dict key）；错误全链路静默；仅 72px mini 卡无全图页；agent 只读 KG（`GetCharacterGraph` 工具）。

本模块交付：
1. KG 持久化到 PostgreSQL（kg_entity/kg_relation/kg_ingest_error），python 仅抽取、状态全在 PG/Java
2. 分块抽取（8000/块滑窗 1000 重叠）+ 实体名规范化合并（去括号/别名归一）
3. 旧小说自动回填（首次开全图触发，单 novel 锁 + 进度可见 + 可取消）
4. 模态全图（d3-force SVG，可缩放拖拽，节点 type 着色）
5. 显式错误（kg_ingest_error 表 + 前端 status/errorCount/错误列表）

## 现状关键事实

- python `app/kg/store.py` `_MemoryGraphStore._graphs` dict[novel_id]→{entities,relations}，无 TTL/eviction
- 抽取触发：`ingest_queue.index_with_retry` 章节向量索引成功后 `asyncio.create_task(_ingest_kg_background)`，gated by `kg_enabled`(默认 false, `config.py:50`)
- 抽取：`extractor.extract_entities_relations` → `generate_text(_PROMPT.format(text=text[:8000]))`，LLM 输出 JSON entities/relations
- Java `KnowledgeGraphClient.getNovelGraph` GET python `/api/kg/novels/{id}/graph`，返回 raw Map；`AuthNovelController:241` 暴露 `/api/content/auth/novels/{novelId}/knowledge-graph`
- 前端 `KnowledgeGraphMini.tsx` 72px SVG（layoutNodes 圆周布局），`api.getKnowledgeGraph`；无全图页
- agent `GetCharacterGraph` 工具读 `character_graph(novel_id, name)`（内存子图）；`SearchKnowledge` 不涉及 KG
- Milvus 仅 `novel_chapters` RAG 用，KG 不在 Milvus
- 错误：extractor JSON 失败返回空（无日志）；background ingest WARNING 吞；Java client DEBUG 返回空图；前端 catch 丢弃

## §1 架构总览

```
[章节保存] → python ingest_queue → 章节向量索引(Milvus) + KG 抽取(分块+合并)
                                              ↓
                                         POST /internal/kg/ingest-chapter
                                              ↓
                                   Java KgService.upsert → PostgreSQL
                                   kg_entity / kg_relation (按 novel_id)
                                              ↓
[前端 mini 卡 / 模态全图] → Java GET /knowledge-graph → KgService 查 PG
[首次开全图无 KG] → POST /backfill → MQ agent.kg.backfill → worker 遍历章节
                   → 逐章 python /internal/kg/extract → upsert PG → Redis 进度
[抽取失败] → kg_ingest_error 表 + 前端 status=partial/failed + 错误列表
```

### 核心调整
- **存储迁 PG**：python `_MemoryGraphStore` 运行期不再持状态；python 仅抽取（分块+合并+规范化），结果回传 Java upsert PG
- **抽取改造**：分块滑窗 + 实体名规范化合并（去括号/别名），替代 8000 截断 + 精确名
- **回填**：全量重建（先清该 novel KG 再逐章抽取），单 novel Redis 锁防并发，前端进度可见可取消
- **模态全图**：mini 卡点击 → 模态 d3-force SVG，可缩放拖拽
- **显式错误**：kg_ingest_error 落库，端点返回 status/errorCount，前端展示

### 与 RAG 的关系
KG 与章节向量索引共用 `ingest_queue` 触发点（索引成功后 KG 抽取），但写不同存储（Milvus vs PG）。KG 抽取失败不影响向量索引。

## §2 数据模型

### kg_entity（实体，按 novel_id 隔离）
```sql
CREATE TABLE kg_entity (
    id          VARCHAR(36) PRIMARY KEY,
    novel_id    VARCHAR(36) NOT NULL,
    name        VARCHAR(120) NOT NULL,          -- 规范化后名
    type        VARCHAR(32) NOT NULL,           -- character|location|item|faction|event|unknown
    aliases     TEXT,                            -- 被合并的变体原名，逗号分隔
    created_at  TIMESTAMPTZ NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL,
    UNIQUE (novel_id, name)
);
CREATE INDEX idx_kg_entity_novel ON kg_entity (novel_id);
CREATE INDEX idx_kg_entity_novel_type ON kg_entity (novel_id, type);
```
- name 规范化后唯一（per novel）；重复抽取 → ON CONFLICT 更新 type + 追加 aliases

### kg_relation（关系）
```sql
CREATE TABLE kg_relation (
    id          VARCHAR(36) PRIMARY KEY,
    novel_id    VARCHAR(36) NOT NULL,
    src_name    VARCHAR(120) NOT NULL,          -- 规范化后源实体名
    rel         VARCHAR(64) NOT NULL,
    dst_name    VARCHAR(120) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL,
    UNIQUE (novel_id, src_name, rel, dst_name)
);
CREATE INDEX idx_kg_relation_novel ON kg_relation (novel_id);
CREATE INDEX idx_kg_relation_src ON kg_relation (novel_id, src_name);
```
- 软引用实体名（非 FK，避免名变更级联复杂）；重复 ON CONFLICT DO NOTHING

### kg_ingest_error（抽取失败记录）
```sql
CREATE TABLE kg_ingest_error (
    id          BIGSERIAL PRIMARY KEY,
    novel_id    VARCHAR(36) NOT NULL,
    chapter_id  VARCHAR(36),                    -- null=回填全量
    reason      TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_kg_ingest_error_novel ON kg_ingest_error (novel_id);
```

### 回填进度（Redis，不入库）
`kg:backfill:{novelId}` = `{status, total, done, failed}`，TTL 1h；锁 `kg:backfill:lock:{novelId}` SETNX TTL 30min。

### 实体名规范化规则（python `kg/normalize.py`）
1. trim + 去首尾标点
2. 去括号及内容：`林动(少年)`→`林动`
3. 去引号
4. 去所有空白（中文名无空格）
别名 = 规范化前原名（若与规范化后不同则记 aliases）。

## §3 API 契约

### 现有端点（保留，改数据源 + 加字段）
```
GET /api/content/auth/novels/{novelId}/knowledge-graph   (X-User-Id)
  → { enabled, status, nodes:[{id,name,type,aliases?}], edges:[{source,target,rel}], errorCount, note? }
```
- `status`: ok|partial|empty|disabled|failed
- Java `KnowledgeGraphClient` 改查 PG（KgService）

### 新增：自动回填触发
```
POST /api/content/auth/novels/{novelId}/knowledge-graph/backfill   (X-User-Id)
  → 已有 KG 记录 → 200 {status:"exists"}
  → 无 → 发 MQ agent.kg.backfill → 200 {status:"started"}
  → 进行中（Redis 锁） → 409 {status:"in_progress"}
```
前端首次开全图模态时，GET 图谱为 empty 自动调一次。

### 新增：回填进度
```
GET /api/content/auth/novels/{novelId}/knowledge-graph/progress   (X-User-Id)
  → { status: idle|in_progress|done|failed, total, done, failed }   (Redis)
```

### 新增：错误详情
```
GET /api/content/auth/novels/{novelId}/knowledge-graph/errors   (X-User-Id)
  → [{ chapterId?, reason, createdAt }]   (kg_ingest_error 最近 50 条)
```

### python-ai 内网端点（Java→python 抽取）
```
POST /internal/kg/extract   (X-Internal-Service-Key, body: { text, novelId, chapterId? })
  → { entities:[{name,type}], relations:[{src,rel,dst}] }   (分块+合并+规范化后)
  → 失败: { error:"extract_failed", detail }
```
python 仅抽取，不写库。

### Java 内网端点（python→Java upsert）
```
POST /internal/kg/ingest-chapter   (X-Internal-Service-Key, body: { novelId, chapterId, entities, relations })
  → Java KgService.upsert（ON CONFLICT 更新/追加 aliases）→ 200
POST /internal/kg/error   (body: { novelId, chapterId?, reason })
  → 写 kg_ingest_error
GET /internal/kg/character-graph?novelId=&name=   (python GetCharacterGraph 工具用)
  → { nodes, edges }   (PG 子图)
```

### MQ 回填
```
MqTopic.KG_BACKFILL = agent.kg.backfill.exchange / kg.backfill / agent.kg.backfill.queue
KgBackfillMessage: { novelId, userId }
KgBackfillListener (worker):
  1. Redis SETNX 锁
  2. 查该 novel 全部章节（ChapterService）
  3. 先清该 novel KG（DELETE WHERE novel_id=）—— 全量重建
  4. 逐章调 python /internal/kg/extract → upsert PG → 更新 Redis 进度
  5. 完成 → Redis status=done；释放锁
```

### 章节增量抽取（ingest_queue 改造）
python `_ingest_kg_background` 改调 Java `POST /internal/kg/ingest-chapter`（带 novelId/chapterId/entities/relations），不再写内存 dict。错误经 `/internal/kg/error` 写 kg_ingest_error。

### 鉴权
- `/api/content/auth/...`：X-User-Id + novel own 校验（`novelService.getNovel`）
- `/internal/kg/*`：X-Internal-Service-Key

---
§4 抽取改造 + §5 前端 + §6 收尾 见 [册2](./2026-06-19-knowledge-graph-design-part2.md)。
