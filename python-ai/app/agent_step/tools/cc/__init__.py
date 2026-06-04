"""CC-aligned tools for novel agent."""

from __future__ import annotations

import json
import os
from typing import Any

from app.agent_step.schemas import AgentRunContext
from app.agent_step.tools.cc import vfs_ops
from app.agent_step.tools.cc.schemas import (
    AgentInput,
    AskUserInput,
    BriefInput,
    DeleteInput,
    EditInput,
    GlobInput,
    GrepInput,
    McpListInput,
    McpReadInput,
    NotebookEditInput,
    PlanModeInput,
    ReadInput,
    ReorderChaptersInput,
    SkillInput,
    TaskCreateInput,
    TaskGetInput,
    TaskListInput,
    TaskStopInput,
    TaskUpdateInput,
    TodoWriteInput,
    ToolSearchInput,
    WebFetchInput,
    WebSearchInput,
    WriteInput,
)
from app.agent_step.tools.tool import ToolCallResult, build_tool
from app.agent_step.vfs import chapter_store
from app.agent_step.chapter_body_format import normalize_chapter_body_for_persist
from app.agent_step.tool_display import split_frontmatter
from app.agent_step.vfs.chapter_meta import resolve_chapter_write_meta, resolve_chapter_write_title
from app.agent_step.vfs.paths import novel_root

READ_DESC = (
    "Read full text from Content API (chapters) or story-memory API (memory JSON paths). "
    "NOT local disk. Use RUN_CONTEXT memory_catalog / chapter_catalog for exact file_path. "
    "Memory path example: /novel/{novelId}/memory/character/{url-encoded-name}.json — copy path from catalog. "
    "offset/limit: 1-based line numbers; omit limit to read from offset through EOF. "
    "If output shows only '# 记忆文档 v1' headers without '---', continue with next offset from footer "
    "(or re-Read without limit). Glob/Grep hits are paths only — always Read each path for body."
)
WRITE_DESC = (
    "Writes chapter/memory/plan via VFS path; chapter body is persisted to Content API (PostgreSQL). "
    "REQUIRED: file_path AND content. "
    "memory/*.json MUST be v1 envelope (see memory_schema). "
    "character: flat data keys, required 身份+性格, values Markdown. "
    "world/background/novel: data.body Markdown required (novel=大纲/创作规划 only, NOT per-chapter). "
    "chapter: path MUST be …/memory/chapter/<chapter_uuid>.json from chapter_catalog; required data.摘要 Markdown. "
    "Never Write per-chapter summaries to …/memory/novel/…. "
    "Chapter .md REQUIRED: YAML frontmatter with title: <真实章节名> (禁止「新章节」等占位). Frontmatter is stripped on save. "
    "Do NOT Write chapters/index.json (read-only). "
    "To reorder chapters: ReorderChapters(chapter_ids=[...]) or Edit(..., sort_order=N). "
    "正文须纯中文小说段落：禁止 Markdown；每段首行两个全角空格缩进。"
)
EDIT_DESC = (
    "Edits by replacing old_string with new_string (Read first). "
    "Chapter paths persist body to Content API (frontmatter stripped). "
    "Optional sort_order (1-based) updates chapter order via API — do not edit frontmatter sort_order lines for reordering. "
    "Bulk reorder: ReorderChapters. 正文禁止 Markdown，每段首行两个全角空格。"
)
REORDER_DESC = (
    "Reorder all chapters in the novel by sortOrder. "
    "Pass chapter_ids in the desired reading order (UUIDs from RUN_CONTEXT chapter_catalog or Read chapters/index.json). "
    "Does not change chapter body text."
)
GLOB_DESC = (
    "List chapter/memory VFS paths backed by Content API + story-memory (not disk files). "
    "Returns paths only — no Markdown/JSON body. Next: Read each path you need. "
    "Counts: use RUN_CONTEXT chapter_catalog / memory_catalog, not Glob line count."
)
GREP_DESC = (
    "Regex search over chapter + memory content in the database APIs. "
    "Returns matching file_path lines ONLY (no bodies). You MUST Read each path to get full text. "
    "'.' does not cross lines; prefer keyword patterns. Do not treat Grep output as document content."
)
DELETE_DESC = "Delete a chapter or memory file at file_path."


