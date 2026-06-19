# Part 3 — python 摘要 + 检索扩展实现计划

> 主索引：[2026-06-19-library.md](./2026-06-19-library.md) ｜ [Part 2](./2026-06-19-library-part2-java-context.md)
> 设计：[册2 §4](../specs/2026-06-19-library-design-part2.md)
> 约定：python 测试 `cd python-ai && python -m pytest tests/test_library_*.py -q`。先写失败测试。

---

## Task 9: AgentRunContext 加 referenced_books

**Files:**
- Modify: `python-ai/app/agent/schemas.py`

> 4 层镜像：Java `referenced_books` → python `AgentRunContext.referenced_books`。

- [ ] **Step 1: 加字段**

在 `AgentRunContext`（schemas.py:75-96）的 `selected_choice` 后加：
```python
    referenced_books: list[dict[str, Any]] = Field(default_factory=list)
```
（pydantic v2；`Any` 已 import。）

- [ ] **Step 2: 验证 import**

```bash
cd python-ai && python -c "from app.agent.schemas import AgentRunContext; ctx=AgentRunContext(run_id='r',session_id='s',message_id='m',user_id=1); print(ctx.referenced_books)"
```
Expected: `[]`。

- [ ] **Step 3: 提交**

```bash
git add python-ai/app/agent/schemas.py
git commit -m "feat(library): AgentRunContext 加 referenced_books"
```

---

## Task 10: /internal/library/summarize 端点

**Files:**
- Create: `python-ai/app/api/library_routes.py`
- Modify: `python-ai/app/main.py`
- Test: `python-ai/tests/test_library_summarize.py`

> LLM 摘要：输入章节标题+首段，输出全书摘要。

- [ ] **Step 1: 写失败测试**

```python
"""/internal/library/summarize 单测。"""

from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient


def test_summarize_returns_summary(monkeypatch):
    from app.main import app
    async def fake_generate(prompt, system_message=None, **kw):
        return "本书讲述林动修仙之路。"
    with patch("app.api.library_routes.generate_text", new=fake_generate):
        client = TestClient(app)
        resp = client.post("/internal/library/summarize",
            headers={"X-Internal-Service-Key": "dev-internal-key-change-me"},
            json={"catalogNovelId": "c1", "chapterTitles": ["第一章", "第二章"], "firstChunks": ["段落一", "段落二"]})
    assert resp.status_code == 200
    assert "林动" in resp.json()["summary"]


def test_summarize_rejects_bad_key():
    from app.main import app
    client = TestClient(app)
    resp = client.post("/internal/library/summarize",
        headers={"X-Internal-Service-Key": "wrong"},
        json={"catalogNovelId": "c1", "chapterTitles": [], "firstChunks": []})
    assert resp.status_code == 403
```
（`internal_service_key` 默认 `dev-internal-key-change-me`——确认 config.py 默认值；测试环境一致。）

- [ ] **Step 2: 跑测试验证失败**

```bash
cd python-ai && python -m pytest tests/test_library_summarize.py -q
```

- [ ] **Step 3: 写 library_routes.py**

```python
"""/internal/library/summarize — 书库书全书摘要（Java LIBRARY_INDEX listener 调）。"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.core.llm import generate_text

logger = logging.getLogger(__name__)

internal_router = APIRouter()

_SYSTEM = "你是小说摘要生成器。根据章节标题与每章首段，生成该书 150 字以内的内容简介，直接输出摘要，不要多余解释。"
_PROMPT = """章节标题：
{titles}

各章首段：
{chunks}

请生成全书摘要。"""


def _verify_internal_key(key: str | None) -> None:
    expected = settings.internal_service_key
    if not expected or key != expected:
        raise HTTPException(status_code=403, detail="invalid internal service key")


class SummarizeRequest(BaseModel):
    catalogNovelId: str | None = None
    chapterTitles: list[str] = []
    firstChunks: list[str] = []


@internal_router.post("/library/summarize")
async def summarize(
    body: SummarizeRequest,
    x_internal_service_key: str | None = Header(default=None, alias="X-Internal-Service-Key"),
):
    _verify_internal_key(x_internal_service_key)
    titles = "\n".join(body.chapterTitles[:50]) or "（无）"
    chunks = "\n".join(body.firstChunks[:50]) or "（无）"
    try:
        summary = await generate_text(
            _PROMPT.format(titles=titles, chunks=chunks),
            system_message=_SYSTEM,
            temperature=0.3,
        )
        return {"summary": (summary or "").strip()}
    except Exception as e:
        logger.warning("library summarize failed: %s", e)
        return {"summary": "", "error": str(e)}
```

