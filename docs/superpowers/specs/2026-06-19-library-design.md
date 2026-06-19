# 模块 4：书库配置（参考语料 RAG）— 设计文档（册 1）

> 范围：在模块 5（上传+解析+我的书库）之上补 RAG 检索——书库书解析后自动索引到 Milvus（私人/公共分命名空间）+ LLM 生成摘要 + 聊天区 @引用注入目录 + agent SearchKnowledge 按需检索该书片段。
> 不做：全局自动检索、小说挂载参考书、公共书重建索引。
> 本册含 §1 架构 + §2 数据模型 + §3 API；§4–§6 见 [册2](./2026-06-19-library-design-part2.md)。
> 依赖：模块 5（上传/解析/catalog owner/我的书库）已实现。
> 状态：已通过 brainstorming 全部 6 节确认，待用户复核后转 writing-plans。

## 背景与目标

模块 5 交付上传+解析+我的书库（收藏/上传），但明确不做 RAG（"留模块 1/4"）。现 RAG 仅索引用户小说自身章节（`novel_chapters` collection，`novel_id=<novelId>`），catalog 已索引到 `catalog:<id>` 命名空间但 agent 检索面硬限 `ctx.novel_id`，**够不着**（死端索引）。无书库书→agent 检索的通路。

本模块交付：
1. 私人上传书解析后自动索引到 `library:<userId>:<catalogNovelId>` 命名空间；公共书复用 `catalog:<id>`（不重建）
2. LLM 生成全书摘要写回 `crawl_catalog_novel.description`
3. 聊天区 @引用书库书 → 注入参考书目（user_message 保持原样，【书名】仅用户标记；参考书目作为 context 独立字段渲染到 system prompt 区块）
4. agent SearchKnowledge 扩展支持 `scope=book:<catalogNovelId>` 检索该书命名空间片段

## 现状关键事实

- Milvus 单 collection `novel_chapters`，schema `chunk_id/novel_id/chapter_id/title/text/embedding`（`chapter_index.py:15`）；`index_chapter(novel_id=...)` 接受任意字符串
- `CatalogIndexListener`（worker）已把公共书章节索引到 `novel_id=catalog:<id>`（`CatalogIndexListener.java:82`）——已索引但 agent 够不着
- `SearchKnowledge`（`knowledge.py:22`）仅 `search_novel(ctx.novel_id)`；`inject_relevant_context`（`relevance.py:23`）同
- `crawl_catalog_novel` 无 index_status/index_namespace 列；`description` 列已有（存简介）
- 模块5 已设计 `user_library_collection`(user_id, catalog_novel_id) + `crawl_catalog_novel`(owner_id/source/uploader_file_id)——本模块在其上
- `AgentRunContextDto`（record, snake_case）+ python `AgentRunContext`（pydantic）4 层镜像
- embedding 配置模块3 已动态化（ModelRegistry）

## §1 架构总览

```
[上传解析成功] → Java 写 crawl_catalog_*（模块5）→ MQ LIBRARY_INDEX（仅私人书）
                                                    ↓
                                            LibraryIndexListener (worker)
                                            ├ 逐章 POST python /api/rag/index/chapter
                                            │  (novel_id=library:<uid>:<id>)
                                            ├ python /internal/library/summarize → 生成摘要
                                            ├ POST Java /internal/catalog/{id}/summary 回写 description
                                            └ index_status=indexed
[公共书] → 现有 CATALOG_INDEX（catalog:<id>，已索引，不重建）

[聊天区 @引用] → ReferenceBookPicker 选「我的书库」书 → 输入框插【书名】+ 记录 referencedBooks
   ↓ 发消息（user_message 原样，【】仅标记）
Java AgentContextAssembler → 取每本 description(摘要)+章节标题 → context.referenced_books
   ↓
python agent loop → 参考书目渲染到 system prompt 独立区块（不污染 user_message）
   ↓
agent 需细节 → SearchKnowledge(scope=book:<id>) 检索该书命名空间片段
   (私人 library:<uid>:<id>；公共 catalog:<id>)
```

### 核心
- **索引扩展**：私人书解析后 MQ `LIBRARY_INDEX` 触发逐章索引到 `library:<uid>:<id>`；公共书复用 `catalog:<id>`（不重建）。复用 `novel_chapters` collection，无新 collection
- **摘要生成**：python `/internal/library/summarize`（输入章节标题+首段，非全文）→ 回写 `description`
- **@引用注入**：user_message 不动（【书名】仅用户标记）；referenced_books 作 context 独立字段，渲染到 system prompt 区块
- **SearchKnowledge 扩展**：加 `scope` 参数，`scope=book:<id>` 时从 `ctx.referenced_books` 取该书的 namespace 检索