async def _read_call(ctx: AgentRunContext, inp: ReadInput) -> ToolCallResult:
    from app.agent_step.vfs.read_tools import build_read_context_patch

    text, err = await vfs_ops.vfs_read(ctx, inp.file_path, offset=inp.offset, limit=inp.limit)
    if err:
        return ToolCallResult(content=err, is_error=True)
    nid = str(ctx.novel_id or (ctx.project or {}).get("id") or "").strip()
    patch = build_read_context_patch(inp.file_path, text or "", expected_novel_id=nid)
    return ToolCallResult(content=text or "", context_patch=patch or None)


def _title_from_chapter_markdown(body: str) -> str:
    """Only YAML frontmatter title; never treat body first line as chapter title."""
    text = (body or "").strip()
    if not text.startswith("---"):
        return ""
    end = text.find("---", 3)
    if end <= 0:
        return ""
    front = text[3:end]
    for line in front.splitlines():
        line = line.strip()
        if line.lower().startswith("title:"):
            return line.split(":", 1)[1].strip().strip('"') or ""
    return ""


def _attach_chapter_write_patch(
    patch: dict,
    *,
    file_path: str,
    content: str,
    ctx: AgentRunContext | None = None,
) -> dict:
    """Map VFS Write on /chapters/*.md to Content API side-effect (chapter_write)."""
    out = dict(patch or {})
    raw_body = str(out.get("write_content") or content or "").strip()
    _, stripped = split_frontmatter(raw_body)
    body = normalize_chapter_body_for_persist(stripped or raw_body)
    path = str(out.get("write_path") or file_path or "")
    if not body or "/chapters/" not in path:
        return out
    cid = str(out.get("chapter_id") or "").strip()
    if not cid and "/chapters/" in path:
        tail = path.split("/chapters/")[-1].replace(".md", "")
        if tail and tail != "_new" and vfs_ops.CHAPTER_ID_RE.match(tail):
            cid = tail
    fm_title = _title_from_chapter_markdown(raw_body)
    resolved_title, title_err = resolve_chapter_write_title(
        ctx, chapter_id=cid, frontmatter_title=fm_title
    )
    if title_err:
        out["chapter_write_error"] = title_err
        return out
    assert resolved_title is not None
    meta = (
        resolve_chapter_write_meta(ctx, chapter_id=cid, title=resolved_title)
        if ctx is not None
        else {
            "chapter_id": cid,
            "title": resolved_title,
            "sort_order": 0,
            "list_index": 0,
            "display_label": resolved_title,
        }
    )
    chapter_write: dict[str, Any] = {
        "title": meta["title"],
        "content": body,
        "sort_order": meta.get("sort_order", 0),
        "list_index": meta.get("list_index", 0),
        "display_label": meta.get("display_label", meta["title"]),
    }
    if cid and vfs_ops.CHAPTER_ID_RE.match(cid):
        chapter_write["chapter_id"] = cid
    out["chapter_write"] = chapter_write
    return out


async def _persist_chapter_write_patch(
    ctx: AgentRunContext, patch: dict
) -> tuple[dict, str | None]:
    """Sync persist to Content API; returns (patch, error_for_ai)."""
    cw = patch.get("chapter_write")
    if not isinstance(cw, dict) or cw.get("persisted"):
        return patch, None
    ok, updated, err = await chapter_store.persist_chapter_write(ctx, cw)
    if not ok:
        failures = patch.get("chapter_persist_failures")
        if not isinstance(failures, list):
            failures = []
        failures.append({**updated, "error": err})
        patch = {**patch, "chapter_persist_failures": failures}
        return patch, err
    patch = {**patch, "chapter_write": updated}
    fresh = await chapter_store.fetch_chapter_summaries(ctx)
    if fresh:
        patch["chapters"] = fresh
    return patch, None