- [ ] **Step 4: main.py 注册**

`app/main.py` import 加：
```python
from app.api.library_routes import internal_router as library_internal_router
```
include 加：
```python
app.include_router(library_internal_router, prefix="/internal", tags=["Library Internal"])
```

- [ ] **Step 5: 跑测试验证通过**

```bash
cd python-ai && python -m pytest tests/test_library_summarize.py -q
```
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add python-ai/app/api/library_routes.py python-ai/app/main.py python-ai/tests/test_library_summarize.py
git commit -m "feat(library): /internal/library/summarize 端点"
```

---

## Task 11: SearchKnowledgeInput + search_knowledge 加 scope

**Files:**
- Modify: `python-ai/app/agent/tools/schemas.py`
- Modify: `python-ai/app/agent/tools/knowledge.py`
- Test: `python-ai/tests/test_search_knowledge_scope.py`

> SearchKnowledge 加 `scope` 参数：`"novel"`（默认，搜 ctx.novel_id）| `"book:<catalogNovelId>"`（搜 referenced_books 中该书的 namespace）。

- [ ] **Step 1: 写失败测试**

```python
"""search_knowledge scope 单测。"""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

from app.agent.schemas import AgentRunContext
from app.agent.tools.knowledge import search_knowledge
from app.agent.tools.schemas import SearchKnowledgeInput


def _ctx(referenced=None):
    ctx = AgentRunContext(run_id="r", session_id="s", message_id="m", user_id=10, novel_id="novel-1")
    ctx.referenced_books = referenced or []
    return ctx


async def test_scope_novel_searches_ctx_novel():
    with patch("app.agent.tools.knowledge.search_novel", new=AsyncMock(return_value=[{"title":"x","text":"y"}])) as m:
        await search_knowledge(_ctx(), SearchKnowledgeInput(query="q"))
        m.assert_awaited_once()
        assert m.call_args.args[0] == "novel-1"


async def test_scope_book_searches_referenced_namespace():
    ctx = _ctx(referenced=[{"catalogNovelId": "c1", "namespace": "library:10:c1"}])
    with patch("app.agent.tools.knowledge.search_novel", new=AsyncMock(return_value=[{"title":"x","text":"y"}])) as m:
        await search_knowledge(ctx, SearchKnowledgeInput(query="q", scope="book:c1"))
        assert m.call_args.args[0] == "library:10:c1"


async def test_scope_book_missing_in_referenced_falls_back_to_novel():
    ctx = _ctx(referenced=[{"catalogNovelId": "c2", "namespace": "library:10:c2"}])
    with patch("app.agent.tools.knowledge.search_novel", new=AsyncMock(return_value=[])) as m:
        await search_knowledge(ctx, SearchKnowledgeInput(query="q", scope="book:c9"))
        # c9 不在 referenced → 回退 novel_id
        assert m.call_args.args[0] == "novel-1"