## §2 数据模型

### 模块5 已建（依赖，不重复）
`crawl_catalog_novel`(owner_id/source/uploader_file_id)、`crawl_catalog_chapter`、`user_library_collection`、`uploaded_file`。

### 扩展 crawl_catalog_novel（索引状态）
```sql
ALTER TABLE crawl_catalog_novel ADD COLUMN IF NOT EXISTS index_status VARCHAR(16) NOT NULL DEFAULT 'pending';
-- pending | indexing | indexed | failed
ALTER TABLE crawl_catalog_novel ADD COLUMN IF NOT EXISTS index_namespace VARCHAR(64);
-- library:<uid>:<id>（私人）| catalog:<id>（公共，复用）| null
```
- 私人上传书：`index_namespace = library:<uid>:<id>`
- 公共书：`index_namespace = catalog:<id>`（CATALOG_INDEX 已索引时置 indexed）
- `description`（现有列）存 LLM 摘要

### Milvus 命名空间（无新 collection）
复用 `novel_chapters`，靠 `novel_id` 字段区分：
- 用户小说章节：`novel_id = <novelId>`
- 公共书：`novel_id = catalog:<catalogNovelId>`（现有）
- 私人书：`novel_id = library:<userId>:<catalogNovelId>`（新）
无 schema 变更，`index_chapter(novel_id=...)` 已支持任意字符串。

### Run context 扩展（运行时，非持久化）
`AgentRunContextDto` 加 `referenced_books: [{catalogNovelId, title, summary, chapterTitles[], namespace}]`。Java 从 `crawl_catalog_novel`(description) + `crawl_catalog_chapter`(title) 组装。不入库，随 run 传递。

### 无新表
本模块纯增量字段 + Milvus 命名空间复用 + 运行时 context。

## §3 API 契约

### 现有端点（模块5 已设计，复用）
```
GET  /api/content/auth/catalog/my-library          我的书库列表
POST /api/content/auth/catalog/{id}/collect        收藏公共书
```

### 新增：@引用候选列表
```
GET /api/content/auth/catalog/my-library/selectable?query=
  → [{ catalogNovelId, title, author, summary, chapterCount, indexStatus, source }]
```

### 引用书详情（Java 内部组装，无端点）
`AgentContextAssembler` 解析 RunRequest.referencedBooks → `CatalogService.getReferencedBook(catalogNovelId, userId)`：
```
→ { catalogNovelId, title, summary(description), chapterTitles:[...], namespace, indexStatus }
（own 校验：私人书 owner_id=userId 或 user_library_collection 命中；公共书任意）
```

### Run 时透传
`AgentStreamRequest` 加 `referencedBooks: [{catalogNovelId}]`（前端 @选择后传）。
`AgentRunContextDto` 加 `referenced_books: [{catalogNovelId, title, summary, chapterTitles[], namespace}]`（Java 组装后透传 python）。

### python-ai 内网端点
```
POST /internal/catalog/{catalogNovelId}/summary   (X-Internal-Service-Key, body: { summary })
  → Java 写 crawl_catalog_novel.description
POST /api/rag/index/chapter                       (现有，复用，novel_id=library:<uid>:<id>)
POST /internal/library/summarize                  (Java→python 生成摘要)
```

### MQ 索引触发
```
MqTopic.LIBRARY_INDEX = agent.library-index.exchange / library.index / agent.library-index.queue
LibraryIndexMessage: { catalogNovelId, userId, namespace }
LibraryIndexListener (worker):
  1. 逐章 POST python /api/rag/index/chapter (novel_id=namespace, chapter_id, title, content)
  2. 全部索引完 → index_status=indexed
  3. python 生成摘要 → POST Java /internal/catalog/{id}/summary
  4. 失败 → index_status=failed
```
公共书不触发 LIBRARY_INDEX（CATALOG_INDEX 已索引）。

### 鉴权
- `/api/content/auth/catalog/*`：X-User-Id + 收藏/own 校验
- `/internal/catalog/*` + `/internal/library/*`：X-Internal-Service-Key

---
§4 索引/检索 + §5 前端 + §6 收尾 见 [册2](./2026-06-19-library-design-part2.md)。