async def _write_call(ctx: AgentRunContext, inp: WriteInput) -> ToolCallResult:
    patch, err = await vfs_ops.vfs_write(ctx, inp.file_path, inp.content)
    if err:
        return ToolCallResult(content=err, is_error=True)
    patch = _attach_chapter_write_patch(
        patch, file_path=inp.file_path, content=inp.content, ctx=ctx
    )
    title_err = patch.get("chapter_write_error")
    if isinstance(title_err, str) and title_err.strip():
        return ToolCallResult(content=title_err.strip(), is_error=True, context_patch=patch)
    if patch.get("write_path") and not inp.content.strip():
        return ToolCallResult(
            content="Write accepted; chapter body will stream.",
            context_patch=patch,
        )
    patch, perr = await _persist_chapter_write_patch(ctx, patch)
    if perr:
        return ToolCallResult(content=perr, is_error=True, context_patch=patch)
    from app.agent_step.cc_visibility import is_memory_vfs_path
    from app.agent_step.tool_display import format_memory_mutation_message, format_write_success_message

    title = ""
    if is_memory_vfs_path(inp.file_path):
        try:
            parsed = json.loads(inp.content) if inp.content.strip() else {}
            if isinstance(parsed, dict):
                title = str(parsed.get("title") or "")
        except json.JSONDecodeError:
            pass
        msg = format_memory_mutation_message("write", inp.file_path, title)
        return ToolCallResult(content=msg, context_patch=patch)
    label = ""
    cw = patch.get("chapter_write")
    if isinstance(cw, dict):
        label = str(cw.get("display_label") or cw.get("title") or "").strip()
    msg = format_write_success_message("write", label, inp.file_path)
    return ToolCallResult(content=msg, context_patch=patch)


async def _apply_chapter_sort_order(
    ctx: AgentRunContext, patch: dict, sort_order: int
) -> tuple[dict, str | None]:
    cw = patch.get("chapter_write")
    cid = ""
    if isinstance(cw, dict):
        cid = str(cw.get("chapter_id") or "").strip()
    if not cid and "/chapters/" in str(patch.get("write_path") or ""):
        tail = str(patch.get("write_path") or "").split("/chapters/")[-1].replace(".md", "")
        if vfs_ops.CHAPTER_ID_RE.match(tail):
            cid = tail
    if not cid:
        return patch, "sort_order requires a chapter file_path with chapter_id"
    ok, err = await chapter_store.update_chapter_sort_order(ctx, cid, sort_order)
    if not ok:
        return patch, err or "sort_order update failed"
    fresh = await chapter_store.fetch_chapter_summaries(ctx)
    if fresh:
        patch = {**patch, "chapters": fresh}
    return patch, None


async def _edit_call(ctx: AgentRunContext, inp: EditInput) -> ToolCallResult:
    patch, err = await vfs_ops.vfs_edit(
        ctx,
        inp.file_path,
        inp.old_string,
        inp.new_string,
        replace_all=inp.replace_all,
    )
    if err:
        return ToolCallResult(content=err, is_error=True)
    patch = _attach_chapter_write_patch(
        patch, file_path=inp.file_path, content=inp.new_string, ctx=ctx
    )
    title_err = patch.get("chapter_write_error")
    if isinstance(title_err, str) and title_err.strip():
        return ToolCallResult(content=title_err.strip(), is_error=True, context_patch=patch)
    patch, perr = await _persist_chapter_write_patch(ctx, patch)
    if perr:
        return ToolCallResult(content=perr, is_error=True, context_patch=patch)
    if inp.sort_order is not None:
        patch, serr = await _apply_chapter_sort_order(ctx, patch, inp.sort_order)
        if serr:
            return ToolCallResult(content=serr, is_error=True, context_patch=patch)
    from app.agent_step.cc_visibility import is_memory_vfs_path
    from app.agent_step.tool_display import format_memory_mutation_message, format_write_success_message

    if is_memory_vfs_path(inp.file_path):
        msg = format_memory_mutation_message("edit", inp.file_path)
        if inp.sort_order is not None:
            msg = f"{msg} sort_order={inp.sort_order}."
        return ToolCallResult(content=msg, context_patch=patch)
    label = ""
    cw = patch.get("chapter_write")
    if isinstance(cw, dict):
        label = str(cw.get("display_label") or cw.get("title") or "").strip()
    msg = format_write_success_message("edit", label, inp.file_path)
    if inp.sort_order is not None:
        msg = f"{msg} sort_order={inp.sort_order}."
    return ToolCallResult(content=msg, context_patch=patch)


async def _reorder_chapters_call(
    ctx: AgentRunContext, inp: ReorderChaptersInput
) -> ToolCallResult:
    ok, summaries, err = await chapter_store.reorder_novel_chapters(ctx, inp.chapter_ids)
    if not ok:
        return ToolCallResult(content=err or "reorder failed", is_error=True)
    patch = {"chapters": summaries}
    return ToolCallResult(
        content=f"Reordered {len(inp.chapter_ids)} chapters.",
        context_patch=patch,
    )


