# 模块 1：知识图谱完善 — 实现计划（主索引）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> 本计划按层拆为 4 个分册（每文件 ~300 行）：
> 1. [part1-java](./2026-06-19-knowledge-graph-part1-java.md) — Java 持久化（迁移/实体/KgService/内网端点/图谱端点改 PG）
> 2. [part2-java-backfill](./2026-06-19-knowledge-graph-part2-java-backfill.md) — Java 回填（MQ/Listener/进度/错误端点）
> 3. [part3-python](./2026-06-19-knowledge-graph-part3-python.md) — python 抽取改造（分块/规范化/合并）+ ingest_queue 改走 Java + /internal/kg/extract
> 4. [part4-frontend](./2026-06-19-knowledge-graph-part4-frontend.md) — 前端（模态全图 d3-force + mini 卡改造 + API/i18n）
>
> 设计文档：[册1](../specs/2026-06-19-knowledge-graph-design.md) / [册2](../specs/2026-06-19-knowledge-graph-design-part2.md)

**Goal:** KG 持久化到 PostgreSQL，python 仅做分块抽取+实体规范化合并（结果回传 Java upsert PG），旧小说首次开图自动回填，模态全图可缩放拖拽，抽取失败显式可见。

**Architecture:** python `ingest_queue._ingest_kg_background` 改为调 Java `POST /internal/kg/ingest-chapter`（不再写内存 dict）；Java `KgService` upsert `kg_entity/kg_relation`（ON CONFLICT 更新 type+aliases）；旧小说回填走 MQ `agent.kg.backfill` → worker 逐章调 python `/internal/kg/extract` → 回写 PG + Redis 进度；前端 mini 卡点击弹 d3-force 模态全图。

**Tech Stack:** Java 21 / Spring Boot / JPA / Flyway / RabbitMQ / Redis；python-ai FastAPI / httpx（复用 content_api）；前端 React+TS / d3-force（新依赖）/ SVG。

---

## 关键集成事实（来自 codebase 勘察）

1. **python→Java 内网 POST 已有 helper**：`app/agent/backend/content_api.py` 的 `content_internal_url(path)` + `internal_headers()`，`settings.content_base_url`(default :8080) + `settings.internal_service_key`。
2. **`/internal/**` 自动鉴权**：`InternalApiWebConfig` 注册 `InternalServiceKeyInterceptor` 于 `/internal/**`，新端点无需 per-method key 检查。
3. **Java 章节源**（回填用）：`chapterRepository.findByNovelIdOrderedWithVolumes(novelId)` → `ChapterService.toDto` → `ChapterDTO`(含 id/title/content)。先例见 `ChapterService.reindexNovel`(`:424`)。
4. **图谱读路径**：`KnowledgeGraphClient.getNovelGraph`(GET python) → `AuthNovelBiz.knowledgeGraph`(`:158`) → `AuthNovelController GET /{novelId}/knowledge-graph`(`:241`) → 前端 `api.getKnowledgeGraph`(`api.ts:437`) → `KnowledgeGraphMini`。
5. **MQ 模式**：`MqTopic` 枚举(exchange,routingKey,queue) + `MQInitializerConfig` 自动声明 + `@RabbitListener(queuesToDeclare=@Queue(name=...,durable="true"))` + `MqListenerSupport.safeHandle` + `IMessageProducer.send`。
6. **python 抽取现状**：`extractor.extract_entities_relations` `text[:8000]` 截断；`store._MemoryGraphStore` 内存 dict；`pipeline.ingest_chapter_kg` 调 upsert_graph；`_ingest_kg_background` 只收 novel_id+content（call site 有 chapter_id 可传）。
7. **d3-force 未安装**：package.json 无 d3/d3-force；模态全图需 `npm i d3-force`（+ `@types/d3-force`）。
8. **前端 api helper**：`api.request<T>(endpoint, options)` 用 `secureFetch`+`parseResultResponse`，baseUrl `/api`。

## 文件结构总览

