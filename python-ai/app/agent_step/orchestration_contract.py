"""CC tool orchestration contract (minimal batch rules)."""

from __future__ import annotations

from dataclasses import dataclass

from app.agent_step.schemas import PlanToolCall
from app.agent_step.tools.registry import (
    get_tool_names,
    is_tool_discovered,
    find_tool_by_name,
)
from app.agent_step.schemas import AgentRunContext

PLAN_MAX_TOOL_CALLS = 8

INTERACTION_TOOLS = frozenset({"AskUser"})
QUERY_LOOP_INTERACTION_TOOLS = INTERACTION_TOOLS
QUERY_LOOP_TERMINAL_TOOLS = frozenset({"AskUser", "ExitPlanMode"})
QUERY_LOOP_END_RUN_TOOLS = frozenset({"ExitPlanMode"})

def get_main_loop_tools(ctx: AgentRunContext | None = None) -> frozenset[str]:
    return get_tool_names(ctx)


MAIN_LOOP_TOOLS: frozenset[str] = get_tool_names()


@dataclass(frozen=True)
class PlanInvariantViolation:
    code: str
    message: str


class PlanInvariantError(Exception):
    def __init__(self, violations: list[PlanInvariantViolation]) -> None:
        self.violations = violations
        super().__init__("; ".join(v.message for v in violations[:5]))


BLOCKING_BATCH_VIOLATION_CODES = frozenset({"unknown_tool", "undeferred_tool", "max_calls"})
BLOCKING_RAW_PLAN_VIOLATION_CODES = frozenset({"max_calls"})


def normalize_tool_calls(
    tool_calls: list[PlanToolCall] | None,
    *,
    next_tool: str = "",
    next_input: dict | None = None,
) -> list[PlanToolCall]:
    calls = list(tool_calls or [])
    if not calls and (next_tool or "").strip():
        calls = [PlanToolCall(tool=str(next_tool).strip(), input=dict(next_input or {}))]
    out: list[PlanToolCall] = []
    for call in calls[:PLAN_MAX_TOOL_CALLS]:
        tool = (call.tool or "").strip()
        if not tool:
            continue
        inp = call.input if isinstance(call.input, dict) else {}
        out.append(PlanToolCall(tool=tool, input=dict(inp)))
    return out


def validate_plan_batch(
    calls: list[PlanToolCall],
    *,
    continue_plan: bool | None = None,
    resolved: bool = True,
    ctx: AgentRunContext | None = None,
) -> list[PlanInvariantViolation]:
    _ = continue_plan, resolved
    violations: list[PlanInvariantViolation] = []
    if len(calls) > PLAN_MAX_TOOL_CALLS:
        violations.append(
            PlanInvariantViolation("max_calls", f"max {PLAN_MAX_TOOL_CALLS} tools per turn")
        )
    allowed = get_tool_names(ctx)
    for call in calls:
        tool = call.tool or ""
        if tool not in allowed:
            violations.append(
                PlanInvariantViolation("unknown_tool", f"No such tool available: {tool}")
            )
        elif ctx and find_tool_by_name(tool) and not is_tool_discovered(ctx, tool):
            violations.append(
                PlanInvariantViolation(
                    "undeferred_tool",
                    f"Tool {tool} requires ToolSearch before use",
                )
            )
    asks = [c for c in calls if (c.tool or "") in INTERACTION_TOOLS]
    if len(asks) > 1:
        violations.append(
            PlanInvariantViolation("multiple_ask", "only one AskUser per batch")
        )
    return violations


def blocking_batch_violations(
    calls: list[PlanToolCall],
    *,
    continue_plan: bool | None = None,
    ctx: AgentRunContext | None = None,
) -> list[PlanInvariantViolation]:
    return [
        v
        for v in validate_plan_batch(calls, continue_plan=continue_plan, ctx=ctx)
        if v.code in BLOCKING_BATCH_VIOLATION_CODES
    ]


blocking_resolved_plan_violations = blocking_batch_violations


def blocking_raw_plan_violations(calls: list[PlanToolCall]) -> list[PlanInvariantViolation]:
    out: list[PlanInvariantViolation] = []
    if len(calls) > PLAN_MAX_TOOL_CALLS:
        out.append(PlanInvariantViolation("max_calls", "too many tools"))
    return out


def reorder_plan_tool_calls(calls: list[PlanToolCall]) -> list[PlanToolCall]:
    """AskUser last; preserve relative order otherwise."""
    normal: list[PlanToolCall] = []
    asks: list[PlanToolCall] = []
    for c in calls:
        if (c.tool or "") in INTERACTION_TOOLS:
            asks.append(c)
        else:
            normal.append(c)
    return normal + asks[:1]


def pick_terminal_tool_call(terminals: list[PlanToolCall]) -> PlanToolCall | None:
    return terminals[0] if terminals else None


def plan_has_memory_batch(calls: list[PlanToolCall]) -> bool:
    return any((c.tool or "") in ("Grep", "Glob", "Read") for c in calls)