```

- [ ] **Step 2: 跑测试验证失败**

```bash
cd python-ai && python -m pytest tests/test_search_knowledge_scope.py -q
```

- [ ] **Step 3: schemas.py SearchKnowledgeInput 加 scope**

```python
class SearchKnowledgeInput(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = Field(5, ge=1, le=20)
    scope: str | None = Field(None, description="检索范围: novel(默认) | book:<catalogNovelId>（@引用书目）")
```

- [ ] **Step 4: knowledge.py search_knowledge 加 scope 分支**

`search_knowledge`（knowledge.py:15-39）改：
```python
async def search_knowledge(ctx: AgentRunContext, inp: SearchKnowledgeInput) -> ToolCallResult:
    novel_id = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    if not novel_id:
        return ToolCallResult(content="<tool_use_error>missing novel_id</tool_use_error>", is_error=True)

    # scope: book:<catalogNovelId> → 从 referenced_books 取 namespace
    target_ns = novel_id
    if inp.scope and inp.scope.startswith("book:"):
        catalog_id = inp.scope[len("book:"):]
        ns = next((b.get("namespace") for b in (ctx.referenced_books or [])
                   if b.get("catalogNovelId") == catalog_id and b.get("namespace")), None)
        target_ns = ns if ns else novel_id  # 找不到回退 novel

    hits = await search_novel(target_ns, inp.query, top_k=inp.top_k, mode="hybrid")
    if not hits:
        return ToolCallResult(
            content=json.dumps(
                {"hits": [], "status": "no_match",
                 "hint": "No indexed match. A recently written chapter may still be indexing — retry shortly, or ReadChapter / ListChapters directly."},
                ensure_ascii=False))
    return ToolCallResult(content=json.dumps({"hits": hits, "status": "ok"}, ensure_ascii=False))
```

- [ ] **Step 5: 跑测试验证通过**

```bash
cd python-ai && python -m pytest tests/test_search_knowledge_scope.py -q
```
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add python-ai/app/agent/tools/schemas.py python-ai/app/agent/tools/knowledge.py python-ai/tests/test_search_knowledge_scope.py
git commit -m "feat(library): SearchKnowledge 加 scope=book: 检索引用书目"
```

---

## Task 12: run_context 渲染 library 区块

**Files:**
- Modify: `python-ai/app/agent/context/prompting/run_context.py`

> 参考书目作 `assemble_run_context` 返回 dict 的 top-level `library` 区块（user_message 不动）。`format_run_context_block` 自动含入。

- [ ] **Step 1: assemble_run_context 加 library 区块**

在 `assemble_run_context`（run_context.py:32-172）的 `out` 组装处（与 novel/memory/working 同级）加：
```python
    if ctx.referenced_books:
        out["library"] = {
            "books": [
                {
                    "title": b.get("title", ""),
                    "summary": b.get("summary", ""),
                    "chapter_titles": b.get("chapterTitles") or b.get("chapter_titles") or [],
                    "catalog_novel_id": b.get("catalogNovelId") or b.get("catalog_novel_id") or "",
                    "index_status": b.get("indexStatus") or b.get("index_status") or "",
                }
                for b in ctx.referenced_books
            ],
            "hint": "用户 @引用的参考书目。需要书中细节时，用 SearchKnowledge 工具并设 scope=book:<catalog_novel_id> 检索。",
        }
```
（`ctx` 是 `assemble_run_context(ctx, transcript)` 的参数——确认其签名。snake_case/camelCase 双兼容：Java 透传 camelCase（catalogNovelId），pydantic AgentRunContext.referenced_books 是 `list[dict]` 原样存。）

- [ ] **Step 2: 验证渲染**

`_restart-dev-stack.ps1`，发消息带 referenced_books（Part4 完成后），查 agent trace 含 RUN_CONTEXT_JSON 内 `library` 区块。

- [ ] **Step 3: 提交**

```bash
git add python-ai/app/agent/context/prompting/run_context.py
git commit -m "feat(library): run_context 渲染参考书目 library 区块"
```

---

Part 3 完成。→ 继续 [Part 4 — 前端](./2026-06-19-library-part4-frontend.md)
