"""Bulk-update deploy/docs paths after agent-document migration."""

from __future__ import annotations

import pathlib
import re

REPO = pathlib.Path(__file__).resolve().parents[5]  # repo root

REPLACEMENTS = [
    ("novel-agent/docs/", "novel-agent/agent-document/docs/"),
    ('$(cd "$SCRIPT_DIR/../../../.." && pwd)', '$(cd "$SCRIPT_DIR/../../../../../.." && pwd)'),
]

EXTS = {".sh", ".yml", ".yaml", ".md", ".mdc", ".cmd", ".bat", ".ps1", ".json"}


def should_scan(path: pathlib.Path) -> bool:
    if path.suffix.lower() not in EXTS:
        return False
    parts = set(path.parts)
    if "node_modules" in parts or ".git" in parts:
        return False
    return True


def main() -> None:
    changed = 0
    for path in REPO.rglob("*"):
        if not path.is_file() or not should_scan(path):
            continue
        if "_migrate_paths.py" in str(path):
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        original = text
        for old, new in REPLACEMENTS:
            text = text.replace(old, new)
        if text != original:
            path.write_text(text, encoding="utf-8")
            changed += 1
            print(path.relative_to(REPO))
    print(f"done: {changed}")


if __name__ == "__main__":
    main()