def plan_has_terminal_reply(calls: list[PlanToolCall]) -> bool:
    return any((c.tool or "") in QUERY_LOOP_TERMINAL_TOOLS for c in calls)


def is_tool_concurrency_safe(tool: str, inp: dict | None = None) -> bool:
    from app.agent_step.tools.registry import find_tool_by_name, partition_concurrency_safe

    raw = dict(inp or {})
    if partition_concurrency_safe(tool, raw):
        return True
    t = find_tool_by_name(tool)
    if t is None:
        return False
    if t.name in ("Read", "Glob", "Grep", "TaskGet", "TaskList", "WebFetch"):
        return True
    return False


def build_main_loop_system_prompt() -> str:
    from app.agent_step.tools.registry import get_all_tools
    from app.agent_step.visible_text_channel import visible_text_channel_prompt_block

    names = ", ".join(sorted(t.name for t in get_all_tools()))
    channel_block = visible_text_channel_prompt_block()
    return f"""You are a novel-writing agent using Claude Code-style tools.

{channel_block}

**与 Claude Code 的关键区别**：章节/记忆/大纲的真实数据在 **作品库（PostgreSQL，Content API）**，
不是开发者机器上的文件树。`novel.vfs_root` 路径是 **API 访问入口**（Read/Glob 会查库），
不要用「Glob 到几个 .md」判断章节数量或是否写成功。

Available tools: {names}

Workflow:
- **章节**：RUN_CONTEXT `novel.chapter_catalog`（Content API）为权威；Read/Glob/Grep 章节路径均查库，非扫描磁盘
- **记忆**：RUN_CONTEXT `memory.memory_catalog`（story-memory API）为权威；Read/Glob/Grep 记忆路径均查库
- **记忆 Write（v1 JSON）**：`{{"v":1,"title","summary","data"}}` — 角色库 data 扁平键值，必填「身份」「性格」，值 Markdown，键 1–16 字可扩展；世界观/背景/大纲 `data.body` 必填 Markdown；**逐章摘要/伏笔 → `/memory/chapter/{{chapter_id}}.json`（路径 key 必须是 chapter_catalog 的 UUID，与正文 `chapters/{{chapter_id}}.md` 一一对应；人类可读章节名写在 JSON 的 `title` / `data.摘要`，禁止用章节名作文件名）**，禁止写入 `/memory/novel/`；章节记忆必填 `data.摘要` Markdown
- **Glob/Grep**：只返回 **路径列表**，不含正文；看到路径后必须 **Read(file_path)**。禁止把 Glob/Grep 输出当作文档内容
- **读正文（Read）**：catalog 里每条记忆已给出完整 Read 路径（URL 编码 key）。记忆正文在 `# 记忆文档 v1` 与 `---` 之后；若首屏只有元信息，按文末 `续读 offset=` 再 Read 或省略 limit。章节用 `…/chapters/{{chapter_id}}.md`（UUID 来自 chapter_catalog）
- **写章**：Write 章节 `.md` 必须在 YAML frontmatter 写 `title: 真实章节名`（禁止「新章节」占位）；正文经 VFS 落 Content API
- **写记忆**：Write/Edit 记忆路径规则同 memory_schema；以 catalog 为准
- **章节排序**：以 `chapter_catalog` / Content API **sortOrder** 为准；Read 的 frontmatter 仅供展示，**禁止**靠 Write/Edit 改 frontmatter 调序。全书重排：`ReorderChapters(chapter_ids=[按阅读顺序的 UUID…])`；单章：`Edit(..., sort_order=N)`。**勿 Write** `chapters/index.json`
- AskUser / TodoWrite / ToolSearch / EnterPlanMode / ExitPlanMode 同 CC
- **TodoWrite**：每条 todo 必须含非空 `id` 与 `content`（及 `status`）；缺字段会 `tool_use_error`，由你修正后重试，服务端不会自动生成 id
- **子 Agent（Agent 工具）**：跨 **>4 章** 的迁移记忆、批量压缩正文、全书级整理等长任务，**禁止**在一次对话里连续 Read/Write 做完；应 **TodoWrite 拆步**，并用 **多次 Agent** 派发（每次 prompt 写明章节范围，如「仅第 1–4 章」）。同一轮里多个 **Agent** 可并行（各写不同章节）。子 Agent 不能再派 Agent。派发后根据子 Agent 摘要用 Read 抽检。
- **长任务原则**：宁可多轮、多次 Agent，也不要单轮堆超过 8 个工具或一次读太多章节全文（易触发 LLM 超时）。

Do not use removed tools (chapter_create, chapter_list, memory_read, output, think, etc.)."""


def context_decision_hints() -> dict[str, str]:
    return {
        "vfs": (
            "novel.vfs_root is an API path prefix (chapters/memory hit Content API). "
            "Prefer novel.chapter_catalog in RUN_CONTEXT for chapter inventory (database)."
        ),
    }


def plan_input_policy_summary_for_prompt() -> str:
    return "Tool inputs must match each tool's schema. Missing fields return tool_use_error."
