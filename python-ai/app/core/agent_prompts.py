"""Prompts for novel agent orchestration — re-export from agent_step.prompting.fragments."""

from langchain_core.messages import SystemMessage

from app.agent.context.prompting.fragments import (
    THINK_INTENSITY_SPEC,
    build_ask_user_task_text as build_ask_user_prompt,
    build_chapter_task_text as build_chapter_task_prompt,
    build_choose_task_text as build_choose_prompt,
    build_think_fallback_markdown,
    build_think_system_message,
    build_think_task_text as build_think_prompt,
)

WRITE_SYSTEM = SystemMessage(
    content=(
        "你是中文小说作者。只输出可直接发表的小说正文（中文），"
        "禁止输出思考过程、英文分析、对用户指令的复述、代码块或 <think> 标签。"
    )
)

THINK_SYSTEM = build_think_system_message("medium")
