# P0 补全 — 书库 RAG 剩余任务

> 主索引：[2026-06-26-agent-platform-roadmap-index.md](./2026-06-26-agent-platform-roadmap-index.md)  
> 基础任务 T1–T15 见 [2026-06-19-library.md](./2026-06-19-library.md)（**已实现**）  
> 设计：[2026-06-19-library-design.md](../specs/2026-06-19-library-design.md)

**Goal:** 补齐 P0 产品闭环：索引状态语义统一、SearchKnowledge 智能 hint、MyLibrary 徽章、token 预算、E2E 验收。

---

## Task P0-G1: SearchKnowledge 按 index_status 返回 hint

**Files:**
- Modify: `python-ai/app/agent/tools/knowledge.py`
- Modify: `python-ai/app/agent/tools/schemas.py`（若需扩展 response 文档）
- Create: `python-ai/tests/test_search_knowledge_index_hint.py`

- [ ] **Step 1: 写失败测试**

```python
# test_search_knowledge_index_hint.py
async def test_book_scope_indexing_returns_hint():
    ctx = make_ctx(referenced_books=[{
        "catalogNovelId": "abc",
        "namespace": "library:1:abc",
        "indexStatus": "indexing",
    }])
    result = await search_knowledge(ctx, SearchKnowledgeInput(query="风格", scope="book:abc"))
    payload = json.loads(result.content)
    assert payload["status"] == "indexing"
    assert "索引" in payload.get("hint", "")
```

- [ ] **Step 2: 实现 indexing / failed / not_in_library 分支**

在 `search_knowledge` 中，`scope=book:` 解析后：

1. 从 `ctx.referenced_books` 取 `indexStatus`（兼容 snake/camel）
2. 若 `indexing` 或 `pending` → 不查 Milvus，返回 `{hits:[], status:"indexing", hint:"参考书正在索引，请稍后重试 SearchKnowledge 或先阅读章节目录。"}`
3. 若 `failed` → `{status:"index_failed", hint:"索引失败，请在书库页重试索引。"}`
4. 若 namespace 找不到 → `{status:"not_in_library", hint:"该书未在当前对话 @ 引用列表中。"}`
5. 仅 `indexed`（或 `ready`，见 G2）时走 `search_novel`

- [ ] **Step 3: 跑测试**

```bash
cd python-ai && python -m pytest tests/test_search_knowledge_index_hint.py -q
```

- [ ] **Step 4: 提交**

```bash
git add python-ai/app/agent/tools/knowledge.py python-ai/tests/test_search_knowledge_index_hint.py
git commit -m "feat(library): SearchKnowledge book scope index_status hints"
```

---

## Task P0-G2: index_status 枚举统一

**Files:**
- Modify: `novel-studio/.../LibraryIndexListener.java`（确认写入值）
- Modify: `novel-studio/.../CatalogService.java`（updateIndexStatus）
- Modify: `frontend/src/components/editor/ReferenceBookPicker.tsx`
- Modify: `frontend/src/pages/dashboard/bookstore/` 或 `MyLibraryPage` 相关组件
- Create: `novel-studio/.../catalog/IndexStatus.java`（enum 常量类）

- [ ] **Step 1: 定义枚举**

```java
public enum IndexStatus {
    PENDING, INDEXING, INDEXED, FAILED;
    public String wire() { return name().toLowerCase(); }
}
```

统一全链路使用：`pending | indexing | indexed | failed`（**废弃** `ready`；若 DB 有 legacy `ready`，CatalogService 读时 map 为 `indexed`）。

- [ ] **Step 2: LibraryIndexListener 写入 INDEXED/FAILED/INDEXING**

检查 `updateIndexStatus` 调用点，确保开始索引设 `indexing`，成功 `indexed`，异常 `failed`。

- [ ] **Step 3: 前端 badge 映射**

`ReferenceBookPicker` + MyLibrary 表格：`indexed`→✓、`indexing`→⏳、`failed`→⚠、`pending`→○

- [ ] **Step 4: 单测 CatalogService map ready→indexed**

- [ ] **Step 5: 提交**

```bash
git commit -m "feat(library): unify index_status enum indexed vs ready"
```

---

## Task P0-G3: MyLibraryPage 完整索引徽章 + 重试

**Files:**
- Modify: `frontend/src/pages/dashboard/bookstore/` 或 `MyLibraryPage.tsx`（以实际路径为准）
- Modify: `frontend/src/api/libraryApi.ts`（加 `retryLibraryIndex(catalogNovelId)`）
- Modify: `novel-studio/.../AuthCatalogController.java`（`POST /my-library/{id}/reindex`）
- Modify: `novel-studio/.../CatalogService.java`（发 LIBRARY_INDEX MQ）

