"""Parse SKILL.md frontmatter and resolve bundled skill paths."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n?(.*)$", re.DOTALL)
_LIST_ITEM_RE = re.compile(r"^\s*-\s+(.+)$")
_INLINE_LIST_RE = re.compile(r"^\[(.*)\]$")


def _bundled_root() -> Path:
    return Path(__file__).resolve().parents[3] / "skills" / "bundled"


@dataclass(frozen=True)
class ParsedSkill:
    name: str
    version: str
    description: str
    tools: list[str]
    body: str
    locale: str = "zh"


def _parse_scalar(value: str) -> str:
    text = (value or "").strip()
    if (text.startswith('"') and text.endswith('"')) or (
        text.startswith("'") and text.endswith("'")
    ):
        return text[1:-1].strip()
    return text


def _parse_tools_value(raw: str) -> list[str]:
    text = (raw or "").strip()
    if not text:
        return []
    inline = _INLINE_LIST_RE.match(text)
    if inline:
        inner = inline.group(1)
        return [part.strip().strip("'\"") for part in inner.split(",") if part.strip()]
    if text.startswith("["):
        return []
    return [text.strip().strip("'\"")]


def _parse_frontmatter_block(block: str) -> dict[str, str | list[str]]:
    meta: dict[str, str | list[str]] = {}
    current_key: str | None = None
    for line in (block or "").splitlines():
        if not line.strip():
            continue
        list_match = _LIST_ITEM_RE.match(line)
        if list_match and current_key == "tools":
            items = meta.setdefault("tools", [])
            if isinstance(items, list):
                items.append(list_match.group(1).strip().strip("'\""))
            continue
        if ":" not in line:
            continue
        key, val = line.split(":", 1)
        key = key.strip().lower()
        val = val.strip()
        current_key = key
        if key == "tools" and not val:
            meta[key] = []
            continue
        if key == "tools":
            meta[key] = _parse_tools_value(val)
            continue
        meta[key] = _parse_scalar(val)
    return meta


def parse_skill_markdown(text: str) -> ParsedSkill:
    """Parse SKILL.md with optional YAML frontmatter."""
    raw = (text or "").strip()
    meta: dict[str, str | list[str]] = {}
    body = raw
    match = _FRONTMATTER_RE.match(raw + ("\n" if raw and not raw.endswith("\n") else ""))
    if match:
        meta = _parse_frontmatter_block(match.group(1))
        body = match.group(2).strip()
    elif raw.startswith("---"):
        parts = raw.split("---", 2)
        if len(parts) >= 3:
            meta = _parse_frontmatter_block(parts[1])
            body = parts[2].strip()

    tools_raw = meta.get("tools")
    tools: list[str] = []
    if isinstance(tools_raw, list):
        tools = [str(item).strip() for item in tools_raw if str(item).strip()]
    elif isinstance(tools_raw, str) and tools_raw.strip():
        tools = _parse_tools_value(tools_raw)

    name = str(meta.get("name") or "unknown").strip() or "unknown"
    version = str(meta.get("version") or "1").strip() or "1"
    description = str(meta.get("description") or "").strip()
    locale = str(meta.get("locale") or "zh").strip() or "zh"
    return ParsedSkill(
        name=name,
        version=version,
        description=description,
        tools=tools,
        body=body,
        locale=locale,
    )


def load_bundled(name: str) -> Path | None:
    """Resolve ``python-ai/skills/bundled/{name}/SKILL.md`` or ``{name}.md``."""
    slug = (name or "").strip().replace("/", "").replace("\\", "")
    if not slug:
        return None
    root = _bundled_root()
    candidates = [root / slug / "SKILL.md", root / f"{slug}.md"]
    for path in candidates:
        if path.is_file():
            return path
    return None


def read_bundled_skill(name: str) -> ParsedSkill | None:
    path = load_bundled(name)
    if path is None:
        return None
    return parse_skill_markdown(path.read_text(encoding="utf-8"))
