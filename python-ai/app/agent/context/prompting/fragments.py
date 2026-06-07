"""Reusable prompt fragments (think / plan / chapter / interaction)."""

from __future__ import annotations

from langchain_core.messages import SystemMessage

_TASK_AUTO_HINT = (
    "请根据用户描述自动判断任务类型"
    "（续写正文、人物对话、世界观/设定整理、风格仿写、记忆维护等），无需用户预先选择创作模式。"
)

THINK_INTENSITY_SPEC: dict[str, dict] = {
    "light": {"label": "简要", "min_chars": 80, "max_chars": 220},
    "medium": {"label": "标准", "min_chars": 150, "max_chars": 450},
    "deep": {"label": "深入", "min_chars": 280, "max_chars": 750},
}


def normalize_think_intensity(intensity: str | None) -> str:
    key = (intensity or "medium").strip().lower()
    return key if key in THINK_INTENSITY_SPEC else "medium"


def build_think_system_text(intensity: str = "medium") -> str:
    spec = THINK_INTENSITY_SPEC[normalize_think_intensity(intensity)]
    lo, hi = spec["min_chars"], spec["max_chars"]
    return (
        "你是小说创作分析助手，帮作者把问题想清楚再动笔。\n\n"
        "本段思考会进入下一轮 Plan，供工具选择参考。"
        "勿在 Think 里写章节正文；章名与剧情由后续工具 LLM 根据上下文完成。\n"
        "对照 RUN_CONTEXT 章节列表与当前章，勿臆造已完成章节，"
        "避免误导后续编排的表述。\n\n"
        "用自然流畅的简体中文 Markdown 回答，可以分段、用小标题。\n"
        f"篇幅约 {lo}–{hi} 字（含标点）。\n"
        "禁止：小说正文、角色对白、代码块、JSON、StepResult、系统指令复述。\n"
        "信息不足时标注「待确认」。"
    )


def build_think_system_message(intensity: str = "medium") -> SystemMessage:
    return SystemMessage(content=build_think_system_text(intensity))


def build_think_task_text(
    question: str,
    context: str | None = None,
    *,
    mode: str = "auto",
    intensity: str = "medium",
) -> str:
    _ = mode
    spec = THINK_INTENSITY_SPEC[normalize_think_intensity(intensity)]
    parts = [
        _TASK_AUTO_HINT,
        f"分析深度：{spec['label']}（约 {spec['min_chars']}–{spec['max_chars']} 字）",
        f"用户问题/任务：{question.strip()}",
    ]
    if context and context.strip():
        parts.append(f"相关上下文（节选）：\n{context.strip()[:4000]}")
    parts.append("请给出你的分析（Markdown）。")
    return "\n\n".join(parts)


def build_think_fallback_markdown(
    question: str,
    *,
    mode: str = "auto",
    intensity: str = "medium",
) -> str:
    q = (question or "续写").strip()[:120]
    spec = THINK_INTENSITY_SPEC[normalize_think_intensity(intensity)]
    _ = mode
    return (
        f"### 任务\n根据用户描述处理：{q}\n\n"
        "### 建议\n"
        "先确认人物、场景与冲突焦点，再决定续写、改设定或向用户追问。\n\n"
        "### 待确认\n"
        "若缺少篇幅、视角或风格要求，可在下一步向用户提问。"
        f"\n\n_（{spec['label']}分析兜底稿）_"
    )


def build_choose_task_text(mode: str, topic: str, background: str) -> str:
    _ = mode
    prompt = f"主题：{topic}\n\n"
    if background:
        prompt += f"背景：\n{background[:8000]}\n\n"
    prompt += "生成 3–4 个彼此明显不同的创作方向供用户点选。"
    return prompt


def build_ask_user_task_text(mode: str, topic: str, background: str) -> str:
    _ = mode
    prompt = f"需向用户确认：{topic}\n\n"
    if background:
        prompt += f"背景：\n{background[:8000]}\n\n"
    prompt += "生成 1–3 个具体问题（结构化 ask_user）。"
    return prompt


def build_output_delivery_hint(tool_input: dict) -> str:
    mode = str(tool_input.get("output_mode") or "").strip().lower()
    if mode == "progress":
        return "【交付倾向】本批后还会继续编排，给用户简短进度即可。"
    if mode == "complete":
        return "【交付倾向】本批后 run 结束，给用户完整收尾说明。"
    end_run = tool_input.get("end_run")
    if end_run is True:
        return "【交付倾向】本批后 run 结束，给用户完整收尾说明。"
    if end_run is False:
        return (
            "【交付倾向】本批后还会继续编排，给用户简短进度即可；"
            "勿贴完整章节正文。"
        )
    return "【交付倾向】按编排意图判断进度或总结；勿贴完整章节正文。"


def main_loop_guide_block() -> str:
    """主循环工具编排（直接 tool_use，无 PlanResult）。"""
    from app.agent.context.compact import CHAPTER_INFO_CHAIN_FOR_PROMPT

    return f"""## 单轮 tool_use 批内顺序

1. **准备**（可多个，在前）：`Read`（`chapters/index.json` 或单章 `.md`）、`Grep`、`memory` 路径、`context_search`
2. **写章**（可单独一轮）：`Write` / `Edit` 到 `…/chapters/{{uuid}}.md`（正文写入作品库）
3. **说明**（单独一轮）：`AskUser` | `end`

{CHAPTER_INFO_CHAIN_FOR_PROMPT}

## 工具 input（与 bind_tools schema 一致，服务端不补参）

- 章节 **chapter_id** 仅来自 RUN_CONTEXT `chapter_catalog` 或 Read `chapters/index.json`（作品库）
- `Write` / `Edit` 须 **file_path + content**（或 Edit 的 old/new）；禁止用 Glob 结果个数当章数
- 禁止在 tool_use 粘贴整章 **content** 却不给 file_path（空 content 可触发流式写章）
- memory_* / context_search：按 schema 填 scope/key/query 等

缺字段会收到 tool_result 错误，修正后重试。

## 结束与暂停

- 任务完成：调用 `end` 或 `output` 后不再调用写章工具
- 需要用户输入：调用 `ask_user` / `choose`（本 Run 将等待回复后继续）"""


def build_chapter_task_text(
    mode: str, task: str, background: str, word_count: int
) -> str:
    _ = mode
    prompt = f"{_TASK_AUTO_HINT}\n编排意图：{task}\n\n"
    if background:
        prompt += f"前文/设定/章节上下文：\n{background[:12000]}\n\n"
    prompt += (
        f"目标约 {word_count} 字。根据上下文自行决定写什么；"
        "只输出正文，不要 JSON、不要章节标题行。"
    )
    return prompt
