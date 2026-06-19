# Part 3 — python 抽取改造实现计划

> 主索引：[2026-06-19-knowledge-graph.md](./2026-06-19-knowledge-graph.md) ｜ [Part 2](./2026-06-19-knowledge-graph-part2-java-backfill.md)
> 设计：[册2 §4](../specs/2026-06-19-knowledge-graph-design-part2.md)
> 约定：python 测试 `cd python-ai && python -m pytest tests/test_kg_*.py -q`。先写失败测试。

---

## Task 11: normalize.py（规范化+合并）

**Files:**
- Create: `python-ai/app/kg/normalize.py`
- Test: `python-ai/tests/test_kg_normalize.py`

- [ ] **Step 1: 写失败测试**

```python
"""kg normalize 单测。"""

from __future__ import annotations

from app.kg.normalize import merge_extraction, normalize_name


def test_normalize_strips_parens():
    assert normalize_name("林动(少年)") == "林动"
    assert normalize_name("张三（青年时期）") == "张三"


def test_normalize_strips_quotes_and_spaces():
    assert normalize_name(' "林动" ') == "林动"
    assert normalize_name("林 动") == "林动"


def test_normalize_empty():
    assert normalize_name("") == ""
    assert normalize_name("   ") == ""


def test_merge_dedupes_entities_by_normalized_name():
    blocks = [
        {"entities": [{"name": "林动(少年)", "type": "character"},
                       {"name": "林动", "type": "character"}],
         "relations": []},
    ]
    result = merge_extraction(blocks)
    assert len(result["entities"]) == 1
    assert result["entities"][0]["name"] == "林动"
    assert "林动(少年)" in (result["entities"][0]["aliases"] or "")


def test_merge_dedupes_relations():
    blocks = [
        {"entities": [], "relations": [
            {"src": "林动", "rel": "师承", "dst": "应欢欢"},
            {"src": "林动(少年)", "rel": "师承", "dst": "应欢欢"},
        ]},
    ]
    result = merge_extraction(blocks)
    assert len(result["relations"]) == 1
    assert result["relations"][0]["src"] == "林动"


def test_merge_across_blocks():
    blocks = [
        {"entities": [{"name": "林动", "type": "character"}], "relations": []},
        {"entities": [{"name": "应欢欢", "type": "character"}],
         "relations": [{"src": "林动", "rel": "师承", "dst": "应欢欢"}]},
    ]
    result = merge_extraction(blocks)
    assert len(result["entities"]) == 2
    assert len(result["relations"]) == 1
```

- [ ] **Step 2: 跑测试验证失败**

```bash
cd python-ai && python -m pytest tests/test_kg_normalize.py -q
```
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 写 normalize.py**

```python
"""实体名规范化 + 跨块合并。"""

from __future__ import annotations

import re

_PAREN_RE = re.compile(r"[（(].*?[)）]")
_WS_RE = re.compile(r"\s+")


def normalize_name(raw: str) -> str:
    s = (raw or "").strip()
    if not s:
        return ""
    s = _PAREN_RE.sub("", s)
    s = s.strip("“”‘’\"'`·")
    s = _WS_RE.sub("", s)
    return s


def merge_extraction(block_results: list[dict]) -> dict:
    """合并多块抽取结果：实体按规范化名去重(累积 aliases)，关系按(src,rel,dst)去重。"""
    entities: dict[str, dict] = {}
    relations: list[dict] = []
    seen_rel: set[tuple[str, str, str]] = set()

    for blk in block_results:
        for e in blk.get("entities", []):
            orig = (e.get("name") or "").strip()
            name = normalize_name(orig)
            if not name:
                continue
            if name not in entities:
                entities[name] = {"name": name, "type": (e.get("type") or "unknown").strip() or "unknown", "aliases": set()}
            if orig and orig != name:
                entities[name]["aliases"].add(orig)
        for r in blk.get("relations", []):
            src = normalize_name(r.get("src", ""))
            rel = (r.get("rel") or "").strip()
            dst = normalize_name(r.get("dst", ""))
            if not (src and rel and dst):
                continue
            key = (src, rel, dst)
            if key in seen_rel:
                continue
            seen_rel.add(key)
            relations.append({"src": src, "rel": rel, "dst": dst})

    out_entities = []
    for e in entities.values():
        aliases = ",".join(sorted(e["aliases"])) if e["aliases"] else None
        out_entities.append({"name": e["name"], "type": e["type"], "aliases": aliases})
    return {"entities": out_entities, "relations": relations}
