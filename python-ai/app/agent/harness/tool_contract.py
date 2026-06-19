"""Single source of truth for LLM-facing tool field names and catalog formatters.

See docs/TOOL_CONTRACT_AND_MEMORY_REFACTOR_PLAN.md
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

# --- Vocabulary (LLM-visible only) ---

CHAPTER_ID_FIELD = "chapter_id"
CHAPTER_INDEX_FIELD = "index"
CHAPTER_TITLE_FIELD = "title"
MEMORY_ID_FIELD = "memory_id"
MEMORY_PARENT_ID_FIELD = "parent_id"
MEMORY_SORT_ORDER_FIELD = "sort_order"
MEMORY_SCOPE_FIELD = "scope"
MEMORY_NODE_TYPE_FIELD = "node_type"

CHAPTER_ROW_TARGET_ONE_OF = (
    f"Exactly one of `{CHAPTER_ID_FIELD}`, `{CHAPTER_INDEX_FIELD}`, or `{CHAPTER_TITLE_FIELD}` is required."
)

MEMORY_UPDATE_FIELD_TOOLS = "UpdateMemoryFields (title/node_kind/style)"
MEMORY_UPDATE_CONTENT_TOOL = "UpdateMemoryContent (non-empty content)"
MEMORY_UPDATE_META_TOOL = "UpdateMemoryMeta (non-empty meta)"

TOOL_USE_EMPTY_FORBIDDEN = (
    "Never call a tool with empty {{}} when required fields exist in RUN_CONTEXT catalog."
)


@dataclass(frozen=True)
class ToolContract:
    name: str
    required_summary: str
    example_json: str
    list_tool: str | None = None


TOOL_CONTRACTS: dict[str, ToolContract] = {
    # --- Chapters (7) ---
    "ListChapters": ToolContract(
        name="ListChapters",
        required_summary="No required fields.",
        example_json="{}",
    ),
    "ChapterAudit": ToolContract(
        name="ChapterAudit",
        required_summary="No required fields.",
        example_json="{}",
    ),
    "ReadChapter": ToolContract(
        name="ReadChapter",
        required_summary=CHAPTER_ROW_TARGET_ONE_OF,
        example_json='{"index": 1}',
        list_tool="ListChapters",
    ),
    "WriteChapter": ToolContract(
        name="WriteChapter",
        required_summary=f"`{CHAPTER_TITLE_FIELD}` required; `content` must be empty (stream-only).",
        example_json='{"title": "咖啡厅奇遇", "position": 3}',
        list_tool="ListChapters",
    ),
    "EditChapter": ToolContract(
        name="EditChapter",
        required_summary=CHAPTER_ROW_TARGET_ONE_OF,
        example_json='{"chapter_id": "<uuid-from-chapter_catalog>", "mode": "patch", "old_string": "…", "new_string": "…"}',
        list_tool="ListChapters",
    ),
    "DeleteChapter": ToolContract(
        name="DeleteChapter",
        required_summary=(
            f"One of `{CHAPTER_ID_FIELD}`, `{CHAPTER_INDEX_FIELD}`, `{CHAPTER_TITLE_FIELD}`, "
            "chapter_ids, or dedupe_title."
        ),
        example_json='{"index": 2}',
        list_tool="ListChapters",
    ),
    "ReorderChapters": ToolContract(
        name="ReorderChapters",
        required_summary="Exactly one of `chapter_ids` (full order) or `moves` [{chapter_id, position}].",
        example_json='{"moves": [{"chapter_id": "<uuid>", "position": 2}]}',
        list_tool="ListChapters",
    ),
    # --- Memory (7) ---
    "ListMemory": ToolContract(
        name="ListMemory",
        required_summary=f"`{MEMORY_SCOPE_FIELD}` (= root title) required; optional `{MEMORY_PARENT_ID_FIELD}`.",
        example_json='{"scope": "世界观"}',
        list_tool="GetMemoryTree",
    ),
    "GetMemoryTree": ToolContract(
        name="GetMemoryTree",
        required_summary=f"`{MEMORY_SCOPE_FIELD}` (= root title) required.",
        example_json='{"scope": "角色库"}',
    ),
    "ReadMemory": ToolContract(
        name="ReadMemory",
        required_summary=f"`{MEMORY_ID_FIELD}` required.",
        example_json='{"memory_id": "<uuid-from-memory_index>"}',
        list_tool="ListMemory",
    ),
    "CreateMemory": ToolContract(
        name="CreateMemory",
        required_summary=(
            f"`{MEMORY_NODE_TYPE_FIELD}` required: `root` | `child`. "
            "`title` required. "
            "**Two levels only**: `root` = scope tab (once per category, title only or ≤1 short intro line); "
            f"`child` = readable content block under that tab (`{MEMORY_PARENT_ID_FIELD}` UUID required — copy from memory.scope_root_ids). "
            "**Prefer many `child` nodes over one huge root**: split by topic (e.g. 世界观→时代背景/势力/规则；角色设定→主角/配角/关系). "
            "Do NOT dump long Markdown into the scope root — users browse root→child in the UI sub-menu. "
            f"If `memory_index` already shows that scope, use `{MEMORY_NODE_TYPE_FIELD}=child` only — never recreate the root."
        ),
        example_json=(
            '{"node_type": "root", "title": "世界观", "node_kind": "both", '
            '"content": "本分类总览（可选，≤200字）", "style": {"layout": "hero", "icon": "Globe"}} '
            '| {"node_type": "child", "title": "修炼体系", "parent_id": "<scope-root-memory_id>", '
            '"node_kind": "leaf", "content": "## 境界\\n…"} '
            '| {"node_type": "child", "title": "林逸", "parent_id": "<scope-root-memory_id>", "node_kind": "leaf"}'
        ),
    ),
    "UpdateMemoryFields": ToolContract(
        name="UpdateMemoryFields",
        required_summary=(
            f"Required `{MEMORY_ID_FIELD}`; at least one of title, node_kind, style; "
            f"optional `{MEMORY_PARENT_ID_FIELD}` guard on non-root nodes. "
            "Does not update content or meta."
        ),
        example_json=(
            '{"memory_id": "<uuid>", "parent_id": "<parent-uuid>", '
            '"style": {"layout": "hero", "icon": "Globe"}}'
        ),
        list_tool="GetMemoryTree",
    ),
    "UpdateMemoryContent": ToolContract(
        name="UpdateMemoryContent",
        required_summary=(
            f"Required `{MEMORY_ID_FIELD}` + non-empty `content` (Markdown); "
            f"optional `{MEMORY_PARENT_ID_FIELD}` guard. Never null/empty content. "
            "Prefer updating a **child** node; if scope root content exceeds ~800 chars or multiple topics, "
            "CreateMemory(node_type=child) to split instead of appending more to the root."
        ),
        example_json=(
            '{"memory_id": "<uuid>", "parent_id": "<parent-uuid>", '
            '"content": "## 更新\\n…"}'
        ),
        list_tool="GetMemoryTree",
    ),
    "UpdateMemoryMeta": ToolContract(
        name="UpdateMemoryMeta",
        required_summary=(
            f"Required `{MEMORY_ID_FIELD}` + non-empty `meta` JSON object; "
            f"optional `{MEMORY_PARENT_ID_FIELD}` guard. Never null or {{}}."
        ),
        example_json='{"memory_id": "<uuid>", "meta": {"era": "现代", "tags": ["都市"]}}',
        list_tool="GetMemoryTree",
    ),
    "MoveMemory": ToolContract(
        name="MoveMemory",
        required_summary=(
            f"`{MEMORY_ID_FIELD}` + `{MEMORY_PARENT_ID_FIELD}` and/or `{MEMORY_SORT_ORDER_FIELD}`."
        ),
        example_json='{"memory_id": "<uuid>", "parent_id": "<parent-uuid>", "sort_order": 1}',
        list_tool="ListMemory",
    ),
    "DeleteMemory": ToolContract(
        name="DeleteMemory",
        required_summary=f"`{MEMORY_ID_FIELD}` required; `cascade` defaults true.",
        example_json='{"memory_id": "<uuid>", "cascade": true}',
        list_tool="ListMemory",
    ),
    # --- Knowledge (2) ---
    "SearchKnowledge": ToolContract(
        name="SearchKnowledge",
        required_summary="`query` required.",
        example_json='{"query": "主角第一次使用魔法", "top_k": 5}',
    ),
    "GetCharacterGraph": ToolContract(
        name="GetCharacterGraph",
        required_summary="`character` name required.",
        example_json='{"character": "唐云"}',
    ),
    # --- Narrative QA ---
    "NarrativeReview": ToolContract(
        name="NarrativeReview",
        required_summary="Optional `scope` (recent|full_book|changed); defaults to recent.",
        example_json='{"scope": "recent", "max_chapters": 5}',
    ),
    # --- Interaction (3) ---
    "AskUser": ToolContract(
        name="AskUser",
        required_summary="`questions` and/or `options` for user choice.",
        example_json='{"questions": [{"question": "续写方向？"}], "options": [{"id": "a", "title": "战斗"}]}',
    ),
    "TodoWrite": ToolContract(
        name="TodoWrite",
        required_summary="`todos` array required (each: id, content, status).",
        example_json='{"todos": [{"id": "1", "content": "写第3章", "status": "in_progress"}], "merge": true}',
    ),
    "Agent": ToolContract(
        name="Agent",
        required_summary="`description` + `prompt` required.",
        example_json='{"description": "审校第1-3章", "prompt": "ReadChapter index=1…"}',
    ),
    # --- Web / MCP / Skill ---
    "WebSearch": ToolContract(
        name="WebSearch",
        required_summary="`query` required.",
        example_json='{"query": "2020年代都市异能小说流行设定"}',
    ),
    "WebFetch": ToolContract(
        name="WebFetch",
        required_summary="`url` required (http/https).",
        example_json='{"url": "https://example.com/article", "prompt": "提取设定要点"}',
    ),
    "ListMcpResources": ToolContract(
        name="ListMcpResources",
        required_summary="Optional `server` filter.",
        example_json='{"server": ""}',
    ),
    "ReadMcpResource": ToolContract(
        name="ReadMcpResource",
        required_summary="`server` + `uri` required.",
        example_json='{"server": "my-mcp", "uri": "resource://…"}',
    ),
    "Skill": ToolContract(
        name="Skill",
        required_summary="`skill` name required.",
        example_json='{"skill": "brainstorming"}',
    ),
}


def registry_tool_names() -> frozenset[str]:
    """All tools in build_agent_tools() — must match TOOL_CONTRACTS keys."""
    from app.agent.tools.registry import build_agent_tools

    return frozenset(t.name for t in build_agent_tools())


def format_chapter_catalog_line(ch: dict[str, Any]) -> str:
    """Machine-readable chapter row — keys match ListChapters / ReadChapter."""
    cid = str(ch.get("id") or ch.get("chapter_id") or "").strip()
    title = str(ch.get("title") or "未命名").strip()
    try:
        list_index = int(ch.get("list_index") or ch.get("index") or 0)
    except (TypeError, ValueError):
        list_index = 0
    try:
        wc = int(ch.get("word_count") or ch.get("wordCount") or 0)
    except (TypeError, ValueError):
        wc = 0
    from app.agent.context.compact import chapter_has_substantial_body

    status = "已写" if chapter_has_substantial_body(ch) else "待写/空"
    idx_part = f"{CHAPTER_INDEX_FIELD}={list_index}" if list_index > 0 else f"{CHAPTER_INDEX_FIELD}=?"
    return (
        f"- {idx_part} | {CHAPTER_ID_FIELD}={cid} | {CHAPTER_TITLE_FIELD}={title} | "
        f"word_count={wc} | status={status}"
    )


def format_chapter_window_line(ch: dict[str, Any]) -> str:
    """Short chapter window row — includes index + chapter_id for tool copy."""
    cid = str(ch.get("id") or ch.get("chapter_id") or "").strip()
    title = str(ch.get("title") or "未命名").strip()
    try:
        list_index = int(ch.get("list_index") or ch.get("index") or 0)
    except (TypeError, ValueError):
        list_index = 0
    try:
        wc = int(ch.get("word_count") or ch.get("wordCount") or 0)
    except (TypeError, ValueError):
        wc = 0
    from app.agent.context.compact import chapter_has_substantial_body

    status = "约{}字".format(wc) if chapter_has_substantial_body(ch) and wc else "待写/占位"
    idx_part = f"{CHAPTER_INDEX_FIELD}={list_index}" if list_index > 0 else f"{CHAPTER_INDEX_FIELD}=?"
    return f"- {idx_part} | {CHAPTER_ID_FIELD}={cid} | {CHAPTER_TITLE_FIELD}={title} | {status}"


def format_memory_tree_line(
    *,
    memory_id: str,
    title: str,
    sort_order: int,
    node_kind: str,
    child_count: int,
    indent: int = 0,
) -> str:
    prefix = "  " * indent
    kind = (node_kind or "both").strip()
    children = f" ({child_count} children)" if child_count else ""
    return (
        f"{prefix}[{MEMORY_ID_FIELD}={memory_id}] {MEMORY_SORT_ORDER_FIELD}={sort_order} "
        f"{kind}  {title}{children}"
    )


def tool_description_suffix(tool_name: str) -> str:
    c = TOOL_CONTRACTS.get(tool_name)
    if not c:
        return ""
    parts = [c.required_summary]
    if c.example_json and c.example_json != "{}":
        parts.append(f"Example: {c.example_json}")
    if c.list_tool:
        parts.append(f"IDs from {c.list_tool} or RUN_CONTEXT catalog.")
    return " ".join(parts)


def enrich_tool_description(tool_name: str, description: str) -> str:
    """Append contract suffix when not already present (bind_tools descriptions)."""
    suffix = tool_description_suffix(tool_name)
    if not suffix:
        return description
    base = (description or "").strip()
    if suffix in base or (c := TOOL_CONTRACTS.get(tool_name)) and c.required_summary in base:
        return base
    return f"{base} {suffix}".strip()


def validation_repair_hint(tool_name: str) -> str:
    c = TOOL_CONTRACTS.get(tool_name)
    if not c:
        return ""
    return f"{c.required_summary} Example: {c.example_json}"


def tool_workflow_prompt_block() -> str:
    """Workflow bullets — must stay aligned with TOOL_CONTRACTS + bind_tools descriptions."""
    return f"""## Tool workflow (names = bind_tools schema)

