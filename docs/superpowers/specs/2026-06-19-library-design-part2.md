# 模块 4：书库配置（参考语料 RAG）— 设计文档（册 2）

> 本册含 §4 索引/检索 + §5 前端 + §6 收尾；§1–§3 见 [册1](./2026-06-19-library-design.md)。

## §4 python-ai 索引 + 摘要 + 检索扩展

### 私人书索引（LIBRARY_INDEX 消费）
`LibraryIndexListener`（worker）逐章调 `POST /api/rag/index/chapter`（现有 `index_with_retry`），`novel_id = library:<userId>:<catalogNovelId>`。复用现有 Milvus `novel_chapters` collection，无新 collection。

### 摘要生成
python 新端点 `POST /internal/library/summarize`（Java LIBRARY_INDEX listener 调）：
```python
@internal_router.post("/library/summarize")
async def summarize_book(body, x_internal_service_key=Header(...)):
    _verify_internal_key(x_internal_service_key)
    # body: { catalogNovelId, chapterTitles:[...], firstChunks:[...] }
    summary = await generate_text(_SUMMARY_PROMPT.format(...), system_message=_SUMMARY_SYSTEM)
    return {"summary": summary}
```
Java listener 收到 summary → `POST /internal/catalog/{id}/summary` 回写 description。摘要 LLM 用 default profile；输入=章节标题列表 + 每章首段，避免全文入 prompt。

### SearchKnowledge 扩展
现 `search_knowledge(ctx, inp)` 调 `search_novel(ctx.novel_id, query)`。扩展支持 referenced book 命名空间：
```python
async def search_knowledge(ctx, inp):
    # inp 新增 scope 字段（可选）: "novel" | "book:<catalogNovelId>"
    if inp.scope and inp.scope.startswith("book:"):
        catalog_id = inp.scope[5:]
        namespace = resolve_book_namespace(ctx, catalog_id)  # 从 ctx.referenced_books 取
        results = search_novel(namespace, inp.query, top_k=inp.top_k, mode="hybrid")
    else:
        results = search_novel(ctx.novel_id, inp.query, top_k=inp.top_k, mode="hybrid")
    return ToolCallResult(...)
```
`SearchKnowledgeInput` 加 `scope: str | None = None`。
`resolve_book_namespace(ctx, catalog_id)`：从 `ctx.referenced_books` 取该 catalogNovelId 的 namespace（已在 context，无需查 Java）。

### inject_relevant_context（不改）
仍只搜 `ctx.novel_id`（用户小说自身章节）。referenced_books 目录/摘要已注入 system prompt，agent 主动用 SearchKnowledge(scope=book:) 按需检索。两段式。

### prompt 注入（参考书目独立字段，不污染 user_message）
**user_message**：保持原样，@引用处用户用【书名】标记，Java 不解析【】（以 referencedBooks 数组为准），user_message 不展开内容。

**参考书目独立字段**：AgentRunContext 加 `referenced_books`，渲染到 system prompt 独立区块：
```
【系统提示词】
... 原系统提示 ...

【参考书目】（用户 @引用，可用 SearchKnowledge 工具 scope=book:<catalogNovelId> 检索细节）
1. 《凡人修仙传》
   摘要：...
   目录：第1章 七玄入山 / 第2章 ...
```
`run_context.py` 渲染 context 时，若有 `referenced_books`，加该区块。

## §5 前端

### 聊天区 @引用选择器 ReferenceBookPicker.tsx
- 输入框打 `@` 触发弹出（仿 @mention）
- 列「我的书库」中书（调 `/my-library/selectable?query=`），搜索过滤
- 选中后插入 `【书名】` 到输入框文本 + 记录 `referencedBooks: [{catalogNovelId}]`
- 输入框上方显示已引用书徽章（可移除）

### 「我的书库」页（模块5 已设计）加索引状态
- 每书显示索引徽章（pending/indexing/indexed/failed）
- 私人上传书解析后自动索引，状态复用模块5 解析进度轮询

### 发送消息带 referencedBooks
- `AgentStreamRequest` body 加 `referencedBooks: [{catalogNovelId}]`
- secureFetch 发消息时带上

### API client 扩展
`libraryApi.ts`：
```ts
fetchSelectableBooks(query?)   // GET /my-library/selectable?query=
```

### 最小可视路径
1. 用户在"我的书库"上传一本书 → 解析 → 自动索引（状态 indexed）+ 生成摘要
2. 聊天区打 `@` → 弹出书库书 → 选《凡人修仙传》→ 输入框插【凡人修仙传】+ 徽章
3. 发消息"参考【凡人修仙传】写一段" → RunRequest 带 referencedBooks
4. agent 见参考书目区块（摘要+目录）→ 调 SearchKnowledge(scope=book:xxx) 检索片段 → 续写