```

- [ ] **Step 4: 跑测试验证通过**

```bash
cd python-ai && python -m pytest tests/test_kg_normalize.py -q
```
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add python-ai/app/kg/normalize.py python-ai/tests/test_kg_normalize.py
git commit -m "feat(kg): normalize.py 规范化+合并"
```

---

## Task 12: extractor 分块抽取

**Files:**
- Modify: `python-ai/app/kg/extractor.py`

> `extract_entities_relations` 改分块（8000/块，滑窗 1000 重叠）+ 调 `merge_extraction`。单块 ≤8000 仍单块。

- [ ] **Step 1: 改 extractor.py**

替换 `extract_entities_relations`（extractor.py:73-82）为：
```python
async def extract_entities_relations(chapter_text: str) -> dict:
    text = (chapter_text or "").strip()
    if not text:
        return {"entities": [], "relations": []}
    blocks = _split_chunks(text, 8000, 1000)
    block_results = []
    for blk in blocks:
        raw = await generate_text(
            _PROMPT.format(text=blk),
            system_message=_SYSTEM,
            temperature=0.1,
        )
        block_results.append(parse_extraction_json(raw))
    from app.kg.normalize import merge_extraction
    return merge_extraction(block_results)


def _split_chunks(text: str, size: int, overlap: int) -> list[str]:
    if len(text) <= size:
        return [text]
    chunks = []
    step = size - overlap
    i = 0
    while i < len(text):
        chunks.append(text[i:i + size])
        i += step
    return chunks
```
（`parse_extraction_json` 单块解析不变；merge 跨块去重。`merge_extraction` 已规范化。）

- [ ] **Step 2: 单测分块**

在 `test_kg_normalize.py` 同目录加 `test_kg_extract.py`：
```python
"""extractor 分块抽取（mock LLM）。"""

from __future__ import annotations

from unittest.mock import patch

from app.kg.extractor import _split_chunks, extract_entities_relations


def test_split_chunks_short_text_single():
    assert _split_chunks("短文本", 8000, 1000) == ["短文本"]


def test_split_chunks_long_text_overlap():
    text = "字" * 18000
    chunks = _split_chunks(text, 8000, 1000)
    assert len(chunks) >= 2
    # 第二块开头应与第一块尾部重叠
    assert chunks[1][:5] == chunks[0][-1005:-1000]


async def test_extract_merges_multiple_blocks():
    # mock generate_text 两次返回不同实体
    calls = iter([
        '{"entities":[{"name":"林动","type":"character"}],"relations":[]}',
        '{"entities":[{"name":"应欢欢","type":"character"}],"relations":[{"src":"林动","rel":"师承","dst":"应欢欢"}]}',
    ])
    with patch("app.kg.extractor.generate_text", side_effect=lambda *a, **k: next_async(next(calls))):
        result = await extract_entities_relations("字" * 18000)
    assert len(result["entities"]) == 2
    assert len(result["relations"]) == 1


def next_async(value):
    import asyncio
    async def _ret(*a, **k):
        return value
    return _ret
```
（`generate_text` 是 async；patch 用 side_effect 返回 coroutine factory。）

- [ ] **Step 3: 跑测试验证通过**

```bash
cd python-ai && python -m pytest tests/test_kg_extract.py -q
```
Expected: PASS。

- [ ] **Step 4: 提交**

```bash
git add python-ai/app/kg/extractor.py python-ai/tests/test_kg_extract.py
git commit -m "feat(kg): extractor 分块抽取+滑窗合并"
```

---

## Task 13: /internal/kg/extract 端点

**Files:**
- Modify: `python-ai/app/api/kg_routes.py`

- [ ] **Step 1: 加 /internal/kg/extract 端点**

