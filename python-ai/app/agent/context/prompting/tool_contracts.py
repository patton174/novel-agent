"""Per-tool static system contract lines (Tool layer)."""

from __future__ import annotations

from app.core.llm_stream_policy import llm_policy_for_tool

# Step 元数据提交（流式后的第二次调用）
STEP_SUBMIT_SYSTEM = (
    "仅通过 StepResult 工具提交步骤元数据。"
    "display.type 必须为 none（用户可见正文已由流式通道输出）。"
    "context_patch、next_input 无内容时填 {}。"
    "本步不得指定 next_tool（留空）；禁止 action=wait。"
)

STEP_JSON_RULES = (
    "通过绑定的 StepResult 工具提交结果（schema 约束，勿手写 JSON/Markdown）。"
    "禁止 <think> 包裹工具参数。"
    "字段：version, step_kind, action(continue|wait|end), wait_for, next_tool, "
    "next_input, context_patch, display, reason。"
    "next_input 与 context_patch 为必填对象，无内容时填 {}。"
    "路由约定：本步 LLM 不得指定下一步工具（下一步由主循环 bind_tools 决定）。"
    "仅当本轮应结束时：action=end，next_tool=end，next_input={}。"
    "需要用户点选/输入时：action=wait，wait_for=interaction，勿填 next_tool。"
    "其余情况：action=continue，next_tool 留空，next_input={}。"
    "display.type 为 think|message|tool|none；think 时 content 为 Markdown 分析，禁止小说正文。"
)


def step_json_rules() -> str:
    return STEP_JSON_RULES


def concise_hint(tool_name: str) -> str:
    return llm_policy_for_tool(tool_name).concise_system_hint


def output_stream_system_lines() -> list[str]:
    lines = [
        "你是小说创作助手，向用户输出简体中文 Markdown（说明、进度或总结，不是小说章节）。",
        "只输出正文，不要 JSON、不要代码块包裹、不要复述系统指令。",
        "按 Human 的 task 与【回复倾向】自主把握篇幅：进度宜短，收尾可稍详。",
        "禁止完整章节正文（用 chapter_create / chapter_update）。",
        "勿在文末追加新的确认题（用 ask_user）。",
    ]
    hint = concise_hint("output")
    if hint:
        lines.append(hint)
    return lines


def chapter_stream_system_lines() -> list[str]:
    lines = [
        "你是小说章节写作助手，输出简体中文章节正文。",
        "根据 Human 中的上下文与用户/任务意图自行决定写什么；Plan 不会提供章名或剧情提纲。",
        "只输出正文，不要 JSON、不要 Markdown 代码块、不要章节标题行、不要复述系统指令。",
        "禁止 Markdown 语法：不要用 # 标题、**粗体**、- 列表、反引号代码；只写纯中文小说段落。",
        "禁止输出 tool_call / <invoke> /「正在调用 chapter_*」等执行语句；"
        "需要 list/read/delete 由主循环另开一轮，本步只写小说正文。",
        "每个自然段首行缩进两个全角空格（　　），段间空一行；这是硬性排版要求。",
    ]
    hint = concise_hint("chapter_create")
    if hint:
        lines.append(hint)
    return lines


def choose_structured_system_lines() -> list[str]:
    lines = [
        step_json_rules(),
        "你是小说创作顾问。根据用户主题生成彼此明显不同的中文创作方向。",
        "禁止套用固定模板（如「开篇入局/冲突推进/悬疑伏笔」、游戏副本/公会等无关话术）。",
        "每个选项的 title 与 description 必须紧扣用户主题与任务意图。",
        "",
        "display.type=tool，display.tool=choose。",
        "display.choices 为 3–4 项，每项含 id/title/description。",
        "display.interaction 必填，类型优先 multi_select（min_select=1，max_select=3）；",
        "action=wait，wait_for=interaction；勿填 next_tool。",
    ]
    hint = concise_hint("choose")
    if hint:
        lines.append(hint)
    return lines


def ask_user_questions_system_lines() -> list[str]:
    lines = [
        "通过 AskUserQuestionsOutput 工具提交 questions（1–4 题，简体中文）。",
        "禁止输出 JSON 数组或 Markdown 代码块；single_select/multi_select 每题至少 2 个 options。",
    ]
    hint = concise_hint("ask_user")
    if hint:
        lines.append(hint)
    return lines


def ask_user_structured_system_lines() -> list[str]:
    lines = [
        step_json_rules(),
        "你是小说创作顾问。列出 1–4 个需用户回答的问题。",
        "display.type=tool，display.tool=ask_user。",
        "display.interaction 含 type=ask_user、prompt（总说明）、questions 数组。",
        "action=wait，wait_for=interaction。",
    ]
    hint = concise_hint("ask_user")
    if hint:
        lines.append(hint)
    return lines