- **Chapters**: `ListChapters` → `{CHAPTER_ID_FIELD}` + `{CHAPTER_INDEX_FIELD}`; `ReadChapter` / `WriteChapter` / `EditChapter` / `DeleteChapter` / `ReorderChapters` / `ChapterAudit` / `NarrativeReview`
- **WriteChapter**: pure `{CHAPTER_TITLE_FIELD}` (no 第N章 prefix); `position` or `after_chapter_id` controls order (append by default); **never pass `content`** — body streams server-side
- **ChapterAudit**: catalog hygiene — duplicate titles, empty chapters, title prefixes
- **NarrativeReview**: `scope=full_book` for semantic duplicate scan + deep-read; checks memory_node scopes
- **ReorderChapters**: full `chapter_ids` or partial `moves` [{{chapter_id, position}}]
- **DeleteChapter**: one of `{CHAPTER_ID_FIELD}`, `{CHAPTER_INDEX_FIELD}`, `{CHAPTER_TITLE_FIELD}`, chapter_ids, dedupe_title
- **Memory**: `GetMemoryTree` / `ListMemory` → `{MEMORY_ID_FIELD}` + `{MEMORY_PARENT_ID_FIELD}` for hierarchy; `CreateMemory` — `{MEMORY_NODE_TYPE_FIELD}=root` (tab label, once per scope; keep root body short) or `{MEMORY_NODE_TYPE_FIELD}=child` (main readable blocks — **split topics into multiple children**, do not dump everything on the root; **child must set `{MEMORY_PARENT_ID_FIELD}` UUID** from memory.scope_root_ids); if scope is already in `memory_index`, only use `child`; `{MEMORY_UPDATE_FIELD_TOOLS}` / `{MEMORY_UPDATE_CONTENT_TOOL}` / `{MEMORY_UPDATE_META_TOOL}`; `MoveMemory` / `DeleteMemory`
- **Search**: `SearchKnowledge(query)`; `GetCharacterGraph(character)` when KG enabled
- **TodoWrite**: id + content + status; merge=true with full list
- **Agent**: focused slices (≤4 chapters per call when batching)

Never use removed tools (Read, Write, Edit, Glob, Grep, WriteMemory, EditMemory, memory_read, ToolSearch, VFS paths)."""


def tool_contract_prompt_block() -> str:
    from app.agent.context.compact import CHAPTER_INFO_CHAIN_FOR_PROMPT

    lines = [
        "## Tool field names (must match RUN_CONTEXT JSON and List* tool outputs)",
        f"- Chapters: `{CHAPTER_ID_FIELD}`, `{CHAPTER_INDEX_FIELD}`, `{CHAPTER_TITLE_FIELD}` — never `id` or `chapterId` in tool args.",
        f"- Memory: `{MEMORY_ID_FIELD}`, `{MEMORY_PARENT_ID_FIELD}`, `{MEMORY_SORT_ORDER_FIELD}`; "
        f"`CreateMemory(node_type=child)` requires `{MEMORY_PARENT_ID_FIELD}` UUID — never legacy scope/key flat patch on Update* tools.",
        CHAPTER_ROW_TARGET_ONE_OF,
        TOOL_USE_EMPTY_FORBIDDEN,
        "",
        CHAPTER_INFO_CHAIN_FOR_PROMPT,
        "",
        tool_workflow_prompt_block(),
    ]
    return "\n".join(lines)