### Java（novel-studio）
| 文件 | 职责 | 动作 |
|------|------|------|
| `studio-module-content/.../db/migration/V17__knowledge_graph.sql` | 建表 | Create |
| `.../entity/{KgEntityEntity,KgRelationEntity,KgIngestErrorEntity}` | 实体 | Create |
| `.../repository/{KgEntityRepository,KgRelationRepository,KgIngestErrorRepository}` | Repos | Create |
| `.../service/KgService.java` | upsert/查询/子图/错误/清空 | Create |
| `.../service/KgBackfillService.java` | 回填编排(锁/进度/逐章) | Create |
| `.../controller/internal/InternalKgController.java` | /internal/kg/ingest-chapter+/character-graph+/error | Create |
| `.../controller/auth/AuthNovelController.java` | 加 backfill/progress/errors 端点 | Modify |
| `.../service/auth/biz/AuthNovelBiz.java` | 加 backfill/progress/errors 方法 | Modify |
| `.../service/KnowledgeGraphClient.java` | 改查 PG(KgService) | Modify |
| `studio-platform-messaging/.../constant/MqTopic.java` | KG_BACKFILL 枚举 | Modify |
| `studio-platform-messaging/.../kg/KgBackfillMessage.java` | MQ 消息 record | Create |
| `studio-module-worker/.../listener/KgBackfillListener.java` | 消费回填 | Create |

### python-ai
| 文件 | 职责 | 动作 |
|------|------|------|
| `app/kg/normalize.py` | 规范化+合并 | Create |
| `app/kg/extractor.py` | 分块抽取 | Modify |
| `app/kg/pipeline.py` | 改调 Java /internal/kg/ingest-chapter | Modify |
| `app/rag/ingest_queue.py` | _ingest_kg_background 传 chapter_id | Modify |
| `app/kg/query.py` | 改 HTTP 调 Java 子图 | Modify |
| `app/api/kg_routes.py` | 加 /internal/kg/extract | Modify |
| `tests/test_kg_normalize.py`/`test_kg_extract.py` | 单测 | Create |

### 前端
| 文件 | 职责 | 动作 |
|------|------|------|
| `src/components/agent/KnowledgeGraphModal.tsx` | d3-force 模态全图 | Create |
| `src/components/agent/KnowledgeGraphMini.tsx` | 点击开模态+状态点 | Modify |
| `src/utils/api.ts` | 加 backfill/progress/errors | Modify |
| `src/i18n/locales/{zh,en}/editor.json` | knowledgeGraph.* 文案 | Modify |
| `package.json` | d3-force 依赖 | Modify |

## 任务索引

### Part 1 — Java 持久化（[part1](./2026-06-19-knowledge-graph-part1-java.md)）
- T1: V17 迁移
- T2: KgEntityEntity + Repo
- T3: KgRelationEntity + KgIngestErrorEntity + Repos
- T4: KgService（upsert/查询/子图/错误/清空）
- T5: InternalKgController（/internal/kg/ingest-chapter+/character-graph+/error）
- T6: KnowledgeGraphClient 改查 PG + 端点加 status/errorCount

### Part 2 — Java 回填（[part2](./2026-06-19-knowledge-graph-part2-java-backfill.md)）
- T7: MqTopic.KG_BACKFILL + KgBackfillMessage
- T8: KgBackfillService（锁/进度/逐章编排）
- T9: KgBackfillListener（消费 MQ）
- T10: Auth 端点 backfill/progress/errors + AuthNovelBiz

### Part 3 — python 抽取改造（[part3](./2026-06-19-knowledge-graph-part3-python.md)）
- T11: normalize.py（规范化+合并）
- T12: extractor 分块抽取
- T13: /internal/kg/extract 端点
- T14: ingest_queue + pipeline 改走 Java
- T15: query.py 改 HTTP 调 Java 子图

### Part 4 — 前端（[part4](./2026-06-19-knowledge-graph-part4-frontend.md)）
- T16: d3-force 依赖 + api 扩展
- T17: KnowledgeGraphModal（d3-force SVG）
- T18: KnowledgeGraphMini 改造（点击+状态点）
- T19: i18n + 端到端验证

## 执行约定
- **TDD**：每任务先写失败测试→跑红→实现→跑绿→提交。
- **频繁提交**：每任务一提交，前缀 `feat(kg):`。
- **Java**：`JAVA_HOME=/d/Programs/Java/jdk_21 mvn -pl <module> -am test`。
- **python**：`cd python-ai && python -m pytest tests/test_kg_*.py -q`。
- **前端**：`cd frontend && npx vitest run`；`npx tsc --noEmit`。
- **本地验证**：`scripts/_restart-dev-stack.ps1`（CN 中间件）。
- **执行顺序**：part1(T1-T6) → part3(T11-T15，python 抽取先行供回填调) → part2(T7-T10) → part4(T16-T19)。或 part1→part2→part3→part4 亦可（回填 listener 调 python /internal/kg/extract，故 T13 须在 T9 前或同步）。