async def _glob_call(ctx: AgentRunContext, inp: GlobInput) -> ToolCallResult:
    out = await vfs_ops.vfs_glob(ctx, inp.pattern, inp.path)
    return ToolCallResult(content=out)


async def _grep_call(ctx: AgentRunContext, inp: GrepInput) -> ToolCallResult:
    out = await vfs_ops.vfs_grep(
        ctx,
        inp.pattern,
        inp.path,
        head_limit=inp.head_limit or 25,
    )
    return ToolCallResult(content=out)


async def _delete_call(ctx: AgentRunContext, inp: DeleteInput) -> ToolCallResult:
    from app.agent_step.tool_display import resolve_delete_target_label
    from app.agent_step.vfs import memory_catalog

    label = await resolve_delete_target_label(ctx, inp.file_path)
    ok, err = await vfs_ops.vfs_delete(ctx, inp.file_path)
    if not ok:
        return ToolCallResult(content=err or "delete failed", is_error=True)
    patch: dict[str, Any] = {}
    if "/memory/" in inp.file_path:
        patch["memory_catalog"] = memory_catalog.format_memory_catalog_db(ctx)
    return ToolCallResult(content=label, context_patch=patch or None)


async def _ask_user_call(ctx: AgentRunContext, inp: AskUserInput) -> ToolCallResult:
    return ToolCallResult(
        content="Waiting for user response.",
        action="wait",
        wait_for="interaction",
        interaction={
            "kind": "choose" if inp.options else "ask_user",
            "questions": inp.questions,
            "options": inp.options or [],
        },
    )


async def _todo_call(ctx: AgentRunContext, inp: TodoWriteInput) -> ToolCallResult:
    patch = dict(ctx.context_patch or {})
    existing = list(patch.get("todos") or []) if inp.merge else []
    by_id = {str(t.get("id")): t for t in existing if isinstance(t, dict) and t.get("id")}
    for t in inp.todos:
        item = t.model_dump()
        by_id[str(item["id"])] = item
    patch["todos"] = list(by_id.values())
    return ToolCallResult(content="Todos updated.", context_patch={"todos": patch["todos"]})


async def _web_fetch_call(ctx: AgentRunContext, inp: WebFetchInput) -> ToolCallResult:
    _ = ctx, inp
    return ToolCallResult(content="WebFetch not configured.", is_error=True)


async def _web_search_call(ctx: AgentRunContext, inp: WebSearchInput) -> ToolCallResult:
    _ = inp
    return ToolCallResult(content="WebSearch not configured.", is_error=True)


async def _tool_search_call(ctx: AgentRunContext, inp: ToolSearchInput) -> ToolCallResult:
    from app.agent_step.tools.registry import get_all_tools, is_deferred_tool

    q = (inp.query or "").lower()
    hits: list[str] = []
    for t in get_all_tools(ctx):
        if not is_deferred_tool(t.name):
            continue
        if q in t.name.lower() or q in (t.description or "").lower():
            hits.append(t.name)
        if len(hits) >= inp.max_results:
            break
    patch = dict(ctx.context_patch or {})
    discovered = set(patch.get("_discovered_tools") or [])
    discovered.update(hits)
    return ToolCallResult(
        content="\n".join(hits) or "(no tools matched)",
        context_patch={"_discovered_tools": sorted(discovered)},
    )


async def _plan_enter_call(ctx: AgentRunContext, inp: PlanModeInput) -> ToolCallResult:
    _ = inp
    return ToolCallResult(
        content="Entered plan mode. Write outline to /novel/.../outline/plan.md",
        context_patch={"plan_mode": True},
    )


async def _plan_exit_call(ctx: AgentRunContext, inp: PlanModeInput) -> ToolCallResult:
    _ = inp
    return ToolCallResult(
        content="Exited plan mode.",
        context_patch={"plan_mode": False},
    )


async def _brief_call(ctx: AgentRunContext, inp: BriefInput) -> ToolCallResult:
    return ToolCallResult(
        content="Brief recorded.",
        context_patch={"brief": (inp.text or "")[:4000]},
    )


async def _skill_call(ctx: AgentRunContext, inp: SkillInput) -> ToolCallResult:
    return ToolCallResult(
        content=f"Skill {inp.skill} invoked (loader TBD).",
        context_patch={"last_skill": inp.skill},
    )


