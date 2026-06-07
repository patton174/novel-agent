# Phase 1 实施计划：Python-AI 工程化重构 + 工具全量 API 化

> **方针（用户明确）**：彻底重构、不留旧代码。重写工具层、重组目录、删除死代码。只借鉴 CC 的循环/注册架构风格，不照抄工具集。有用工具（WebSearch/MCP/Skill）改造为真实 API；无用 stub 直接删。
>
> 周期：2-3 周 ｜ 风险：中（大改）→ 用「每步全量测试 + git mv 保历史」控制 ｜ ROI：最高
>
> 所有任务遵守 `implementation-index.md` 的 DoD：**每个 task 必须配套单测，本地实跑通过，且不破坏全量回归**。

---

## 0. 重构铁律

1. **测试先行护栏**：动手前先确保 `cd python-ai && python -m pytest tests/ -q` 全绿，作为重构基线。每完成一个 task 立即重跑。
2. **小步 + git mv**：目录/文件重命名一律 `git mv`，保留历史；每步独立可回滚。
3. **删除前确认零引用**：`ruff check`（F401/未用）+ 全仓 `grep` 确认无调用，再删。
4. **先写测试再写实现**（纯逻辑模块）。
5. **工程化基线本阶段即接入**（ruff/mypy/pytest-cov，见 T1.9）。

---

## 任务总览

| # | 任务 | 产物 | 单测 |
|---|------|------|------|
| T1.0 | 建立重构基线 + 工程化工具链 | ruff/mypy/cov 配置 | 基线全绿 |
| T1.1 | 后端客户端层（去路径解析） | `agent/backend/*.py` | `test_backend_clients.py` |
| T1.2 | 工具契约 + 注册 + bind（合并三件套，删 defer） | `agent/tools/base.py` | `test_tool_base.py` |
| T1.3 | 章节工具（chapter.py） | `agent/tools/chapter.py` | `test_chapter_tools.py` |
| T1.4 | 记忆工具（memory.py） | `agent/tools/memory.py` | `test_memory_tools.py` |
| T1.5 | 知识/交互/子代理工具 | `knowledge.py`/`interaction.py`/`subagent.py` | `test_knowledge_interaction_tools.py` |
| T1.6 | 通用工具真实 API 化（web/mcp/skill） | `web.py`/`mcp.py`/`skill.py` | `test_generic_api_tools.py` |
| T1.7 | 主循环接新工具 + 删 VFS/cc/stub/legacy | 删除清单落地 | `test_loop_uses_api_tools.py` |
| T1.8 | RUN_CONTEXT/system prompt 改 ID 式 | `context/run_context.py` | `test_run_context_ids.py` |
| T1.9 | Embedding provider 修复 + RAG Milvus-only | `rag/embeddings.py`/`chapter_index.py` | `test_embeddings_provider.py`/`test_chapter_index_milvus.py` |
| T1.10 | 工具失败率埋点 | `agent/metrics.py` | `test_tool_metrics.py` |
| T1.11 | 死代码总清扫 + 全量回归 | 删除遗留文件 | `pytest tests/ -q` 全绿 |

---

## T1.0 — 重构基线 + 工程化工具链

### 步骤
1. 跑 `cd python-ai && python -m pytest tests/ -q`，记录当前通过数作为基线。
2. `pyproject.toml` 加 dev 依赖与配置（与 Phase 4 T4.1 一致，提前到此）：

```toml
[project.optional-dependencies]
dev = ["pytest>=8.0.0","pytest-asyncio>=0.23.0","httpx>=0.27.0",
       "ruff>=0.5.0","mypy>=1.10.0","pytest-cov>=5.0.0"]

[tool.ruff]
line-length = 100
target-version = "py310"
[tool.ruff.lint]
select = ["E","F","I","UP","B"]
```

3. `pip install -e ".[dev]"`，`ruff check app/ --statistics` 记录历史问题量（先 warn，不阻断）。

### 验收
```bash
cd python-ai && python -m pytest tests/ -q     # 基线全绿
cd python-ai && ruff check app/ --statistics   # 仅统计，不阻断
```

---

## T1.1 — 后端客户端层（API 客户端，无路径解析）

### 目标
把 `vfs/chapter_store.py`、`vfs/memory_store.py` 中**纯 HTTP 客户端逻辑**迁移到 `app/agent/backend/`，**剥离所有 `parse_vfs_path` 依赖**。这些是真正有用的代码，保留并清理。