`kg_routes.py` 加 internal router（注意现有 router 是 `/api` 前缀，internal 需单独 router 挂 `/internal`）：
```python
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from app.config import settings
from app.kg.extractor import extract_entities_relations

internal_router = APIRouter(prefix="/kg", tags=["KnowledgeGraph Internal"])


def _verify_internal_key(key: str | None) -> None:
    expected = settings.internal_service_key
    if not expected or key != expected:
        raise HTTPException(status_code=403, detail="invalid internal service key")


class KgExtractRequest(BaseModel):
    text: str
    novelId: str | None = None
    chapterId: str | None = None


@internal_router.post("/extract")
async def extract_route(
    body: KgExtractRequest,
    x_internal_service_key: str | None = Header(default=None, alias="X-Internal-Service-Key"),
):
    _verify_internal_key(x_internal_service_key)
    try:
        result = await extract_entities_relations(body.text)
        return result
    except Exception as e:
        return {"error": "extract_failed", "detail": str(e)}
```
（保留现有 `router`（/api/kg/novels/{id}/graph）作兼容。）

- [ ] **Step 2: main.py 注册 internal_router**

`app/main.py` import 加：
```python
from app.api.kg_routes import internal_router as kg_internal_router
```
include 加（与其他 internal router 一起）：
```python
app.include_router(kg_internal_router, prefix="/internal", tags=["KnowledgeGraph Internal"])
```
（端点解析为 `POST /internal/kg/extract`，与 Part2 T8 Java 调用一致。）

- [ ] **Step 3: 启动验证**

`_restart-dev-stack.ps1`，curl 测：
```bash
curl -s -X POST http://127.0.0.1:8000/internal/kg/extract \
  -H "X-Internal-Service-Key: dev-internal-key-change-me" \
  -H "Content-Type: application/json" \
  -d '{"text":"林动师承应欢欢。","novelId":"n1","chapterId":"c1"}'
```
Expected: `{"entities":[...],"relations":[...]}`（含 林动/应欢欢 + 师承关系）。

- [ ] **Step 4: 提交**

```bash
git add python-ai/app/api/kg_routes.py python-ai/app/main.py
git commit -m "feat(kg): /internal/kg/extract 端点"
```

---

## Task 14: ingest_queue + pipeline 改走 Java

**Files:**
- Modify: `python-ai/app/rag/ingest_queue.py`
- Modify: `python-ai/app/kg/pipeline.py`

> `_ingest_kg_background` 改调 Java `/internal/kg/ingest-chapter`（带 chapter_id），失败调 `/internal/kg/error`。不再写内存 dict。

- [ ] **Step 1: ingest_queue 传 chapter_id**

`ingest_queue.py:54-56` 改：
```python
            if settings.kg_enabled and (content or "").strip():
                asyncio.create_task(
                    _ingest_kg_background(novel_id=novel_id, chapter_id=chapter_id, content=content)
                )
```
`_ingest_kg_background`（ingest_queue.py:75-81）改：
```python
async def _ingest_kg_background(*, novel_id: str, chapter_id: str, content: str) -> None:
    try:
        from app.kg.pipeline import ingest_chapter_kg
        await ingest_chapter_kg(novel_id=novel_id, chapter_id=chapter_id, content=content)
    except Exception as exc:
        logger.warning("kg background ingest failed novel=%s ch=%s: %s", novel_id, chapter_id, exc)
```

- [ ] **Step 2: pipeline 改调 Java**

`pipeline.py` 整体改：
```python
"""KG ingest hook — run after chapter vector indexing. 结果回传 Java 持久化。"""

from __future__ import annotations

import logging

import httpx

from app.agent.backend.content_api import content_internal_url, internal_headers
from app.config import settings
from app.kg.extractor import extract_entities_relations

logger = logging.getLogger(__name__)


async def ingest_chapter_kg(*, novel_id: str, chapter_id: str, content: str) -> None:
    if not settings.kg_enabled:
        return
    text = (content or "").strip()
    if not text:
        return
    data = await extract_entities_relations(text)
    if data.get("error"):
        await _post_java("/internal/kg/error", {"novelId": novel_id, "chapterId": chapter_id, "reason": data["error"]})
        return
    if not data["entities"] and not data["relations"]:
        return
    await _post_java("/internal/kg/ingest-chapter", {
        "novelId": novel_id, "chapterId": chapter_id,
        "entities": data["entities"], "relations": data["relations"],
    })
    logger.info("kg ingest-chapter posted novel=%s ch=%s entities=%s relations=%s",
                novel_id, chapter_id, len(data["entities"]), len(data["relations"]))


async def _post_java(path: str, body: dict) -> None:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(content_internal_url(path), json=body, headers=internal_headers())
            resp.raise_for_status()
    except Exception as exc:
        logger.warning("kg post java failed path=%s: %s", path, exc)
```
（`content_internal_url`/`internal_headers` 来自 `app.agent.backend.content_api`——确认其导出。`content_internal_url("/internal/kg/ingest-chapter")` 应返回 `{content_base_url}/internal/internal/kg/ingest-chapter`？——核实 `content_internal_url` 实现：若它已拼 `/internal/`，则传 `kg/ingest-chapter`。按勘察 `content_internal_url(path)` = `{content_base_url}/internal/{path}`，故传 `"kg/ingest-chapter"`。修正：`_post_java` 调 `content_internal_url("kg/ingest-chapter")` 而非带 `/internal/` 前缀。）

