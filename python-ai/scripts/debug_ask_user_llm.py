"""One-off debug: print raw ask_user LLM output."""

from __future__ import annotations

import asyncio
import json
import logging

from langchain_core.messages import HumanMessage, SystemMessage

from app.agent.schemas import AgentRunContext
from app.agent.strategies.ask_user import AskUserToolStrategy, _normalize_question
from app.core.agent_prompts import build_ask_user_prompt
from app.core.llm import llm_provider
from app.agent.harness.llm_parse import _message_content, extract_json_array

logging.basicConfig(level=logging.INFO)

BACKGROUND = """## 世界观构建分析

### 核心定位
作品属于「杀怪必掉宝」游戏化世界观，核心悬念不在「会不会掉」，而在「掉什么」。

### 待确认事项
- 这个世界是低武/高武/修仙哪种力量层级？
- 主角是魂穿/本土/系统觉醒哪种身份来历？
"""


async def main() -> None:
    topic = "《开局无限掉宝》世界观构建"
    prompt = build_ask_user_prompt("world", topic, BACKGROUND)
    print("=== PROMPT tail ===")
    print(prompt[-1200:])
    print("=== LLM configured:", llm_provider.is_configured)
    if not llm_provider.is_configured:
        return

    llm = llm_provider.get_llm()
    raw = await llm.ainvoke(
        [
            SystemMessage(content="只输出 JSON 数组，不要代码块。"),
            HumanMessage(content=prompt),
        ]
    )
    text = (_message_content(getattr(raw, "content", raw)) or "").strip()
    print("=== RAW LLM OUTPUT ===")
    print(text)

    try:
        data = extract_json_array(text)
    except ValueError:
        print("=== PARSE FAILED — extract_json_array found nothing ===")
        return

    print("=== PARSED QUESTIONS ===")
    for i, q in enumerate(data):
        if not isinstance(q, dict):
            print(f"Q{i+1}: not a dict: {q!r}")
            continue
        opts = q.get("options")
        opt_count = len(opts) if isinstance(opts, list) else 0
        print(
            f"Q{i+1}: id={q.get('id')!r} type={q.get('type')!r} "
            f"prompt={str(q.get('prompt', ''))[:60]!r} options={opt_count}"
        )
        if isinstance(opts, list):
            for j, o in enumerate(opts[:3]):
                print(f"  opt{j+1}: {o}")

    print("=== AFTER _normalize_question ===")
    for q in data:
        if isinstance(q, dict):
            norm = _normalize_question(q, topic=topic, mode="world")
            if norm:
                titles = [o.get("title") for o in (norm.get("options") or [])]
                print(f"  {norm.get('prompt','')[:40]} -> {titles}")


if __name__ == "__main__":
    asyncio.run(main())