### 改动
- `git mv python-ai/app/agent_step/vfs/chapter_store.py python-ai/app/agent/backend/chapter_client.py`
- `git mv python-ai/app/agent_step/vfs/memory_store.py python-ai/app/agent/backend/memory_client.py`
- 删除其中对 `paths.py`/`novel_root` 的 import；函数签名保持 `(ctx, chapter_id/scope/key, ...)`（已是 ID 式，见 `chapter_store.fetch_chapter_read_slice` 等）。
- 保留 `chapter_meta.py`（title 校验/解析，复用），迁到 `backend/chapter_meta.py`。

> 注：`chapter_store.py` 现有函数 `fetch_chapter_summaries`/`fetch_chapter_read_slice`/`persist_chapter_write`/`fetch_chapter_full`/`delete_chapter`/`reorder_novel_chapters`/`update_chapter_sort_order` 已经是 ID 式 API 调用，**直接复用**，只去掉路径相关 import。

### 单测 `python-ai/tests/test_backend_clients.py`
用 monkeypatch 替换 httpx，断言客户端按 chapter_id 调用正确 URL、解析响应、错误传播：

```python
import asyncio
from app.agent.backend import chapter_client
from app.agent_step.schemas import AgentRunContext

def _ctx():
    return AgentRunContext(run_id="r", session_id="s", message_id="m", user_id=1,
                           novel_id="n1", project={"id":"n1"}, chapters=[])

def test_read_slice_parses_text(monkeypatch):
    class Resp:
        status_code=200
        def json(self): return {"text":"正文行"}
    class Client:
        def __init__(self,**k): pass
        async def __aenter__(self): return self
        async def __aexit__(self,*a): return False
        async def get(self,url,**k): return Resp()
    monkeypatch.setattr(chapter_client.httpx, "AsyncClient", Client)
    text, err = asyncio.run(chapter_client.fetch_chapter_read_slice(_ctx(), "c1"))
    assert text == "正文行" and err is None

def test_read_slice_404(monkeypatch):
    class Resp:
        status_code=404
        def json(self): return {}
    class Client:
        def __init__(self,**k): pass
        async def __aenter__(self): return self
        async def __aexit__(self,*a): return False
        async def get(self,url,**k): return Resp()
    monkeypatch.setattr(chapter_client.httpx, "AsyncClient", Client)
    text, err = asyncio.run(chapter_client.fetch_chapter_read_slice(_ctx(), "missing"))
    assert text is None and "not found" in err
```

### 验收
```bash
cd python-ai && python -m pytest tests/test_backend_clients.py -q
```

---

## T1.2 — 工具契约 + 注册 + bind（合并三件套，删除 defer 机制）

### 目标
把 `tools/tool.py`（契约）、`tools/registry.py`（注册）、`tools/langchain_bind.py`（绑定）合并为 `app/agent/tools/base.py`，**删除 defer_loading / ToolSearch / `_discovered_tools` 机制**（小工具集全 always-load）。

### 改动 `app/agent/tools/base.py`
- 保留 `AgentTool` dataclass（去掉 `defer_loading`、`always_load` 简化为「全部加载」）。
- `register_tools()` 收集所有领域工具模块的 tool 列表（chapter/memory/knowledge/interaction/web/mcp/skill/subagent）。
- `find_tool(name)`：精确匹配（**不再有 legacy 别名**）。
- `build_langchain_tools(ctx)`：`StructuredTool.from_function` 暴露 schema。
- `validate_batch(calls, ctx)`：仅 `unknown_tool` 校验（删除 `undeferred_tool`）。

### 单测 `python-ai/tests/test_tool_base.py`
```python
from app.agent.tools.base import find_tool, all_tool_names, validate_batch

def test_core_tools_registered():
    names = all_tool_names()
    for t in ("ListChapters","ReadChapter","WriteChapter","EditChapter","ReorderChapters",
              "ListMemory","ReadMemory","WriteMemory","AskUser","TodoWrite","Agent","SearchKnowledge"):
        assert t in names

def test_legacy_and_deleted_tools_gone():
    for t in ("Read","Write","Glob","Grep","Brief","ToolSearch","TaskCreate","NotebookEdit","chapter_read"):
        assert find_tool(t) is None

def test_validate_unknown_tool():
    v = validate_batch([type("C",(),{"tool":"Nope","args":{}})()], ctx=None)
    assert any(x.code=="unknown_tool" for x in v)
```

### 验收
```bash
cd python-ai && python -m pytest tests/test_tool_base.py -q
```

---

## T1.3 — 章节工具（chapter.py）

### 改动 `app/agent/tools/chapter.py`
基于 `cc/__init__.py` 现有 `_write_call`/`_edit_call`/`_reorder_chapters_call` 的**持久化逻辑**（这部分有用，保留），但**入口改为 ID/字段 schema**，删除 file_path 与 frontmatter 解析。