async def _agent_call(ctx: AgentRunContext, inp: AgentInput) -> ToolCallResult:
    from app.agent_step.subagent import run_subagent

    return await run_subagent(
        ctx,
        description=(inp.description or "").strip() or "子任务",
        prompt=(inp.prompt or "").strip(),
    )


def _task_store(ctx: AgentRunContext) -> dict[str, Any]:
    patch = ctx.context_patch if isinstance(ctx.context_patch, dict) else {}
    tasks = patch.get("tasks")
    return dict(tasks) if isinstance(tasks, dict) else {}


async def _task_create(ctx: AgentRunContext, inp: TaskCreateInput) -> ToolCallResult:
    import uuid

    tid = uuid.uuid4().hex[:12]
    store = _task_store(ctx)
    store[tid] = {
        "id": tid,
        "subject": inp.subject,
        "description": inp.description,
        "status": "pending",
    }
    return ToolCallResult(
        content=f"Task {tid} created.",
        context_patch={"tasks": store},
    )


async def _task_get(ctx: AgentRunContext, inp: TaskGetInput) -> ToolCallResult:
    store = _task_store(ctx)
    t = store.get(inp.task_id)
    if not t:
        return ToolCallResult(content="task not found", is_error=True)
    return ToolCallResult(content=json.dumps(t, ensure_ascii=False))


async def _task_list(ctx: AgentRunContext, _inp: TaskListInput) -> ToolCallResult:
    store = _task_store(ctx)
    return ToolCallResult(content=json.dumps(list(store.values()), ensure_ascii=False))


async def _task_update(ctx: AgentRunContext, inp: TaskUpdateInput) -> ToolCallResult:
    store = _task_store(ctx)
    if inp.task_id not in store:
        return ToolCallResult(content="task not found", is_error=True)
    if inp.status:
        store[inp.task_id]["status"] = inp.status
    return ToolCallResult(
        content="Task updated.",
        context_patch={"tasks": store},
    )


async def _task_stop(ctx: AgentRunContext, inp: TaskStopInput) -> ToolCallResult:
    store = _task_store(ctx)
    if inp.task_id in store:
        store[inp.task_id]["status"] = "stopped"
    return ToolCallResult(content="Task stopped.", context_patch={"tasks": store})


async def _notebook_call(ctx: AgentRunContext, inp: NotebookEditInput) -> ToolCallResult:
    _ = ctx, inp
    return ToolCallResult(content="NotebookEdit: no notebook at path.", is_error=True)


async def _mcp_list(ctx: AgentRunContext, inp: McpListInput) -> ToolCallResult:
    _ = ctx, inp
    return ToolCallResult(content="[]")


async def _mcp_read(ctx: AgentRunContext, inp: McpReadInput) -> ToolCallResult:
    _ = ctx, inp
    return ToolCallResult(content="MCP not configured.", is_error=True)