- [ ] **Step 1: 后端 reindex 端点**

权限：owner 或收藏者；仅 `failed|pending` 可触发；发 `LibraryIndexMessage`。

- [ ] **Step 2: 前端表格列 IndexStatusBadge**

复用小组件 `IndexStatusBadge.tsx`（Create），MyLibrary + ReferenceBookPicker 共用。

- [ ] **Step 3: failed 行显示「重试索引」按钮**

- [ ] **Step 4: i18n**

`dashboard:library.indexStatus.*`、`dashboard:library.reindex`

- [ ] **Step 5: 提交**

---

## Task P0-G4: Feature flag VITE_FEATURE_LIBRARY_REF

**Files:**
- Modify: `frontend/.env.example`
- Modify: `frontend/src/components/chat/ChatComposer.tsx`
- Modify: `frontend/vite.config.ts`（define 可选）

- [ ] **Step 1: 环境变量**

`VITE_FEATURE_LIBRARY_REF=true`（dev 默认 true；prod 灰度）

- [ ] **Step 2: ChatComposer 条件渲染 @ 触发与 chips**

flag false 时隐藏 `@` 与 referencedBooks UI；stream 仍兼容空数组。

- [ ] **Step 3: 提交**

---

## Task P0-G5: E2E 验收脚本与清单

**Files:**
- Create: `python-ai/tests/e2e/test_library_rag_flow.py`（mock Milvus 可选）
- Modify: `docs/superpowers/plans/2026-06-26-agent-platform-p0-rag-gaps.md`（本文件末尾 checklist）

- [ ] **Step 1: 集成测试（Java Assembler）**

已有则补：`AgentContextAssemblerTest` 注入 2 本参考书、skip 无权限。

- [ ] **Step 2: run_context 测试**

`test_library_run_context.py` 断言 token 预算（G8）。

- [ ] **Step 3: 手工 staging 清单**

| # | 步骤 | 期望 |
|---|------|------|
| 1 | 上传私人书 | index_status→indexing→indexed |
| 2 | 编辑器 @ 该书 | chip 显示 ✓ |
| 3 | 问「参考这本书的开篇风格」 | Agent 调 SearchKnowledge scope=book: |
| 4 | 索引中 @ 书 | hint indexing |
| 5 | 英文 UI | editor:reference.* 翻译正确 |

- [ ] **Step 4: 提交**

---

## Task P0-G6: 文档同步 AGENT_TOOLS.md

**Files:**
- Modify: `docs/AGENT_TOOLS.md`

- [ ] **Step 1: SearchKnowledge 增加 scope 参数表**

| 参数 | 值 | 说明 |
|------|-----|------|
| scope | null | 当前小说 novel_id |
| scope | book:\<catalogNovelId\> | 参考书 namespace |

- [ ] **Step 2: referenced_books stream body 示例**

- [ ] **Step 3: 提交**

---

## Task P0-G7: Admin 索引失败批量重试（可选 P0.5）

**Files:**
- Modify: `frontend/src/pages/admin/` 书库管理页（若已有 catalog admin）
- Modify: `novel-studio/.../admin/CatalogAdminController.java`

- [ ] **Step 1: Admin GET catalog?index_status=failed**

- [ ] **Step 2: POST bulk-reindex**

- [ ] **Step 3: 审计日志**

- [ ] **Step 4: 提交**（可延后至 P0.5）

---

## Task P0-G8: referenced_books token 预算截断

**Files:**
- Modify: `python-ai/app/agent/context/prompting/run_context.py`
- Modify: `novel-studio/.../AgentContextAssembler.java`（Java 侧预截断 summary）
- Create: `python-ai/tests/test_library_token_budget.py`

- [ ] **Step 1: 常量**

```python
LIBRARY_BLOCK_MAX_CHARS = 6000  # ~1500 tokens
MAX_CHAPTER_TITLES = 80
SUMMARY_MAX_CHARS = 800
```

- [ ] **Step 2: run_context 渲染时**

每本书 summary truncate；chapterTitles 超 80 条截断 + `…(+N more)`；总 block 超 6000 字符截断最后一本。

- [ ] **Step 3: Assembler 侧 summary 预截断 800**（减少传输）

- [ ] **Step 4: 测试**

- [ ] **Step 5: 提交**

---

## P0 完成定义（DoD）

- [ ] P0-G1–G8 全部 checkbox
- [ ] staging 手工清单 5 项通过
- [ ] `deploy-python-ai` + `deploy-novel-studio` + `deploy-frontend` 绿