```python
from enum import Enum
from pydantic import BaseModel, Field
from app.agent.backend import chapter_client

class ListChaptersInput(BaseModel):
    include_summary: bool = True

class ReadChapterInput(BaseModel):
    chapter_id: str = Field(..., min_length=1)
    offset: int | None = Field(None, ge=1)
    limit: int | None = Field(None, ge=1)

class WriteChapterInput(BaseModel):
    title: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)
    sort_order: int | None = Field(None, ge=1)
    chapter_id: str | None = None

class EditChapterInput(BaseModel):
    chapter_id: str = Field(..., min_length=1)
    old_string: str = Field(..., min_length=1)
    new_string: str
    replace_all: bool = False

class DeleteChapterInput(BaseModel):
    chapter_id: str = Field(..., min_length=1)

class ReorderChaptersInput(BaseModel):
    chapter_ids: list[str] = Field(..., min_length=1)

# 实现：list_chapters/read_chapter/write_chapter/edit_chapter/delete_chapter/reorder_chapters
# 复用 chapter_client.persist_chapter_write 等；write 仍触发章节流式（保留 chapter_body 流）
TOOLS = [ ... build_tool(...) ... ]
```

> 注意：`WriteChapter` 仍需对接 `chapter_body` 流式生成（保留该有用能力），但触发条件从「path 含 /chapters/」改为「调用 WriteChapter 工具」。

### 单测 `python-ai/tests/test_chapter_tools.py`
覆盖：list 返回 chapter_id；read 错误传播；write 成功返回 chapter_id；edit 读改写；delete；reorder。全部 monkeypatch `chapter_client`。

```python
import asyncio, json
from app.agent.tools import chapter
from app.agent.tools.chapter import ListChaptersInput, WriteChapterInput, ReadChapterInput

def test_list_returns_ids(monkeypatch):
    async def fake(ctx): return [{"id":"c1","title":"第一章","summary":"s","sort_order":1,"word_count":9,"volume_id":"","volume_title":""}]
    monkeypatch.setattr(chapter.chapter_client, "fetch_chapter_summaries", fake)
    out = asyncio.run(chapter.list_chapters(_ctx(), ListChaptersInput()))
    assert json.loads(out.content)["chapters"][0]["chapter_id"]=="c1"

def test_write_returns_chapter_id(monkeypatch):
    async def fake(ctx,p): return True,{**p,"chapter_id":"new"},""
    monkeypatch.setattr(chapter.chapter_client,"persist_chapter_write",fake)
    out = asyncio.run(chapter.write_chapter(_ctx(), WriteChapterInput(title="T",content="正文")))
    assert json.loads(out.content)["chapter_id"]=="new"

def test_read_error(monkeypatch):
    async def fake(ctx,cid,*,offset=None,limit=None): return None,"file not found"
    monkeypatch.setattr(chapter.chapter_client,"fetch_chapter_read_slice",fake)
    out = asyncio.run(chapter.read_chapter(_ctx(), ReadChapterInput(chapter_id="x")))
    assert out.is_error
```

### 验收
```bash
cd python-ai && python -m pytest tests/test_chapter_tools.py -q
```

---

## T1.4 — 记忆工具（memory.py）

### 改动 `app/agent/tools/memory.py`
scope 用 `Enum[novel|world|character|chapter]`，key 为 raw（内部 URL 编码由 `memory_client` 负责）。复用 `memory_client.fetch_memory_read_slice`/`persist_memory_document`，删除 v1 envelope 的路径校验，改为 schema 校验。

```python
class MemoryScope(str, Enum):
    novel="novel"; world="world"; character="character"; chapter="chapter"

class ReadMemoryInput(BaseModel):
    scope: MemoryScope; key: str = Field(...,min_length=1)
class WriteMemoryInput(BaseModel):
    scope: MemoryScope; key: str = Field(...,min_length=1); payload: dict
class ListMemoryInput(BaseModel):
    scope: MemoryScope | None = None
# + EditMemory / DeleteMemory
```

### 单测 `python-ai/tests/test_memory_tools.py`
- 非法 scope（"bogus"）parse 抛 ValidationError。
- write/read/list 正常路径（monkeypatch memory_client）。
- 非 ASCII key（"林动"）能正确读写（内部编码透明）。

### 验收
```bash
cd python-ai && python -m pytest tests/test_memory_tools.py -q
```

---

## T1.5 — 知识 / 交互 / 子代理工具

