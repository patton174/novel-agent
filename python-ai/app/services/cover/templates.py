"""从 prompts/ 目录加载 LLM 系统提示词（文件级解耦，不进 DB）。"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

_PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"


@lru_cache(maxsize=32)
def load_prompt(name: str) -> str:
    path = _PROMPTS_DIR / f"{name}.md"
    if not path.is_file():
        raise FileNotFoundError(f"cover prompt template missing: {path}")
    return path.read_text(encoding="utf-8").strip()


def render_prompt(name: str, **placeholders: str) -> str:
    text = load_prompt(name)
    for key, value in placeholders.items():
        text = text.replace(f"{{{{{key}}}}}", value)
    return text


def role_text() -> str:
    return load_prompt("role")


def structured_system_prompt() -> str:
    return render_prompt("structured_system", role=role_text())


def stream_system_prompt() -> str:
    return render_prompt("stream_system", role=role_text())