## §6 安全 / 测试 / 迁移 / 文件清单 / 边界

### 安全与限制
- **鉴权**：`/api/content/auth/catalog/*` 走 X-User-Id + 收藏/own 校验；`/internal/catalog/*`+`/internal/library/*` 走 X-Internal-Service-Key
- **@引用校验**：Java 解析 referencedBooks 时校验每本书对用户可访问（私人书 owner_id=userId 或 user_library_collection 命中；公共书任意）——防注入他人私人书
- **命名空间隔离**：私人书 `library:<uid>:<id>`，他人无法检索（SearchKnowledge scope=book: 时 namespace 取自 ctx.referenced_books，已 own 校验过）
- **摘要 LLM 耗量**：每本私人书解析后一次摘要调用（输入仅标题+首段，非全文）
- **索引耗 embedding**：私人书逐章索引，长书耗量——自动进行（用户上传即预期）

### DB 迁移（V19__library_index.sql，content 模块）
- `crawl_catalog_novel` 加 `index_status`(default pending) + `index_namespace` 列
- 注：模块5 的 V15 已加 owner_id/source/uploader_file_id；本迁移在其后

### 配置项
- `LIBRARY_SUMMARY_ENABLED`（python，默认 true）—— 是否生成摘要
- 复用 `RAG_EMBED_*`（embedding 模型，模块3 已动态化）

### 测试
- **Java**：`CatalogService.getReferencedBook` own 校验 + 组装（summary+chapterTitles）单测；`AgentContextAssembler` referenced_books 注入单测；`LibraryIndexListener` 逐章索引+摘要回写单测
- **python**：`/internal/library/summarize` 端点单测（mock LLM）；`search_knowledge` scope=book: 走 referenced_books namespace 单测；`resolve_book_namespace` 单测
- **集成**：上传书→索引+摘要→@引用→发消息→agent SearchKnowledge 检索该书片段

### 关键文件清单

**Java（novel-studio）**
- `studio-module-content`：`CrawlCatalogNovelEntity` 加 indexStatus/indexNamespace、`CatalogService.getReferencedBook`+`updateIndexStatus`+`updateSummary`、`controller/internal/InternalCatalogController`(/internal/catalog/{id}/summary)、`service/LibraryIndexService`+`LibraryIndexListener`(worker)、`MqTopic.LIBRARY_INDEX`+`LibraryIndexMessage`、`AgentContextAssembler` 注入 referenced_books、`AgentRunContextDto` 加 referenced_books、`AgentStreamRequest` 加 referencedBooks、`controller/auth/AuthCatalogController` 加 /my-library/selectable
- 迁移 `V19__library_index.sql`

**python-ai**
- `app/api/library_routes.py`（/internal/library/summarize）
- `app/agent/tools/knowledge.py` SearchKnowledge 加 scope
- `app/agent/tools/schemas.py` SearchKnowledgeInput 加 scope
- `app/agent/schemas.py` AgentRunContext 加 referenced_books
- `app/agent/context/prompting/run_context.py` 渲染参考书目区块
- `app/main.py` 注册 library_routes

**前端**
- `src/components/editor/ReferenceBookPicker.tsx`（@mention 选择器）
- `src/pages/dashboard/MyLibraryPage.tsx` 加索引徽章（模块5 页面）
- `src/api/libraryApi.ts`（fetchSelectableBooks）
- 聊天输入框接入 picker + 发送带 referencedBooks
- i18n `editor:reference.*`

### 范围边界（YAGNI，本模块不做）
- ❌ 全局自动检索书库（仅 @引用主动注入）
- ❌ 小说挂载参考书（仅 @引用，无持久挂载关系）
- ❌ 跨用户共享私人书
- ❌ 书库书全文检索 UI（仅 agent SearchKnowledge 用）
- ❌ 摘要重新生成/编辑
- ❌ 公共书重建索引（复用 catalog:）

### 风险与备注
- **模块5 依赖**：本模块建立在模块5（upload/parse/catalog owner/我的书库）已实现之上；若模块5 未实现，本模块无法独立运行。执行顺序：模块5 → 模块4
- **命名空间碰撞**：`library:<uid>:<id>` 中 uid 确保私人隔离；`catalog:<id>` 公共。SearchKnowledge 严格按 referenced_books 的 namespace 检索，不跨 namespace
- **摘要质量**：仅基于标题+首段，可能不全；agent 可用 SearchKnowledge 补充细节
- **索引失败**：私人书索引失败（embedding 服务不可用）→ index_status=failed，@引用仍可注入目录（章标题），但 SearchKnowledge 检索不到片段——前端提示"索引失败，仅目录可用"
- **@解析**：user_message 中【书名】仅用户标记，Java 不解析【】匹配书——以 referencedBooks 数组为准（picker 选定时记录），避免【】文本歧义