### 改动
- `app/agent/tools/knowledge.py`：`SearchKnowledge(query, mode, top_k)`（接 `rag.chapter_index.search_novel`，Phase 2 扩 hybrid/graph）、`GetCharacterGraph`（Phase 2 KG，先桩接返回「KG 未启用」）。
- `app/agent/tools/interaction.py`：`AskUser`（保留现 `_ask_user_call` 的 wait 逻辑）、`TodoWrite`（保留 `_todo_call`）。
- `app/agent/tools/subagent.py`：`Agent`（保留 `run_subagent`）。

### 单测 `python-ai/tests/test_knowledge_interaction_tools.py`
- `SearchKnowledge` monkeypatch search_novel 返回固定命中。
- `AskUser` 返回 `action="wait"`、`wait_for="interaction"`。
- `TodoWrite` merge 行为正确。

### 验收
```bash
cd python-ai && python -m pytest tests/test_knowledge_interaction_tools.py -q
```

---

## T1.6 — 通用工具真实 API 化（web/mcp/skill，不删）

### 目标（用户要求：有用的改 API，不删）
- `app/agent/tools/web.py`：
  - `WebSearch(query)` → 接真实搜索 API（如 Tavily/Bing/SerpAPI，配置 `WEB_SEARCH_API_KEY`）；未配置返回明确错误（非静默 stub）。
  - `WebFetch(url)` → 真实 httpx 抓取 + 正文提取。
- `app/agent/tools/mcp.py`：`ListMcpResources/ReadMcpResource` → 真实 MCP 客户端（读 `MCP_SERVERS` 配置，调 MCP 协议）；未配置返回明确提示。
- `app/agent/tools/skill.py`：`Skill(skill)` → 真实技能加载（从 `skills/` 目录或配置加载 prompt 片段注入 context_patch）。

> 这些工具默认按配置启用：有 key/配置则可用，无则工具仍注册但返回「请配置 X」可读错误（不是无声 no-op）。

### 单测 `python-ai/tests/test_generic_api_tools.py`
```python
import asyncio
from app.agent.tools import web

def test_websearch_calls_api(monkeypatch):
    async def fake_search(q, **k): return [{"title":"t","url":"u","snippet":"s"}]
    monkeypatch.setattr(web, "_search_provider", fake_search)
    out = asyncio.run(web.web_search(_ctx(), web.WebSearchInput(query="林动 设定")))
    assert "t" in out.content and not out.is_error

def test_websearch_unconfigured_clear_error(monkeypatch):
    monkeypatch.setattr(web, "_search_provider", None)
    out = asyncio.run(web.web_search(_ctx(), web.WebSearchInput(query="x")))
    assert out.is_error and "配置" in out.content   # 明确提示，非静默
```

### 验收
```bash
cd python-ai && python -m pytest tests/test_generic_api_tools.py -q
```

---

## T1.7 — 主循环接新工具 + 删 VFS/cc/stub/legacy

### 改动
- `agent/loop.py`（原 query_loop）改用 `agent.tools.base.build_langchain_tools` / `validate_batch`。
- `run_tool_use` 改 `find_tool`（新 registry），删除 `normalize_tool_name` legacy 调用。
- 删除文件（确认零引用后）：
  - `agent_step/tools/cc/`（整目录）
  - `agent_step/vfs/paths.py`、`path_tree.py`、`api_inventory.py`
  - `cc_visibility.py` 的 `LEGACY_TOOL_ALIASES`/`LEGACY_DISPLAY_NAMES`/`normalize_tool_name`（若 `tool_display` 仍需展示名，保留纯展示映射，去掉 legacy 别名）
  - stub 调用 `_brief_call`/`_task_*`/`_notebook_call`/`_tool_search_call`/`_plan_*` 等
- `orchestration_contract.validate_plan_batch`：删 `undeferred_tool` 分支。

### 单测 `python-ai/tests/test_loop_uses_api_tools.py`
- 断言 `build_langchain_tools(ctx)` 暴露的工具名集 = 新工具集（不含 Read/Glob/Brief 等）。
- 断言旧模块导入失败（`import app.agent_step.tools.cc` → ImportError），证明已删。

### 验收
```bash
cd python-ai && python -m pytest tests/test_loop_uses_api_tools.py -q
cd python-ai && python -m pytest tests/ -q     # 全量回归（删旧测试见 T1.11）
```

---

## T1.8 — RUN_CONTEXT / system prompt 改 ID 式（删路径模板）