def build_cc_tools() -> list:
    nid_hint = "/novel/{novelId}/"
    tools = [
        build_tool(
            name="Read",
            description=READ_DESC.replace("{novelId}", "novelId"),
            input_model=ReadInput,
            call=_read_call,
            is_concurrency_safe=lambda _i: True,
            is_read_only=lambda _i: True,
            always_load=True,
        ),
        build_tool(
            name="Write",
            description=WRITE_DESC,
            input_model=WriteInput,
            call=_write_call,
            is_destructive=lambda _i: True,
            always_load=True,
        ),
        build_tool(
            name="Edit",
            description=EDIT_DESC,
            input_model=EditInput,
            call=_edit_call,
            always_load=True,
        ),
        build_tool(
            name="ReorderChapters",
            description=REORDER_DESC,
            input_model=ReorderChaptersInput,
            call=_reorder_chapters_call,
            always_load=True,
        ),
        build_tool(
            name="Glob",
            description=GLOB_DESC,
            input_model=GlobInput,
            call=_glob_call,
            is_concurrency_safe=lambda _i: True,
            is_read_only=lambda _i: True,
            always_load=True,
        ),
        build_tool(
            name="Grep",
            description=GREP_DESC,
            input_model=GrepInput,
            call=_grep_call,
            is_concurrency_safe=lambda _i: True,
            is_read_only=lambda _i: True,
            always_load=True,
        ),
        build_tool(
            name="Delete",
            description=DELETE_DESC,
            input_model=DeleteInput,
            call=_delete_call,
            is_destructive=lambda _i: True,
            defer_loading=True,
        ),
        build_tool(
            name="AskUser",
            description="Ask the user questions or present options.",
            input_model=AskUserInput,
            call=_ask_user_call,
            always_load=True,
        ),
        build_tool(
            name="TodoWrite",
            description="Update the task todo list for this run.",
            input_model=TodoWriteInput,
            call=_todo_call,
            always_load=True,
        ),
        build_tool(
            name="WebFetch",
            description="Fetch URL content.",
            input_model=WebFetchInput,
            call=_web_fetch_call,
            is_enabled=lambda _c: bool(os.environ.get("AGENT_WEB_FETCH_ENABLED")),
            defer_loading=True,
        ),
        build_tool(
            name="WebSearch",
            description="Search the web.",
            input_model=WebSearchInput,
            call=_web_search_call,
            is_enabled=lambda _c: bool(os.environ.get("AGENT_WEB_SEARCH_API_KEY")),
            defer_loading=True,
        ),
        build_tool(
            name="ToolSearch",
            description="Search deferred tools by keyword before calling them.",
            input_model=ToolSearchInput,
            call=_tool_search_call,
            always_load=True,
        ),
        build_tool(
            name="EnterPlanMode",
            description="Enter planning mode for complex tasks.",
            input_model=PlanModeInput,
            call=_plan_enter_call,
            always_load=True,
        ),
        build_tool(
            name="ExitPlanMode",
            description="Exit planning mode and proceed.",
            input_model=PlanModeInput,
            call=_plan_exit_call,
            defer_loading=True,
        ),
        build_tool(
            name="Brief",
            description="Store a brief summary in run context.",
            input_model=BriefInput,
            call=_brief_call,
            defer_loading=True,
        ),
        build_tool(
            name="Skill",
            description="Invoke a skill by name.",
            input_model=SkillInput,
            call=_skill_call,
            defer_loading=True,
        ),
        build_tool(
            name="Agent",
            description=(
                "Spawn a sub-agent that runs its own tool loop for ONE focused slice "
                "(e.g. migrate memory for chapters 1–4, or compress chapters 5–8). "
                "Parent must split work: ≤4 chapters or ≤6 heavy steps per call; "
                "never delegate the whole book in one Agent call. "
                "Sub-agent returns a summary — parent should Read to verify."
            ),
            input_model=AgentInput,
            call=_agent_call,
            always_load=True,
            is_concurrency_safe=lambda _i: True,
            user_facing_name=lambda inp: (
                f"子任务：{(inp.description or '子任务')[:32]}"
                if inp is not None
                else "子任务"
            ),
        ),
        build_tool(
            name="TaskCreate",
            description="Create a tracked subtask.",
            input_model=TaskCreateInput,
            call=_task_create,
            defer_loading=True,
        ),
        build_tool(
            name="TaskGet",
            description="Get subtask by id.",
            input_model=TaskGetInput,
            call=_task_get,
            is_concurrency_safe=lambda _i: True,
            is_read_only=lambda _i: True,
            defer_loading=True,
        ),
        build_tool(
            name="TaskList",
            description="List subtasks.",
            input_model=TaskListInput,
            call=_task_list,
            is_concurrency_safe=lambda _i: True,
            is_read_only=lambda _i: True,
            defer_loading=True,
        ),
        build_tool(
            name="TaskUpdate",
            description="Update subtask status.",
            input_model=TaskUpdateInput,
            call=_task_update,
            defer_loading=True,
        ),
        build_tool(
            name="TaskStop",
            description="Stop a subtask.",
            input_model=TaskStopInput,
            call=_task_stop,
            defer_loading=True,
        ),
        build_tool(
            name="NotebookEdit",
            description="Edit Jupyter notebook cells.",
            input_model=NotebookEditInput,
            call=_notebook_call,
            is_enabled=lambda _c: False,
            defer_loading=True,
        ),
        build_tool(
            name="ListMcpResources",
            description="List MCP resources.",
            input_model=McpListInput,
            call=_mcp_list,
            is_enabled=lambda _c: bool(os.environ.get("AGENT_MCP_ENABLED")),
            defer_loading=True,
        ),
        build_tool(
            name="ReadMcpResource",
            description="Read an MCP resource.",
            input_model=McpReadInput,
            call=_mcp_read,
            is_enabled=lambda _c: bool(os.environ.get("AGENT_MCP_ENABLED")),
            defer_loading=True,
        ),
    ]
    _ = nid_hint
    return tools