- [ ] **Step 3: 修正路径前缀**

`_post_java` 内 path 改为不含 `/internal/`：
```python
    await _post_java("kg/ingest-chapter", {...})
    await _post_java("kg/error", {...})
```
（`content_internal_url` 自动拼 `/internal/` 前缀。）

- [ ] **Step 4: 启动验证增量抽取**

`_restart-dev-stack.ps1`，保存一个章节（触发索引+KG），查 Java 日志 + PG：
```bash
PGPASSWORD=<pwd> psql -h 118.89.123.201 -p 15432 -U <u> -d <db> -c "SELECT * FROM kg_entity WHERE novel_id='<novelId>'"
```
Expected: 实体入库。

- [ ] **Step 5: 提交**

```bash
git add python-ai/app/rag/ingest_queue.py python-ai/app/kg/pipeline.py
git commit -m "feat(kg): ingest_queue/pipeline 改走 Java /internal/kg/ingest-chapter"
```

---

## Task 15: query.py 改 HTTP 调 Java 子图

**Files:**
- Modify: `python-ai/app/kg/query.py`

> agent `GetCharacterGraph` 工具调 `character_graph(novel_id, name)`（现读内存）。改为 HTTP 调 Java `GET /internal/kg/character-graph`。

- [ ] **Step 1: 改 query.py**

```python
"""Knowledge graph query helpers — HTTP 调 Java 子图。"""

from __future__ import annotations

import logging

import httpx

from app.agent.backend.content_api import content_internal_url, internal_headers

logger = logging.getLogger(__name__)


async def character_graph(novel_id: str, character: str, *, depth: int = 1) -> dict[str, list]:
    """Return nodes/edges subgraph centered on a character (HTTP 调 Java)."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                content_internal_url("kg/character-graph"),
                params={"novelId": novel_id, "name": character},
                headers=internal_headers(),
            )
            resp.raise_for_status()
            return resp.json()
    except Exception as exc:
        logger.warning("kg character-graph fetch failed novel=%s name=%s: %s", novel_id, character, exc)
        return {"nodes": [], "edges": [], "note": f"查询失败: {exc}"}
```

- [ ] **Step 2: 改 agent 工具调用为 async**

`app/agent/tools/knowledge.py:42-57` `get_character_graph` 现同步调 `character_graph`。改为 await：
```python
async def get_character_graph(ctx, inp) -> ToolCallResult:
    novel_id = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    if not novel_id:
        return ToolCallResult(content="<tool_use_error>missing novel_id</tool_use_error>", is_error=True)
    if not settings.kg_enabled:
        return ToolCallResult(content=json.dumps({"nodes": [], "edges": [], "note": "知识图谱未启用"}, ensure_ascii=False))
    graph = await character_graph(novel_id, inp.character)
    return ToolCallResult(content=json.dumps(graph, ensure_ascii=False))
```
（import `from app.kg.query import character_graph`。确认 `build_tool` 支持 async call——其他工具多为 async，应支持。）

- [ ] **Step 3: 启动验证**

`_restart-dev-stack.ps1`，agent run 中触发 GetCharacterGraph 工具，确认返回 PG 子图。

- [ ] **Step 4: 提交**

```bash
git add python-ai/app/kg/query.py python-ai/app/agent/tools/knowledge.py
git commit -m "feat(kg): query.py 改 HTTP 调 Java 子图；agent 工具 async"
```

---

Part 3 完成。→ 继续 [Part 4 — 前端](./2026-06-19-knowledge-graph-part4-frontend.md)