### 改动
- `agent/context/run_context.py`：chapter_catalog 输出 `chapter_id=<uuid> | title=<...> | sort=<n>`，memory_catalog 输出 `scope=<x> key=<raw>`；**删除所有 `/novel/.../chapters/*.md` 路径模板与 URL 编码示例**。
- `orchestration_contract.build_main_loop_system_prompt`：工作流改「`ListChapters` 拿 chapter_id → `ReadChapter`/`EditChapter`；`ListMemory` → `ReadMemory(scope,key)`」；删 VFS/路径/frontmatter 段落。

### 单测 `python-ai/tests/test_run_context_ids.py`
- 断言生成文本含 `chapter_id=` 且**不含** `/chapters/` 和 `.md`。
- 断言 system prompt 含 `ListChapters` 且不含 `file_path`。

### 验收
```bash
cd python-ai && python -m pytest tests/test_run_context_ids.py -q
```

---

## T1.9 — Embedding provider 修复 + RAG Milvus-only（删内存/hash）

### 背景（P18/P3/P4）
`embeddings.py` 误用 chat 的 `get_active_llm_config()`（DeepSeek 无 embedding）→ 永久 hash 降级；`chapter_index.search_novel` 只查 `_MEMORY`。**彻底改：独立 embedding provider + Milvus 为唯一存储，删 `_MEMORY` 主存与 hash 兜底**。

### 改动
1. `config.py` 新增 `rag_embed_provider`（openai|bge_local）、`rag_embed_model`、`rag_embed_api_key`、`rag_embed_base_url`、`rag_embed_fail_fast`（默认 True）。
2. `rag/embeddings.py`：按 provider 独立配置；失败 fail-fast 抛错 + 告警；**删除 `_hash_embed` 作为默认兜底**（仅 `bge_local` 或显式 disabled 时有合规降级）。
3. `rag/chapter_index.py`：
   - `_milvus_upsert` 建 collection 后 `create_index` + `load`（当前缺，导致无法 search）。
   - 新增 `_milvus_search`（带 `novel_id` 分区过滤）。
   - `search_novel` 直接走 Milvus，**删除 `_MEMORY` 主存逻辑**（如需进程缓存，单独 LRU，不作为权威源）。

### 单测 `python-ai/tests/test_embeddings_provider.py` + `tests/test_chapter_index_milvus.py`
（同前版方案，monkeypatch provider 与 `_milvus_search`，不依赖真实服务）：
- fail-fast 抛错；provider 路由正确；Milvus search 被调用且返回结构正确。

### 验收
```bash
cd python-ai && python -m pytest tests/test_embeddings_provider.py tests/test_chapter_index_milvus.py -q
```

---

## T1.10 — 工具失败率埋点（KPI 基础）

### 改动
- `app/agent/metrics.py`：`record_tool_result(tool, ok)` + `snapshot()`（进程内计数，Phase 4 接 `/metrics`）。
- `run_tool_use` 返回前埋点。

### 单测 `python-ai/tests/test_tool_metrics.py`（同前版）。

### 验收
```bash
cd python-ai && python -m pytest tests/test_tool_metrics.py -q
```

---

## T1.11 — 死代码总清扫 + 全量回归

### 步骤
1. `ruff check app/` 清 F401/未用 import/变量。
2. `pip install vulture && vulture app/ --min-confidence 80`，人工核对后删未引用函数/类。
3. 删除/重写过时测试：`test_cc_tool_execution.py`、`test_vfs_read.py`、`test_read_tools.py`、`tests/fixtures/plan/scenarios.json` 中以 VFS/legacy 为真值的用例 → 改写为新工具断言或删除。
4. 删除遗留模块（确认零引用）：见 §3.1.4 清单（`agents/base.py` 等遗留 agent 放 Phase 3 T3.3 统一处理，本阶段先删工具/VFS/stub 层）。
5. 全量回归 + 覆盖率。

### 验收
```bash
cd python-ai && ruff check app/ tests/          # 0 error
cd python-ai && mypy app/ --ignore-missing-imports
cd python-ai && python -m pytest tests/ -q       # 全绿
```

---

## Phase 1 整体验收（Definition of Done）

- [ ] `tools/cc/` 目录、`vfs/paths.py` 等路径门面**已删除**（import 报错证明）
- [ ] 工具集 = 领域 API 工具（chapter/memory/knowledge/interaction + web/mcp/skill 真实化 + Agent），无 Read/Glob/Brief/Task*/ToolSearch
- [ ] embedding 独立 provider，hash 兜底删除；RAG 走 Milvus，重启不丢
- [ ] RUN_CONTEXT/prompt 全 ID 式，无路径模板
- [ ] 工具失败率埋点可读，灰度对比数据记录
- [ ] `ruff` 0 error、`mypy` 通过、`pytest tests/ -q` 全绿、覆盖率不低于基线
- [ ] 每个 task 配套单测均通过
