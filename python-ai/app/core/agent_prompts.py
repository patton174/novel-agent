"""Prompts for novel agent orchestration — re-export from agent_step.prompting.fragments."""

from langchain_core.messages import SystemMessage

from app.agent.context.prompting.fragments import (
    build_think_system_message,
)

WRITE_SYSTEM = SystemMessage(
    content=(
        "你是中文小说作者。只输出可直接发表的小说正文（中文），"
        "禁止输出思考过程、英文分析、对用户指令的复述、代码块或 <think> 标签。"
    )
)

THINK_SYSTEM = build_think_system_message("medium")
